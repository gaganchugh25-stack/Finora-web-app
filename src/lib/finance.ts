import type {
  Account,
  AccountInput,
  Budget,
  BudgetInput,
  BillInput,
  BillReminder,
  CashFlowPoint,
  FinanceState,
  MoneyMinor,
  NewTransactionInput,
  RecurringFrequency,
  RecurringTransaction,
  RecurringTransactionInput,
  SavingsActivity,
  SavingsActivityInput,
  SavingsGoal,
  SavingsGoalInput,
  Transaction,
} from '../types/finance';

export type BudgetTone = 'positive' | 'warning' | 'danger';

export interface BudgetProgress {
  spentMinor: MoneyMinor;
  remainingMinor: MoneyMinor;
  usedPercent: number;
  tone: BudgetTone;
  status: 'On track' | 'Near limit' | 'Over budget';
}

export interface SavingsGoalProgress {
  remainingMinor: MoneyMinor;
  percent: number;
  daysRemaining: number;
  suggestedMonthlyMinor: MoneyMinor;
  status: 'Complete' | 'In progress' | 'Due soon' | 'Past target';
  tone: 'positive' | 'blue' | 'warning' | 'danger';
}

export interface DashboardSummary {
  totalBalanceMinor: MoneyMinor;
  incomeMinor: MoneyMinor;
  expenseMinor: MoneyMinor;
  surplusMinor: MoneyMinor;
  savingsRate: number;
}

export interface AccountSummary {
  currentBalanceMinor: MoneyMinor;
  moneyInMinor: MoneyMinor;
  moneyOutMinor: MoneyMinor;
  netMovementMinor: MoneyMinor;
  transactionCount: number;
}

export type BillStatus = 'paid' | 'overdue' | 'due-today' | 'due-soon' | 'upcoming';

export function getBillStatus(bill: BillReminder, todayKey: string): BillStatus {
  if (bill.paidOn) return 'paid';
  if (bill.dueOn < todayKey) return 'overdue';
  if (bill.dueOn === todayKey) return 'due-today';
  const difference = Math.ceil((new Date(`${bill.dueOn}T12:00:00+05:30`).getTime() - new Date(`${todayKey}T12:00:00+05:30`).getTime()) / 86_400_000);
  return difference <= 7 ? 'due-soon' : 'upcoming';
}

export function addBill(state: FinanceState, input: BillInput): FinanceState {
  validateBillInput(state, input);
  const idBase = input.name.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bill';
  let id = `bill-${idBase}`; let suffix = 2;
  while (state.bills.some((bill) => bill.id === id)) { id = `bill-${idBase}-${suffix}`; suffix += 1; }
  return { ...state, bills: [...state.bills, { ...input, id, name: input.name.trim(), category: input.category.trim(), note: input.note?.trim() }] };
}

export function updateBill(state: FinanceState, id: string, input: BillInput): FinanceState {
  const bill = state.bills.find((item) => item.id === id);
  if (!bill) throw new Error('The bill to update does not exist.');
  if (bill.paidOn) throw new Error('Paid bills cannot be edited because their payment transaction is already recorded.');
  validateBillInput(state, input);
  return { ...state, bills: state.bills.map((item) => item.id === id ? { ...item, ...input, name: input.name.trim(), category: input.category.trim(), note: input.note?.trim() } : item) };
}

export function deleteBill(state: FinanceState, id: string): FinanceState {
  return { ...state, bills: state.bills.filter((bill) => bill.id !== id) };
}

