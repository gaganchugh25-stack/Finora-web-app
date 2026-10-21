import type { FinanceState, TransactionType } from './finance';

export type AppTheme = 'light' | 'dark';

export interface UserPreferences {
  version: 1;
  displayName: string;
  defaultTransactionType: TransactionType;
  defaultAccountId: string;
}

export interface FinoraBackup {
  format: 'finora-backup';
  version: 1;
  exportedAt: string;
  theme: AppTheme;
  preferences: UserPreferences;
  finance: FinanceState;
}

export const defaultPreferences: UserPreferences = {
  version: 1,
  displayName: 'Gagan Chugh',
  defaultTransactionType: 'expense',
  defaultAccountId: '',
};
