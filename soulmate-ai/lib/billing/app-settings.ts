import type { SupabaseClient } from '@supabase/supabase-js';

const BILLING_SETTINGS_KEY = 'billing';
const CACHE_TTL_MS = 15_000;

type BillingSettingsRow = {
  free_access_for_all?: boolean;
};

let cachedFreeAccess: { value: boolean; expiresAt: number } | null = null;

function readEnvFreeAccessOverride() {
  const raw = process.env.FREE_ACCESS_FOR_ALL?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function clearBillingAppSettingsCache() {
  cachedFreeAccess = null;
}

export async function getFreeAccessForAll(
  serviceClient?: SupabaseClient | null
): Promise<boolean> {
  if (readEnvFreeAccessOverride()) {
    return true;
  }

  if (cachedFreeAccess && cachedFreeAccess.expiresAt > Date.now()) {
    return cachedFreeAccess.value;
  }

  if (!serviceClient) {
    return false;
  }

  const { data, error } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', BILLING_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /app_settings/i.test(error.message ?? '')) {
      return false;
    }
    throw error;
  }

  const value = (data?.value ?? {}) as BillingSettingsRow;
  const enabled = Boolean(value.free_access_for_all);

  cachedFreeAccess = {
    value: enabled,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return enabled;
}

export async function setFreeAccessForAll(serviceClient: SupabaseClient, enabled: boolean) {
  const { error } = await serviceClient.from('app_settings').upsert(
    {
      key: BILLING_SETTINGS_KEY,
      value: { free_access_for_all: enabled },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) throw error;
  clearBillingAppSettingsCache();
}
