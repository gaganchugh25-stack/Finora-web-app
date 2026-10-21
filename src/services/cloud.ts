import { getSupabase } from '../lib/supabase';
import { isUserPreferences } from './preferences';
import { emptyFinanceState, normaliseFinanceState } from './storage';
import { defaultPreferences, type AppTheme, type UserPreferences } from '../types/preferences';
import type { FinanceState } from '../types/finance';
import type { Json } from '../types/database';

export const CLOUD_OWNER_KEY = 'finora.cloud.owner.v1';

export interface CloudBundle {
  finance: FinanceState;
  preferences: UserPreferences;
  theme: AppTheme;
}

function isTheme(value: unknown): value is AppTheme {
  return value === 'light' || value === 'dark';
}

export async function loadOrCreateCloudBundle(userId: string, seed: CloudBundle): Promise<{ bundle: CloudBundle; created: boolean }> {
  const client = getSupabase();
  const { data, error } = await client
    .from('finora_user_data')
    .select('finance_state, preferences, theme')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    const finance = normaliseFinanceState(data.finance_state);
    if (!finance || !isUserPreferences(data.preferences) || !isTheme(data.theme)) {
      throw new Error('Your cloud record could not be validated. The local copy has not been changed.');
    }
    return { bundle: { finance, preferences: data.preferences, theme: data.theme }, created: false };
  }

  await saveCloudBundle(userId, seed);
  return { bundle: seed, created: true };
}

export async function saveCloudBundle(userId: string, bundle: CloudBundle): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from('finora_user_data').upsert({
    user_id: userId,
    finance_state: bundle.finance as unknown as Json,
    preferences: bundle.preferences as unknown as Json,
    theme: bundle.theme,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function emptyCloudBundle(displayName = 'Finora user'): CloudBundle {
  return {
    finance: emptyFinanceState,
    preferences: { ...defaultPreferences, displayName },
    theme: 'light',
  };
}

