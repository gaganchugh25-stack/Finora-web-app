export type MoneyMinor = number;

export type TransactionType = 'income' | 'expense' | 'transfer';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export type AccountKind = 'bank' | 'cash' | 'wallet';

export interface Account {
  id: string;
  name: string;
  institution: string;
  kind: AccountKind;
  openingBalanceMinor: MoneyMinor;
  accent: 'emerald' | 'blue' | 'amber' | 'slate';
  archived?: boolean;
}

export interface AccountInput {
  name: string;
  institution: string;
  kind: AccountKind;
  openingBalanceMinor: MoneyMinor;
  accent: Account['accent'];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: MoneyMinor;
  occurredOn: string;
  accountId: string;
  toAccountId?: string;
  payee: string;
  category: string;
  note?: string;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  limitMinor: MoneyMinor;
  spentMinor: MoneyMinor;
  tone: 'positive' | 'warning' | 'danger';
}

export type BudgetPeriod = 'monthly' | 'custom';

export interface Budget {
  id: string;
  name: string;
  category: string;
  limitMinor: MoneyMinor;
  period: BudgetPeriod;
  startOn: string;
  endOn: string;
}

export type BudgetInput = Omit<Budget, 'id'>;

export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: MoneyMinor;
  savedMinor: MoneyMinor;
  targetDate: string;
  createdOn: string;
  accent: Account['accent'];
}

export interface SavingsGoalInput {
  name: string;
  targetMinor: MoneyMinor;
  targetDate: string;
  createdOn: string;
  accent: Account['accent'];
  initialSavedMinor?: MoneyMinor;
}

export type SavingsActivityType = 'deposit' | 'withdrawal';

export interface SavingsActivity {
  id: string;
  goalId: string;
  type: SavingsActivityType;
  amountMinor: MoneyMinor;
  occurredOn: string;
  note?: string;
  createdAt: string;
}

export interface SavingsActivityInput {
  goalId: string;
  type: SavingsActivityType;
  amountMinor: MoneyMinor;
  occurredOn: string;
  note?: string;
}

export interface BillReminder {
  id: string;
  name: string;
  amountMinor: MoneyMinor;
  dueOn: string;
  accountId: string;
  category: string;
  reminderDays: number;
  note?: string;
  paidOn?: string;
  paidTransactionId?: string;
}

export interface RecurringTransaction {
  id: string;
  type: Exclude<TransactionType, 'transfer'>;
  amountMinor: MoneyMinor;
  accountId: string;
  payee: string;
  category: string;
  note?: string;
  frequency: RecurringFrequency;
  nextDueOn: string;
  active: boolean;
  createdAt: string;
  lastRecordedOn?: string;
}

export type RecurringTransactionInput = Omit<RecurringTransaction, 'id' | 'createdAt' | 'lastRecordedOn'>;

export type BillInput = Omit<BillReminder, 'id' | 'paidOn' | 'paidTransactionId'>;

export interface CashFlowPoint {
  month: string;
  incomeMinor: MoneyMinor;
  expenseMinor: MoneyMinor;
}

export interface FinanceState {
  version: 1;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  savingsActivities: SavingsActivity[];
  bills: BillReminder[];
  recurringTransactions: RecurringTransaction[];
}

export interface NewTransactionInput {
  type: TransactionType;
  amountMinor: MoneyMinor;
  occurredOn: string;
  accountId: string;
  toAccountId?: string;
  payee: string;
  category: string;
  note?: string;
}