export function payBill(state: FinanceState, id: string, paidOn: string): FinanceState {
  const bill = state.bills.find((item) => item.id === id);
  if (!bill) throw new Error('The bill to pay does not exist.');
  if (bill.paidOn || bill.paidTransactionId) throw new Error('This bill has already been paid.');
  if (!isValidDateKey(paidOn)) throw new Error('Select a valid payment date.');
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (paidOn > todayKey) throw new Error('Payment date cannot be in the future.');
  const account = state.accounts.find((item) => item.id === bill.accountId);
  if (!account) throw new Error('The assigned payment account no longer exists.');
  if (account.archived) throw new Error('The assigned payment account is archived. Update the bill before paying it.');
  const transactionId = globalThis.crypto?.randomUUID?.() ?? `bill-payment-${Date.now()}`;
  const transaction: Transaction = { id: transactionId, type: 'expense', amountMinor: bill.amountMinor, occurredOn: paidOn, accountId: bill.accountId, payee: bill.name, category: bill.category, note: bill.note ? `Bill payment · ${bill.note}` : 'Bill payment', createdAt: new Date().toISOString() };
  return { ...state, transactions: [transaction, ...state.transactions], bills: state.bills.map((item) => item.id === id ? { ...item, paidOn, paidTransactionId: transactionId } : item) };
}

function validateBillInput(state: FinanceState, input: BillInput): void {
  if (!input.name.trim()) throw new Error('Enter a bill name.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Bill amount must be greater than zero.');
  if (!isValidDateKey(input.dueOn)) throw new Error('Select a valid due date.');
  if (!input.category.trim()) throw new Error('Enter a spending category.');
  if (!Number.isInteger(input.reminderDays) || input.reminderDays < 0 || input.reminderDays > 30) throw new Error('Reminder notice must be between 0 and 30 days.');
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!account || account.archived) throw new Error('Select an active payment account.');
}

export function getAccountBalance(account: Account, transactions: Transaction[]): MoneyMinor {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === 'income' && transaction.accountId === account.id) {
      return balance + transaction.amountMinor;
    }
    if (transaction.type === 'expense' && transaction.accountId === account.id) {
      return balance - transaction.amountMinor;
    }
    if (transaction.type === 'transfer') {
      if (transaction.accountId === account.id) return balance - transaction.amountMinor;
      if (transaction.toAccountId === account.id) return balance + transaction.amountMinor;
    }
    return balance;
  }, account.openingBalanceMinor);
}

export function getAccountSummary(account: Account, transactions: Transaction[]): AccountSummary {
  let moneyInMinor = 0;
  let moneyOutMinor = 0;
  let transactionCount = 0;
  transactions.forEach((transaction) => {
    if (transaction.type === 'income' && transaction.accountId === account.id) { moneyInMinor += transaction.amountMinor; transactionCount += 1; }
    if (transaction.type === 'expense' && transaction.accountId === account.id) { moneyOutMinor += transaction.amountMinor; transactionCount += 1; }
    if (transaction.type === 'transfer' && transaction.accountId === account.id) { moneyOutMinor += transaction.amountMinor; transactionCount += 1; }
    else if (transaction.type === 'transfer' && transaction.toAccountId === account.id) { moneyInMinor += transaction.amountMinor; transactionCount += 1; }
  });
  const netMovementMinor = moneyInMinor - moneyOutMinor;
  return { currentBalanceMinor: account.openingBalanceMinor + netMovementMinor, moneyInMinor, moneyOutMinor, netMovementMinor, transactionCount };
}

export function getDashboardSummary(state: FinanceState): DashboardSummary {
  const totalBalanceMinor = state.accounts.filter((account) => !account.archived).reduce(
    (total, account) => total + getAccountBalance(account, state.transactions),
    0,
  );

  const incomeMinor = state.transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amountMinor, 0);

  const expenseMinor = state.transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amountMinor, 0);

  const surplusMinor = incomeMinor - expenseMinor;
  const savingsRate = incomeMinor > 0 ? Math.max(0, (surplusMinor / incomeMinor) * 100) : 0;

  return { totalBalanceMinor, incomeMinor, expenseMinor, surplusMinor, savingsRate };
}

