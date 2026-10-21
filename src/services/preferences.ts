import { defaultPreferences, type UserPreferences } from '../types/preferences';

const PREFERENCES_KEY = 'finora.preferences.v1';

export function isUserPreferences(value: unknown): value is UserPreferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UserPreferences>;
  return candidate.version === 1
    && typeof candidate.displayName === 'string'
    && ['income', 'expense', 'transfer'].includes(candidate.defaultTransactionType ?? '')
    && typeof candidate.defaultAccountId === 'string';
}

export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const saved = window.localStorage.getItem(PREFERENCES_KEY);
    if (!saved) return defaultPreferences;
    const parsed: unknown = JSON.parse(saved);
    return isUserPreferences(parsed) ? parsed : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: UserPreferences): void {
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}
