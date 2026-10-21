import { describe, expect, it, vi } from 'vitest';
import { initialFinanceState } from '../data/mockFinance';
import type { FinanceState } from '../types/finance';
import { addAccount, addBill, addBudget, addRecurringTransaction, addSavingsActivity, addSavingsGoal, addTransaction, advanceRecurringDate, deleteBill, deleteBudget, deleteSavingsGoal, deleteTransactions, getAccountBalance, getAccountSummary, getBillStatus, getBudgetProgress, getCashFlowHistory, getDashboardSummary, getSavingsGoalProgress, payBill, recordRecurringTransaction, setAccountArchived, setRecurringActive, updateAccount, updateBill, updateBudget, updateSavingsGoal, updateTransaction } from './finance';
import { buildImportPreview, parseCsv, transactionsToCsv } from './csv';
import { parseMoneyToMinor } from './money';
import { getCalendarEvents, getMonthGrid, shiftMonth } from './calendar';
import { upcomingBills } from '../data/mockFinance';
import { getReportAnalytics, getReportRange, reportToCsv } from './reports';
import { createFinoraBackup, parseFinoraBackup } from './settings';
import { defaultPreferences } from '../types/preferences';
import { emptyFinanceState } from '../services/storage';
import { getTodayKey } from './date';
import { getAppNotifications } from '../components/notifications/NotificationPanel';

describe('money parsing', () => {
  it('stores rupees safely as integer paise', () => {
    expect(parseMoneyToMinor('₹2,840.50')).toBe(284_050);
    expect(parseMoneyToMinor('0')).toBeNull();
    expect(parseMoneyToMinor('1.234')).toBeNull();
  });
});

describe('IST date handling', () => {
  it('uses the India date when UTC is still on the previous day', () => {
    expect(getTodayKey(new Date('2026-10-19T19:00:00.000Z'))).toBe('2026-10-20');
  });
});

describe('settings backup', () => {
  it('round-trips finance data, preferences and theme', () => {
    const backup = createFinoraBackup(initialFinanceState, defaultPreferences, 'dark', '2026-10-20T10:00:00.000Z');
    const restored = parseFinoraBackup(JSON.stringify(backup));
    expect(restored.theme).toBe('dark');
    expect(restored.preferences.displayName).toBe('Gagan Chugh');
    expect(restored.finance.transactions).toHaveLength(initialFinanceState.transactions.length);
    expect(restored.finance.recurringTransactions).toEqual([]);
  });

  it('migrates older backups without recurring schedules to an empty list', () => {
    const backup = createFinoraBackup(initialFinanceState, defaultPreferences, 'light');
    const legacy = { ...backup, finance: { ...backup.finance } } as Record<string, any>;
    delete legacy.finance.recurringTransactions;
    expect(parseFinoraBackup(JSON.stringify(legacy)).finance.recurringTransactions).toEqual([]);
  });

  it('rejects malformed and incomplete backup files', () => {
    expect(() => parseFinoraBackup('not json')).toThrow('valid Finora JSON');
    expect(() => parseFinoraBackup(JSON.stringify({ format: 'finora-backup', version: 1, theme: 'light' }))).toThrow('incomplete or damaged');
  });
});

describe('transaction management', () => {
  it('updates and deletes transactions without changing their stable identity', () => {
    const transaction = initialFinanceState.transactions[0];
    const updated = updateTransaction(initialFinanceState, transaction.id, {
      type: 'expense', amountMinor: 999_00, occurredOn: transaction.occurredOn,
      accountId: transaction.accountId, payee: 'Updated payee', category: 'Other',
    });
    expect(updated.transactions[0].id).toBe(transaction.id);
    expect(updated.transactions[0].amountMinor).toBe(999_00);
    expect(deleteTransactions(updated, [transaction.id]).transactions).toHaveLength(initialFinanceState.transactions.length - 1);
  });
});