export function getCashFlowHistory(transactions: Transaction[], referenceKey: string, monthCount = 6): CashFlowPoint[] {
  const reference = new Date(`${referenceKey}T12:00:00Z`);
  return Array.from({ length: monthCount }, (_, index) => {
    const month = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - (monthCount - 1 - index), 1, 12));
    const key = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
    const matching = transactions.filter((transaction) => transaction.occurredOn.startsWith(key));
    return {
      month: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(month),
      incomeMinor: matching.filter((transaction) => transaction.type === 'income').reduce((total, transaction) => total + transaction.amountMinor, 0),
      expenseMinor: matching.filter((transaction) => transaction.type === 'expense').reduce((total, transaction) => total + transaction.amountMinor, 0),
    };
  });
}

export function getBudgetSpent(budget: Budget, transactions: Transaction[]): MoneyMinor {
  const category = budget.category.trim().toLocaleLowerCase('en-IN');
  return transactions
    .filter((transaction) => transaction.type === 'expense'
      && transaction.category.trim().toLocaleLowerCase('en-IN') === category
      && transaction.occurredOn >= budget.startOn
      && transaction.occurredOn <= budget.endOn)
    .reduce((total, transaction) => total + transaction.amountMinor, 0);
}

export function getBudgetProgress(budget: Budget, transactions: Transaction[]): BudgetProgress {
  const spentMinor = getBudgetSpent(budget, transactions);
  const remainingMinor = budget.limitMinor - spentMinor;
  const usedPercent = budget.limitMinor > 0 ? (spentMinor / budget.limitMinor) * 100 : 0;
  const tone: BudgetTone = usedPercent > 100 ? 'danger' : usedPercent >= 80 ? 'warning' : 'positive';
  const status = tone === 'danger' ? 'Over budget' : tone === 'warning' ? 'Near limit' : 'On track';
  return { spentMinor, remainingMinor, usedPercent, tone, status };
}

export function addBudget(state: FinanceState, input: BudgetInput): FinanceState {
  validateBudgetInput(state, input);
  const idBase = `${input.category}-${input.startOn}`.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'budget';
  let id = idBase;
  let suffix = 2;
  while (state.budgets.some((budget) => budget.id === id)) { id = `${idBase}-${suffix}`; suffix += 1; }
  return { ...state, budgets: [...state.budgets, normaliseBudgetInput(input, id)] };
}

export function updateBudget(state: FinanceState, id: string, input: BudgetInput): FinanceState {
  if (!state.budgets.some((budget) => budget.id === id)) throw new Error('The budget to update does not exist.');
  validateBudgetInput(state, input, id);
  return { ...state, budgets: state.budgets.map((budget) => budget.id === id ? normaliseBudgetInput(input, id) : budget) };
}

export function deleteBudget(state: FinanceState, id: string): FinanceState {
  return { ...state, budgets: state.budgets.filter((budget) => budget.id !== id) };
}

export function getSavingsGoalProgress(goal: SavingsGoal, todayKey: string): SavingsGoalProgress {
  const remainingMinor = Math.max(0, goal.targetMinor - goal.savedMinor);
  const percent = goal.targetMinor > 0 ? (goal.savedMinor / goal.targetMinor) * 100 : 0;
  const today = new Date(`${todayKey}T12:00:00+05:30`).getTime();
  const target = new Date(`${goal.targetDate}T12:00:00+05:30`).getTime();
  const daysRemaining = Math.ceil((target - today) / 86_400_000);
  const monthsRemaining = Math.max(1, Math.ceil(Math.max(daysRemaining, 0) / 30.44));
  const suggestedMonthlyMinor = remainingMinor > 0 ? Math.ceil(remainingMinor / monthsRemaining) : 0;
  if (remainingMinor === 0) return { remainingMinor, percent, daysRemaining, suggestedMonthlyMinor, status: 'Complete', tone: 'positive' };
  if (daysRemaining < 0) return { remainingMinor, percent, daysRemaining, suggestedMonthlyMinor, status: 'Past target', tone: 'danger' };
  if (daysRemaining <= 60) return { remainingMinor, percent, daysRemaining, suggestedMonthlyMinor, status: 'Due soon', tone: 'warning' };
  return { remainingMinor, percent, daysRemaining, suggestedMonthlyMinor, status: 'In progress', tone: 'blue' };
}

