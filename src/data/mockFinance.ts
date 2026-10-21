import type {
  Account,
  BillReminder,
  Budget,
  BudgetCategory,
  CashFlowPoint,
  FinanceState,
  SavingsGoal,
  SavingsActivity,
  Transaction,
} from '../types/finance';

export const accounts: Account[] = [
  { id: 'hdfc', name: 'HDFC Bank', institution: 'Savings account', kind: 'bank', openingBalanceMinor: 18_000_000, accent: 'emerald' },
  { id: 'icici', name: 'ICICI Bank', institution: 'Salary account', kind: 'bank', openingBalanceMinor: 22_000_000, accent: 'blue' },
  { id: 'cash', name: 'Cash', institution: 'Physical wallet', kind: 'cash', openingBalanceMinor: 1_210_000, accent: 'amber' },
  { id: 'wallet', name: 'Digital wallet', institution: 'Everyday payments', kind: 'wallet', openingBalanceMinor: 2_500_000, accent: 'slate' },
];

const transactionSeed: Array<Omit<Transaction, 'id' | 'createdAt'>> = [
  { type: 'expense', amountMinor: 284_000, occurredOn: '2026-10-18', accountId: 'hdfc', payee: 'Reliance Fresh', category: 'Groceries', note: 'Weekly groceries' },
  { type: 'income', amountMinor: 11_800_000, occurredOn: '2026-10-16', accountId: 'icici', payee: 'Salary credit', category: 'Salary', note: 'October salary' },
  { type: 'transfer', amountMinor: 2_500_000, occurredOn: '2026-10-15', accountId: 'hdfc', toAccountId: 'icici', payee: 'Move to savings', category: 'Transfer', note: 'Monthly allocation' },
  { type: 'expense', amountMinor: 320_000, occurredOn: '2026-10-15', accountId: 'hdfc', payee: 'Indian Oil', category: 'Transport' },
  { type: 'expense', amountMinor: 450_000, occurredOn: '2026-10-13', accountId: 'icici', payee: 'Apartment maintenance', category: 'Housing' },
  { type: 'income', amountMinor: 600_000, occurredOn: '2026-10-12', accountId: 'hdfc', payee: 'Freelance project', category: 'Side income' },
  { type: 'expense', amountMinor: 129_900, occurredOn: '2026-10-11', accountId: 'hdfc', payee: 'Home internet', category: 'Utilities' },
  { type: 'expense', amountMinor: 348_000, occurredOn: '2026-10-10', accountId: 'hdfc', payee: 'Electricity', category: 'Utilities' },
  { type: 'expense', amountMinor: 1_875_000, occurredOn: '2026-10-09', accountId: 'icici', payee: 'Health insurance', category: 'Insurance' },
  { type: 'expense', amountMinor: 1_450_000, occurredOn: '2026-10-07', accountId: 'icici', payee: 'Monthly rent', category: 'Housing' },
  { type: 'expense', amountMinor: 586_000, occurredOn: '2026-10-06', accountId: 'wallet', payee: 'Dining and leisure', category: 'Dining' },
  { type: 'expense', amountMinor: 114_000, occurredOn: '2026-10-05', accountId: 'cash', payee: 'Mobile recharge', category: 'Utilities' },
  { type: 'expense', amountMinor: 623_100, occurredOn: '2026-10-04', accountId: 'wallet', payee: 'Household shopping', category: 'Shopping' },
  { type: 'expense', amountMinor: 720_000, occurredOn: '2026-10-03', accountId: 'hdfc', payee: 'Family purchase', category: 'Shopping' },
  { type: 'expense', amountMinor: 945_000, occurredOn: '2026-10-02', accountId: 'icici', payee: 'Medical consultation', category: 'Health' },
];

export const transactions: Transaction[] = transactionSeed.map((transaction, index) => ({
  ...transaction,
  id: `seed-${index + 1}`,
  createdAt: `2026-10-${String(18 - Math.min(index, 16)).padStart(2, '0')}T10:00:00+05:30`,
}));

export const cashFlow: CashFlowPoint[] = [
  { month: 'May', incomeMinor: 9_600_000, expenseMinor: 7_100_000 },
  { month: 'Jun', incomeMinor: 10_400_000, expenseMinor: 7_800_000 },
  { month: 'Jul', incomeMinor: 9_800_000, expenseMinor: 7_350_000 },
  { month: 'Aug', incomeMinor: 11_100_000, expenseMinor: 8_400_000 },
  { month: 'Sep', incomeMinor: 10_700_000, expenseMinor: 8_150_000 },
  { month: 'Oct', incomeMinor: 12_400_000, expenseMinor: 7_845_000 },
];