describe('recurring transactions', () => {
  it('advances weekly, monthly and yearly dates without overflowing short months', () => {
    expect(advanceRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceRecurringDate('2026-12-28', 'weekly')).toBe('2027-01-04');
    expect(advanceRecurringDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });

  it('records a due occurrence once and advances its schedule', () => {
    const added = addRecurringTransaction(initialFinanceState, { type: 'expense', amountMinor: 1_500_00, accountId: 'hdfc', payee: 'Monthly test', category: 'Utilities', frequency: 'monthly', nextDueOn: '2026-10-20', active: true });
    const schedule = added.recurringTransactions.at(-1)!;
    const recorded = recordRecurringTransaction(added, schedule.id);
    expect(recorded.transactions[0]).toMatchObject({ payee: 'Monthly test', occurredOn: '2026-10-20', amountMinor: 1_500_00 });
    expect(recorded.recurringTransactions.at(-1)).toMatchObject({ lastRecordedOn: '2026-10-20', nextDueOn: '2026-11-20' });
  });

  it('does not record a paused schedule', () => {
    const added = addRecurringTransaction(initialFinanceState, { type: 'income', amountMinor: 20_000_00, accountId: 'icici', payee: 'Retainer', category: 'Side income', frequency: 'monthly', nextDueOn: '2026-10-20', active: true });
    const schedule = added.recurringTransactions.at(-1)!;
    const paused = setRecurringActive(added, schedule.id, false);
    expect(() => recordRecurringTransaction(paused, schedule.id)).toThrow('Resume');
  });
});

describe('account management', () => {
  it('reconciles opening balance and net movement', () => {
    const account = initialFinanceState.accounts[0];
    const summary = getAccountSummary(account, initialFinanceState.transactions);
    expect(summary.currentBalanceMinor).toBe(getAccountBalance(account, initialFinanceState.transactions));
    expect(summary.currentBalanceMinor).toBe(account.openingBalanceMinor + summary.moneyInMinor - summary.moneyOutMinor);
  });

  it('adds, edits and archives an account while preserving its identity', () => {
    const added = addAccount(initialFinanceState, { name: 'UPI Wallet', institution: 'Daily UPI', kind: 'wallet', openingBalanceMinor: 0, accent: 'blue' });
    const created = added.accounts.at(-1)!;
    expect(created.id).toBe('upi-wallet');
    const edited = updateAccount(added, created.id, { name: 'UPI Wallet', institution: 'Updated', kind: 'wallet', openingBalanceMinor: 500_00, accent: 'amber' });
    expect(edited.accounts.at(-1)?.id).toBe(created.id);
    expect(setAccountArchived(edited, created.id, true).accounts.at(-1)?.archived).toBe(true);
  });

  it('does not allow archiving the final active account', () => {
    const oneAccount = { ...initialFinanceState, accounts: [initialFinanceState.accounts[0]] };
    expect(() => setAccountArchived(oneAccount, oneAccount.accounts[0].id, true)).toThrow('Keep at least one active account.');
  });
});

describe('budget management', () => {
  it('matches only expenses in the selected category and date range', () => {
    const dining = initialFinanceState.budgets.find((budget) => budget.category === 'Dining')!;
    const progress = getBudgetProgress(dining, initialFinanceState.transactions);
    expect(progress.spentMinor).toBe(586_000);
    expect(progress.remainingMinor).toBe(-86_000);
    expect(progress.status).toBe('Over budget');
  });

  it('adds, updates and deletes a non-overlapping custom budget', () => {
    const added = addBudget(initialFinanceState, { name: 'November groceries', category: 'Groceries', limitMinor: 1_200_000, period: 'custom', startOn: '2026-11-01', endOn: '2026-11-30' });
    const created = added.budgets.at(-1)!;
    const updated = updateBudget(added, created.id, { ...created, name: 'November food', limitMinor: 1_300_000 });
    expect(updated.budgets.at(-1)?.id).toBe(created.id);
    expect(updated.budgets.at(-1)?.limitMinor).toBe(1_300_000);
    expect(deleteBudget(updated, created.id).budgets).toHaveLength(initialFinanceState.budgets.length);
  });

  it('prevents overlapping budgets for the same category', () => {
    expect(() => addBudget(initialFinanceState, { name: 'Duplicate dining', category: 'Dining', limitMinor: 600_000, period: 'custom', startOn: '2026-10-15', endOn: '2026-11-15' })).toThrow('already has a budget');
  });

  it('rejects impossible budget dates', () => {
    expect(() => addBudget(initialFinanceState, { name: 'Invalid dates', category: 'Health', limitMinor: 600_000, period: 'custom', startOn: '2026-02-30', endOn: '2026-03-05' })).toThrow('valid budget period');
  });
});

describe('savings goals', () => {
  it('calculates progress, remaining amount and monthly guidance', () => {
    const goal = initialFinanceState.savingsGoals[0];
    const progress = getSavingsGoalProgress(goal, '2026-10-19');
    expect(progress.percent).toBeCloseTo(53.333, 2);
    expect(progress.remainingMinor).toBe(28_000_000);
    expect(progress.suggestedMonthlyMinor).toBeGreaterThan(0);
  });

  it('adds, edits and deletes a goal with its activity history', () => {
    const added = addSavingsGoal(initialFinanceState, { name: 'New laptop', targetMinor: 20_000_000, initialSavedMinor: 2_000_000, targetDate: '2027-06-30', createdOn: '2026-10-19', accent: 'blue' });
    const goal = added.savingsGoals.at(-1)!;
    const edited = updateSavingsGoal(added, goal.id, { name: 'Work laptop', targetMinor: 22_000_000, targetDate: '2027-06-30', createdOn: goal.createdOn, accent: 'slate' });
    expect(edited.savingsGoals.at(-1)?.savedMinor).toBe(2_000_000);
    const withActivity = addSavingsActivity(edited, { goalId: goal.id, type: 'deposit', amountMinor: 100_000, occurredOn: '2026-10-19' });
    const deleted = deleteSavingsGoal(withActivity, goal.id);
    expect(deleted.savingsGoals.some((item) => item.id === goal.id)).toBe(false);
    expect(deleted.savingsActivities.some((item) => item.goalId === goal.id)).toBe(false);
  });

  it('records deposits and safe withdrawals without changing accounts or transactions', () => {
    const goal = initialFinanceState.savingsGoals[0];
    const deposited = addSavingsActivity(initialFinanceState, { goalId: goal.id, type: 'deposit', amountMinor: 100_000, occurredOn: '2026-10-19' });
    expect(deposited.savingsGoals[0].savedMinor).toBe(goal.savedMinor + 100_000);
    expect(deposited.accounts).toEqual(initialFinanceState.accounts);
    expect(deposited.transactions).toEqual(initialFinanceState.transactions);
    expect(() => addSavingsActivity(initialFinanceState, { goalId: goal.id, type: 'withdrawal', amountMinor: goal.savedMinor + 1, occurredOn: '2026-10-19' })).toThrow('cannot exceed');
  });
});

describe('CSV import and export', () => {
  it('parses quoted commas and previews valid rows', () => {
    const csv = 'Type,Date,Amount,Account,To Account,Payee,Category,Note\nexpense,2026-10-18,250.50,HDFC Bank,,"Cafe, Delhi",Dining,Lunch';
    expect(parseCsv(csv)[1][5]).toBe('Cafe, Delhi');
    const preview = buildImportPreview(csv, initialFinanceState);
    expect(preview[0].errors).toEqual([]);
    expect(preview[0].input?.amountMinor).toBe(25_050);
  });

  it('reports invalid rows and protects exported spreadsheet cells', () => {
    const preview = buildImportPreview('Type,Date,Amount,Account,To Account,Payee,Category\nexpense,2026-02-31,0,Missing,,Shop,Other', initialFinanceState);
    expect(preview[0].errors.length).toBeGreaterThan(0);
    const unsafe = { ...initialFinanceState.transactions[0], payee: '=HYPERLINK("bad")' };
    expect(transactionsToCsv([unsafe], initialFinanceState)).toContain("'=HYPERLINK");
  });
});

describe('financial totals', () => {
  it('provides a genuinely empty clean-start state', () => {
    expect(emptyFinanceState.accounts).toEqual([]);
    expect(emptyFinanceState.transactions).toEqual([]);
    expect(emptyFinanceState.budgets).toEqual([]);
    expect(emptyFinanceState.savingsGoals).toEqual([]);
    expect(emptyFinanceState.bills).toEqual([]);
    expect(emptyFinanceState.recurringTransactions).toEqual([]);
  });

  it('derives dashboard cash flow from saved transactions instead of sample chart data', () => {
    const history = getCashFlowHistory(initialFinanceState.transactions, '2026-10-20');
    expect(history).toHaveLength(6);
    expect(history.at(-1)).toEqual({ month: 'Oct', incomeMinor: 12_400_000, expenseMinor: 7_845_000 });
    expect(getCashFlowHistory([], '2026-10-20').every((point) => point.incomeMinor === 0 && point.expenseMinor === 0)).toBe(true);
  });

  it('keeps seeded totals internally consistent', () => {
    const summary = getDashboardSummary(initialFinanceState);
    expect(summary.totalBalanceMinor).toBe(48_265_000);
    expect(summary.incomeMinor).toBe(12_400_000);
    expect(summary.expenseMinor).toBe(7_845_000);
    expect(summary.surplusMinor).toBe(4_555_000);
  });

  it('does not count transfers as income or expenses', () => {
    const summaryBefore = getDashboardSummary(initialFinanceState);
    const transferred = addTransaction(initialFinanceState, {
      type: 'transfer',
      amountMinor: 100_000,
      occurredOn: '2026-10-18',
      accountId: 'hdfc',
      toAccountId: 'icici',
      payee: 'Test transfer',
      category: 'Transfer',
    });
    const summaryAfter = getDashboardSummary(transferred);

    expect(summaryAfter.incomeMinor).toBe(summaryBefore.incomeMinor);
    expect(summaryAfter.expenseMinor).toBe(summaryBefore.expenseMinor);
    expect(summaryAfter.totalBalanceMinor).toBe(summaryBefore.totalBalanceMinor);
  });

  it('reconciles transfer balances across accounts', () => {
    const transferred: FinanceState = addTransaction(initialFinanceState, {
      type: 'transfer',
      amountMinor: 100_000,
      occurredOn: '2026-10-18',
      accountId: 'hdfc',
      toAccountId: 'icici',
      payee: 'Test transfer',
      category: 'Transfer',
    });
    const hdfc = initialFinanceState.accounts.find((account) => account.id === 'hdfc')!;
    const icici = initialFinanceState.accounts.find((account) => account.id === 'icici')!;

    expect(getAccountBalance(hdfc, transferred.transactions)).toBe(
      getAccountBalance(hdfc, initialFinanceState.transactions) - 100_000,
    );
    expect(getAccountBalance(icici, transferred.transactions)).toBe(
      getAccountBalance(icici, initialFinanceState.transactions) + 100_000,
    );
  });
});

describe('actionable notifications', () => {
  it('combines due bills, recurring schedules and budget pressure', () => {
    const withSchedule = addRecurringTransaction(initialFinanceState, { type: 'expense', amountMinor: 999_00, accountId: 'hdfc', payee: 'Subscription', category: 'Utilities', frequency: 'monthly', nextDueOn: '2026-10-20', active: true });
    const notifications = getAppNotifications(withSchedule, '2026-10-20');
    expect(notifications.some((item) => item.destination === 'Bills')).toBe(true);
    expect(notifications.some((item) => item.destination === 'Recurring')).toBe(true);
    expect(notifications.some((item) => item.destination === 'Budgets')).toBe(true);
  });
});

describe('financial calendar', () => {
  it('builds a stable six-week Monday-first calendar grid', () => {
    const grid = getMonthGrid('2026-10');
    expect(grid).toHaveLength(42);
    expect(grid[0].date).toBe('2026-09-28');
    expect(grid.at(-1)?.date).toBe('2026-11-08');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('combines transactions, budget boundaries, savings targets and bills', () => {
    const events = getCalendarEvents(initialFinanceState, upcomingBills);
    expect(events.filter((event) => event.type === 'income')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'budget')).toHaveLength(initialFinanceState.budgets.length * 2);
    expect(events.filter((event) => event.type === 'savings')).toHaveLength(initialFinanceState.savingsGoals.length);
    expect(events.filter((event) => event.type === 'bill')).toHaveLength(upcomingBills.length);
    expect(events.find((event) => event.id === 'bill-bill-electricity')?.date).toBe('2026-10-21');
  });
});

describe('bills and reminders', () => {
  it('derives paid, overdue, due-soon and upcoming statuses', () => {
    const electricity = initialFinanceState.bills[0];
    expect(getBillStatus(electricity, '2026-10-19')).toBe('due-soon');
    expect(getBillStatus(electricity, '2026-10-22')).toBe('overdue');
    expect(getBillStatus({ ...electricity, paidOn: '2026-10-20' }, '2026-10-22')).toBe('paid');
  });

  it('adds and edits an unpaid bill while keeping a stable identity', () => {
    const input = { name: 'Mobile plan', amountMinor: 799_00, dueOn: '2026-11-02', accountId: 'hdfc', category: 'Utilities', reminderDays: 3 };
    const added = addBill(initialFinanceState, input);
    const created = added.bills.at(-1)!;
    const updated = updateBill(added, created.id, { ...input, name: 'Family mobile plan', amountMinor: 999_00 });
    expect(updated.bills.at(-1)?.id).toBe(created.id);
    expect(updated.bills.at(-1)?.amountMinor).toBe(999_00);
  });

  it('records a bill payment exactly once as an expense transaction', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T12:00:00+05:30'));
    const bill = initialFinanceState.bills[0];
    expect(() => payBill(initialFinanceState, bill.id, '2026-10-21')).toThrow('future');
    const paid = payBill(initialFinanceState, bill.id, '2026-10-20');
    const recorded = paid.bills.find((item) => item.id === bill.id)!;
    expect(recorded.paidOn).toBe('2026-10-20');
    expect(paid.transactions[0]).toMatchObject({ type: 'expense', amountMinor: bill.amountMinor, accountId: bill.accountId, payee: bill.name });
    expect(recorded.paidTransactionId).toBe(paid.transactions[0].id);
    expect(() => payBill(paid, bill.id, '2026-10-20')).toThrow('already been paid');
    vi.useRealTimers();
  });

  it('deletes only the reminder and preserves its recorded payment', () => {
    const bill = initialFinanceState.bills[0];
    const paid = payBill(initialFinanceState, bill.id, '2026-10-20');
    const transactionId = paid.bills.find((item) => item.id === bill.id)?.paidTransactionId;
    const deleted = deleteBill(paid, bill.id);
    expect(deleted.bills.some((item) => item.id === bill.id)).toBe(false);
    expect(deleted.transactions.some((item) => item.id === transactionId)).toBe(true);
  });
});

describe('reports and analytics', () => {
  it('builds period ranges and excludes transfers from financial performance', () => {
    const range = getReportRange('quarter', '2026-10-20', initialFinanceState.transactions);
    expect(range.startOn).toBe('2026-08-01');
    expect(range.endOn).toBe('2026-10-20');
    const report = getReportAnalytics(initialFinanceState, 'month', '2026-10-20');
    expect(report.incomeMinor).toBe(12_400_000);
    expect(report.expenseMinor).toBe(7_845_000);
    expect(report.netMinor).toBe(4_555_000);
    expect(report.transferMinor).toBe(2_500_000);
  });

  it('ranks expense categories and produces valid weekly month-to-date buckets', () => {
    const report = getReportAnalytics(initialFinanceState, 'month', '2026-10-20');
    expect(report.categories[0]).toMatchObject({ name: 'Housing', amountMinor: 1_900_000 });
    expect(report.trend).toHaveLength(3);
    expect(report.trend.at(-1)?.label).toBe('15–20');
    expect(report.highestSpendDay?.date).toBe('2026-10-09');
  });

  it('exports report sections and rupee amounts as spreadsheet-safe CSV', () => {
    const report = getReportAnalytics(initialFinanceState, 'month', '2026-10-20');
    const csv = reportToCsv(report);
    expect(csv).toContain('Finora financial report');
    expect(csv).toContain('Expense category');
    expect(csv).toContain('124000.00');
  });
});
