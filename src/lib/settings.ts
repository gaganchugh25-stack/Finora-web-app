import { isUserPreferences } from '../services/preferences';
import type { FinanceState } from '../types/finance';
import type { AppTheme, FinoraBackup, UserPreferences } from '../types/preferences';

function isFinanceState(value: unknown): value is FinanceState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FinanceState>;
  return candidate.version === 1
    && Array.isArray(candidate.accounts)
    && Array.isArray(candidate.transactions)
    && Array.isArray(candidate.budgets)
    && Array.isArray(candidate.savingsGoals)
    && Array.isArray(candidate.savingsActivities)
    && Array.isArray(candidate.bills);
}

export function createFinoraBackup(finance: FinanceState, preferences: UserPreferences, theme: AppTheme, exportedAt = new Date().toISOString()): FinoraBackup {
  return { format: 'finora-backup', version: 1, exportedAt, theme, preferences, finance };
}

export function parseFinoraBackup(text: string): FinoraBackup {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('Choose a valid Finora JSON backup file.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('This file is not a Finora backup.');
  const candidate = parsed as Partial<FinoraBackup>;
  if (candidate.format !== 'finora-backup' || candidate.version !== 1 || !['light', 'dark'].includes(candidate.theme ?? '')) throw new Error('This backup format is not supported.');
  if (!isUserPreferences(candidate.preferences) || !isFinanceState(candidate.finance)) throw new Error('The backup is incomplete or damaged.');
  return {
    ...(candidate as FinoraBackup),
    finance: {
      ...(candidate.finance as FinanceState),
      recurringTransactions: Array.isArray((candidate.finance as Partial<FinanceState>).recurringTransactions)
        ? (candidate.finance as FinanceState).recurringTransactions
        : [],
    },
  };
}
