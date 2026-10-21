import type { BillReminder, FinanceState, MoneyMinor } from '../types/finance';

export type CalendarEventType = 'income' | 'expense' | 'transfer' | 'budget' | 'savings' | 'bill' | 'recurring';

export interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  subtitle: string;
  amountMinor?: MoneyMinor;
  direction: 'in' | 'out' | 'neutral';
}

export interface CalendarDay {
  date: string;
  day: number;
  inCurrentMonth: boolean;
}

function dateKey(year: number, monthIndex: number, day: number): string {
  const value = new Date(Date.UTC(year, monthIndex, day));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  return dateKey(year, month - 1 + offset, 1).slice(0, 7);
}

export function getMonthGrid(monthKey: string): CalendarDay[] {
  const [year, month] = monthKey.split('-').map(Number);
  const monthIndex = month - 1;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = dateKey(year, monthIndex, index - mondayOffset + 1);
    return { date, day: Number(date.slice(8, 10)), inCurrentMonth: date.startsWith(monthKey) };
  });
}

export function getCalendarEvents(state: FinanceState, bills: BillReminder[]): CalendarEvent[] {
  const accountNames = new Map(state.accounts.map((account) => [account.id, account.name]));
  const events: CalendarEvent[] = state.transactions.map((transaction) => ({
    id: `transaction-${transaction.id}`,
    date: transaction.occurredOn,
    type: transaction.type,
    title: transaction.payee,
    subtitle: transaction.type === 'transfer'
      ? `${accountNames.get(transaction.accountId) ?? 'Account'} to ${accountNames.get(transaction.toAccountId ?? '') ?? 'Account'}`
      : `${transaction.category} · ${accountNames.get(transaction.accountId) ?? 'Account'}`,
    amountMinor: transaction.amountMinor,
    direction: transaction.type === 'income' ? 'in' : transaction.type === 'expense' ? 'out' : 'neutral',
  }));

  for (const budget of state.budgets) {
    events.push({ id: `budget-${budget.id}-start`, date: budget.startOn, type: 'budget', title: `${budget.name} starts`, subtitle: `${budget.category} · spending limit`, amountMinor: budget.limitMinor, direction: 'neutral' });
    if (budget.endOn !== budget.startOn) {
      events.push({ id: `budget-${budget.id}-end`, date: budget.endOn, type: 'budget', title: `${budget.name} ends`, subtitle: `${budget.category} · spending limit`, amountMinor: budget.limitMinor, direction: 'neutral' });
    }
  }

  for (const goal of state.savingsGoals) {
    events.push({ id: `saving-${goal.id}`, date: goal.targetDate, type: 'savings', title: `${goal.name} target`, subtitle: 'Savings goal deadline', amountMinor: goal.targetMinor, direction: 'neutral' });
  }

  for (const bill of bills) {
    events.push({ id: `bill-${bill.id}`, date: bill.dueOn, type: 'bill', title: `${bill.name} ${bill.paidOn ? 'paid' : 'due'}`, subtitle: `${bill.category} · ${accountNames.get(bill.accountId) ?? 'Payment account'}`, amountMinor: bill.amountMinor, direction: bill.paidOn ? 'neutral' : 'out' });
  }

  for (const recurring of state.recurringTransactions) {
    if (!recurring.active) continue;
    events.push({ id: `recurring-${recurring.id}`, date: recurring.nextDueOn, type: 'recurring', title: `${recurring.payee} scheduled`, subtitle: `${recurring.frequency} · ${accountNames.get(recurring.accountId) ?? 'Account'}`, amountMinor: recurring.amountMinor, direction: recurring.type === 'income' ? 'in' : 'out' });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