export function addSavingsGoal(state: FinanceState, input: SavingsGoalInput): FinanceState {
  validateSavingsGoalInput(input);
  const idBase = input.name.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'goal';
  let id = idBase; let suffix = 2;
  while (state.savingsGoals.some((goal) => goal.id === id)) { id = `${idBase}-${suffix}`; suffix += 1; }
  const goal: SavingsGoal = { id, name: input.name.trim(), targetMinor: input.targetMinor, savedMinor: input.initialSavedMinor ?? 0, targetDate: input.targetDate, createdOn: input.createdOn, accent: input.accent };
  return { ...state, savingsGoals: [...state.savingsGoals, goal] };
}

export function updateSavingsGoal(state: FinanceState, id: string, input: SavingsGoalInput): FinanceState {
  validateSavingsGoalInput(input);
  if (!state.savingsGoals.some((goal) => goal.id === id)) throw new Error('The savings goal to update does not exist.');
  return { ...state, savingsGoals: state.savingsGoals.map((goal) => goal.id === id ? { ...goal, name: input.name.trim(), targetMinor: input.targetMinor, targetDate: input.targetDate, createdOn: input.createdOn, accent: input.accent } : goal) };
}

export function deleteSavingsGoal(state: FinanceState, id: string): FinanceState {
  return { ...state, savingsGoals: state.savingsGoals.filter((goal) => goal.id !== id), savingsActivities: state.savingsActivities.filter((activity) => activity.goalId !== id) };
}

export function addSavingsActivity(state: FinanceState, input: SavingsActivityInput): FinanceState {
  const goal = state.savingsGoals.find((item) => item.id === input.goalId);
  if (!goal) throw new Error('The selected savings goal does not exist.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Enter an amount greater than zero.');
  if (!isValidDateKey(input.occurredOn)) throw new Error('Select a valid activity date.');
  if (input.type === 'withdrawal' && input.amountMinor > goal.savedMinor) throw new Error('Withdrawal cannot exceed the amount currently saved.');
  const activity: SavingsActivity = { ...input, note: input.note?.trim(), id: globalThis.crypto?.randomUUID?.() ?? `saving-${Date.now()}`, createdAt: new Date().toISOString() };
  const savedMinor = goal.savedMinor + (input.type === 'deposit' ? input.amountMinor : -input.amountMinor);
  return { ...state, savingsGoals: state.savingsGoals.map((item) => item.id === goal.id ? { ...item, savedMinor } : item), savingsActivities: [activity, ...state.savingsActivities] };
}

function validateSavingsGoalInput(input: SavingsGoalInput): void {
  if (!input.name.trim()) throw new Error('Enter a savings goal name.');
  if (!Number.isSafeInteger(input.targetMinor) || input.targetMinor <= 0) throw new Error('Target amount must be greater than zero.');
  if (input.initialSavedMinor !== undefined && (!Number.isSafeInteger(input.initialSavedMinor) || input.initialSavedMinor < 0)) throw new Error('Starting amount must be zero or more.');
  if (!isValidDateKey(input.createdOn) || !isValidDateKey(input.targetDate) || input.targetDate < input.createdOn) throw new Error('Select a valid target date on or after the start date.');
  if (!['emerald', 'blue', 'amber', 'slate'].includes(input.accent)) throw new Error('Select a valid goal colour.');
}

function normaliseBudgetInput(input: BudgetInput, id: string): Budget {
  return { ...input, id, name: input.name.trim(), category: input.category.trim() };
}