export const flexibleBudget = {
  limitMinor: 6_000_000,
  spentMinor: 4_200_000,
  remainingDays: 13,
};

export const budgetCategories: BudgetCategory[] = [
  { id: 'groceries', name: 'Groceries', limitMinor: 1_000_000, spentMinor: 734_000, tone: 'positive' },
  { id: 'transport', name: 'Transport', limitMinor: 800_000, spentMinor: 618_000, tone: 'warning' },
  { id: 'dining', name: 'Dining & leisure', limitMinor: 500_000, spentMinor: 586_000, tone: 'danger' },
];

export const budgets: Budget[] = [
  { id: 'budget-groceries-oct-2026', name: 'Monthly groceries', category: 'Groceries', limitMinor: 1_000_000, period: 'monthly', startOn: '2026-10-01', endOn: '2026-10-31' },
  { id: 'budget-transport-oct-2026', name: 'Local travel', category: 'Transport', limitMinor: 800_000, period: 'monthly', startOn: '2026-10-01', endOn: '2026-10-31' },
  { id: 'budget-dining-oct-2026', name: 'Dining & leisure', category: 'Dining', limitMinor: 500_000, period: 'monthly', startOn: '2026-10-01', endOn: '2026-10-31' },
  { id: 'budget-shopping-festive-2026', name: 'Festive shopping', category: 'Shopping', limitMinor: 1_500_000, period: 'custom', startOn: '2026-10-01', endOn: '2026-11-15' },
  { id: 'budget-housing-oct-2026', name: 'Home expenses', category: 'Housing', limitMinor: 2_500_000, period: 'monthly', startOn: '2026-10-01', endOn: '2026-10-31' },
];

export const savingsGoals: SavingsGoal[] = [
  { id: 'home-deposit', name: 'Home down payment', targetMinor: 60_000_000, savedMinor: 32_000_000, targetDate: '2027-03-31', createdOn: '2026-04-01', accent: 'emerald' },
  { id: 'emergency-fund', name: 'Emergency fund', targetMinor: 15_000_000, savedMinor: 9_000_000, targetDate: '2026-12-31', createdOn: '2026-01-01', accent: 'blue' },
  { id: 'family-holiday', name: 'Family holiday', targetMinor: 12_000_000, savedMinor: 3_500_000, targetDate: '2027-04-30', createdOn: '2026-08-01', accent: 'amber' },
];

export const savingsGoal = savingsGoals[0];

export const savingsActivities: SavingsActivity[] = [
  { id: 'saving-seed-1', goalId: 'home-deposit', type: 'deposit', amountMinor: 2_500_000, occurredOn: '2026-10-16', note: 'October allocation', createdAt: '2026-10-16T18:00:00+05:30' },
  { id: 'saving-seed-2', goalId: 'emergency-fund', type: 'deposit', amountMinor: 1_000_000, occurredOn: '2026-10-12', note: 'Monthly reserve', createdAt: '2026-10-12T18:00:00+05:30' },
  { id: 'saving-seed-3', goalId: 'family-holiday', type: 'deposit', amountMinor: 500_000, occurredOn: '2026-10-05', note: 'Travel allocation', createdAt: '2026-10-05T18:00:00+05:30' },
];

export const upcomingBills: BillReminder[] = [
  { id: 'bill-electricity', name: 'Electricity', amountMinor: 348_000, dueOn: '2026-10-21', accountId: 'hdfc', category: 'Utilities', reminderDays: 3, note: 'Monthly electricity bill' },
  { id: 'bill-internet', name: 'Home internet', amountMinor: 129_900, dueOn: '2026-10-23', accountId: 'hdfc', category: 'Utilities', reminderDays: 3 },
  { id: 'bill-insurance', name: 'Health insurance', amountMinor: 1_875_000, dueOn: '2026-10-25', accountId: 'icici', category: 'Insurance', reminderDays: 7 },
];

export const initialFinanceState: FinanceState = {
  version: 1,
  accounts,
  transactions,
  budgets,
  savingsGoals,
  savingsActivities,
  bills: upcomingBills,
  recurringTransactions: [],
};
