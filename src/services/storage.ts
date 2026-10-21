import type { FinanceState } from '../types/finance';

const STORAGE_KEY = 'finora.finance.v1';

export const emptyFinanceState: FinanceState = {
  version: 1,
  accounts: [],
  transactions: [],
  budgets: [],
  savingsGoals: [],
  savingsActivities: [],
  bills: [],
  recurringTransactions: [],
};

export function normaliseFinanceState(value: unknown): FinanceState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FinanceState>;
  if (candidate.version !== 1 || !Array.isArray(candidate.accounts) || !Array.isArray(candidate.transactions)) return null;
  return {
    ...candidate,
    version: 1,
    accounts: candidate.accounts,
    transactions: candidate.transactions,
    budgets: Array.isArray(candidate.budgets) ? candidate.budgets : [],
    savingsGoals: Array.isArray(candidate.savingsGoals) ? candidate.savingsGoals : [],
    savingsActivities: Array.isArray(candidate.savingsActivities) ? candidate.savingsActivities : [],
    bills: Array.isArray(candidate.bills) ? candidate.bills : [],
    recurringTransactions: Array.isArray(candidate.recurringTransactions) ? candidate.recurringTransactions : [],
  };
}

export function loadFinanceState(): FinanceState {
  if (typeof window === 'undefined') return emptyFinanceState;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyFinanceState;
    const parsed: unknown = JSON.parse(saved);
    return normaliseFinanceState(parsed) ?? emptyFinanceState;
  } catch {
    return emptyFinanceState;
  }
}

export function saveFinanceState(state: FinanceState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearFinanceState(): FinanceState {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyFinanceState));
  return emptyFinanceState;
}