function validateBudgetInput(state: FinanceState, input: BudgetInput, editingId?: string): void {
  if (!input.name.trim()) throw new Error('Enter a budget name.');
  if (!input.category.trim()) throw new Error('Select a spending category.');
  if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor <= 0) throw new Error('Budget amount must be greater than zero.');
  if (!['monthly', 'custom'].includes(input.period) || !isValidDateKey(input.startOn) || !isValidDateKey(input.endOn) || input.startOn > input.endOn) {
    throw new Error('Select a valid budget period.');
  }
  const category = input.category.trim().toLocaleLowerCase('en-IN');
  const overlaps = state.budgets.some((budget) => budget.id !== editingId
    && budget.category.trim().toLocaleLowerCase('en-IN') === category
    && input.startOn <= budget.endOn
    && input.endOn >= budget.startOn);
  if (overlaps) throw new Error('This category already has a budget covering part of the selected period.');
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function advanceRecurringDate(dateKey: string, frequency: RecurringFrequency): string {
  if (!isValidDateKey(dateKey)) throw new Error('Select a valid next due date.');
  const [year, month, day] = dateKey.split('-').map(Number);
  if (frequency === 'weekly') {
    const value = new Date(Date.UTC(year, month - 1, day + 7));
    return value.toISOString().slice(0, 10);
  }
  const targetYear = frequency === 'yearly' ? year + 1 : month === 12 ? year + 1 : year;
  const targetMonth = frequency === 'yearly' ? month : month === 12 ? 1 : month + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function validateRecurringInput(state: FinanceState, input: RecurringTransactionInput): void {
  if (!['income', 'expense'].includes(input.type)) throw new Error('Recurring entries must be income or expenses.');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Amount must be greater than zero.');
  if (!input.payee.trim()) throw new Error('Enter a payee or income source.');
  if (!input.category.trim()) throw new Error('Select a category.');
  if (!['weekly', 'monthly', 'yearly'].includes(input.frequency)) throw new Error('Select a valid frequency.');
  if (!isValidDateKey(input.nextDueOn)) throw new Error('Select a valid next due date.');
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!account || account.archived) throw new Error('Select an active account.');
}

function normaliseRecurring(input: RecurringTransactionInput): RecurringTransactionInput {
  return { ...input, payee: input.payee.trim(), category: input.category.trim(), note: input.note?.trim() || undefined };
}

export function addRecurringTransaction(state: FinanceState, input: RecurringTransactionInput): FinanceState {
  validateRecurringInput(state, input);
  const idBase = input.payee.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recurring';
  let id = `recurring-${idBase}`; let suffix = 2;
  while (state.recurringTransactions.some((item) => item.id === id)) { id = `recurring-${idBase}-${suffix}`; suffix += 1; }
  return { ...state, recurringTransactions: [...state.recurringTransactions, { ...normaliseRecurring(input), id, createdAt: new Date().toISOString() }] };
}

export function updateRecurringTransaction(state: FinanceState, id: string, input: RecurringTransactionInput): FinanceState {
  validateRecurringInput(state, input);
  if (!state.recurringTransactions.some((item) => item.id === id)) throw new Error('The recurring schedule does not exist.');
  return { ...state, recurringTransactions: state.recurringTransactions.map((item) => item.id === id ? { ...item, ...normaliseRecurring(input) } : item) };
}

export function deleteRecurringTransaction(state: FinanceState, id: string): FinanceState {
  return { ...state, recurringTransactions: state.recurringTransactions.filter((item) => item.id !== id) };
}

export function setRecurringActive(state: FinanceState, id: string, active: boolean): FinanceState {
  if (!state.recurringTransactions.some((item) => item.id === id)) throw new Error('The recurring schedule does not exist.');
  return { ...state, recurringTransactions: state.recurringTransactions.map((item) => item.id === id ? { ...item, active } : item) };
}

export function recordRecurringTransaction(state: FinanceState, id: string): FinanceState {
  const recurring = state.recurringTransactions.find((item) => item.id === id);
  if (!recurring) throw new Error('The recurring schedule does not exist.');
  if (!recurring.active) throw new Error('Resume this schedule before recording it.');
  validateRecurringInput(state, recurring);
  const transaction: Transaction = {
    id: globalThis.crypto?.randomUUID?.() ?? `recurring-entry-${Date.now()}`,
    type: recurring.type,
    amountMinor: recurring.amountMinor,
    occurredOn: recurring.nextDueOn,
    accountId: recurring.accountId,
    payee: recurring.payee,
    category: recurring.category,
    note: recurring.note ? `Recurring · ${recurring.note}` : 'Recurring transaction',
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    transactions: [transaction, ...state.transactions],
    recurringTransactions: state.recurringTransactions.map((item) => item.id === id ? { ...item, lastRecordedOn: recurring.nextDueOn, nextDueOn: advanceRecurringDate(recurring.nextDueOn, recurring.frequency) } : item),
  };
}

export function addAccount(state: FinanceState, input: AccountInput): FinanceState {
  validateAccountInput(input);
  const idBase = input.name.trim().toLocaleLowerCase('en-IN').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
  let id = idBase;
  let suffix = 2;
  while (state.accounts.some((account) => account.id === id)) { id = `${idBase}-${suffix}`; suffix += 1; }
  return { ...state, accounts: [...state.accounts, { ...input, name: input.name.trim(), institution: input.institution.trim(), id }] };
}

export function updateAccount(state: FinanceState, id: string, input: AccountInput): FinanceState {
  validateAccountInput(input);
  if (!state.accounts.some((account) => account.id === id)) throw new Error('The account to update does not exist.');
  return { ...state, accounts: state.accounts.map((account) => account.id === id ? { ...account, ...input, name: input.name.trim(), institution: input.institution.trim() } : account) };
}

export function setAccountArchived(state: FinanceState, id: string, archived: boolean): FinanceState {
  const account = state.accounts.find((item) => item.id === id);
  if (!account) throw new Error('The account does not exist.');
  if (archived && !account.archived && state.accounts.filter((item) => !item.archived).length <= 1) {
    throw new Error('Keep at least one active account.');
  }
  return { ...state, accounts: state.accounts.map((item) => item.id === id ? { ...item, archived } : item) };
}

function validateAccountInput(input: AccountInput): void {
  if (!input.name.trim()) throw new Error('Enter an account name.');
  if (!input.institution.trim()) throw new Error('Enter an institution or description.');
  if (!['bank', 'cash', 'wallet'].includes(input.kind)) throw new Error('Select a valid account type.');
  if (!Number.isSafeInteger(input.openingBalanceMinor) || input.openingBalanceMinor < 0) throw new Error('Opening balance must be zero or more.');
}

export function addTransaction(state: FinanceState, input: NewTransactionInput): FinanceState {
  validateTransactionInput(state, input);

  const transaction: Transaction = {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `txn-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    transactions: [transaction, ...state.transactions],
  };
}

export function updateTransaction(state: FinanceState, id: string, input: NewTransactionInput): FinanceState {
  validateTransactionInput(state, input);
  if (!state.transactions.some((transaction) => transaction.id === id)) {
    throw new Error('The transaction to update does not exist.');
  }

  return {
    ...state,
    transactions: state.transactions.map((transaction) =>
      transaction.id === id ? { ...transaction, ...input } : transaction,
    ),
  };
}

export function deleteTransactions(state: FinanceState, ids: string[]): FinanceState {
  const selectedIds = new Set(ids);
  return {
    ...state,
    transactions: state.transactions.filter((transaction) => !selectedIds.has(transaction.id)),
  };
}

function validateTransactionInput(state: FinanceState, input: NewTransactionInput): void {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Amount must be a positive value in minor currency units.');
  }
  if (!state.accounts.some((account) => account.id === input.accountId)) {
    throw new Error('The selected account does not exist.');
  }
  if (input.type === 'transfer') {
    if (!input.toAccountId || !state.accounts.some((account) => account.id === input.toAccountId)) {
      throw new Error('Select a valid destination account.');
    }
    if (input.toAccountId === input.accountId) {
      throw new Error('Transfer accounts must be different.');
    }
  }
}
