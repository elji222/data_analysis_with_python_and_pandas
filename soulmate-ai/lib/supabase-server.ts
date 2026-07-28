import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import { getUserAccess } from '@/lib/access/repository';
import type { UserAccess } from '@/types/access';
import { buildBillingStatus } from '@/lib/billing/repository';
import { getFreeAccessForAll } from '@/lib/billing/app-settings';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function createSupabaseServerClient(accessToken: string): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured on the server.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseServiceClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const client = createSupabaseServerClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const client = createSupabaseServerClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

type AuthedContext = {
  userId: string;
  token: string;
  client: SupabaseClient;
  user: User;
};

type AuthedAccessContext = AuthedContext & {
  serviceClient: SupabaseClient;
  access: UserAccess | null;
};

export async function requireAuthenticatedUser(
  request: Request
): Promise<AuthedContext | { error: Response }> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const client = createSupabaseServerClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return {
    userId: data.user.id,
    token,
    client,
    user: data.user,
  };
}

export async function requireUserAccess(
  request: Request
): Promise<AuthedAccessContext | { error: Response }> {
  const auth = await requireAuthenticatedUser(request);
  if ('error' in auth) return auth;

  const access = await getUserAccess(auth.client, auth.userId);
  if (!access) {
    return { error: Response.json({ error: 'Invite required' }, { status: 403 }) };
  }

  let serviceClient: SupabaseClient;
  try {
    serviceClient = createSupabaseServiceClient();
  } catch {
    return {
      error: Response.json(
        { error: 'Invite system is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      ),
    };
  }

  return {
    ...auth,
    access,
    serviceClient,
  };
}

export async function requirePaidAccess(
  request: Request
): Promise<AuthedAccessContext | { error: Response }> {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth;

  const freeAccessForAll = await getFreeAccessForAll(auth.serviceClient);
  const billing = await buildBillingStatus(
    auth.client,
    auth.userId,
    auth.user.email,
    auth.access,
    { freeAccessForAll }
  );
  if (!billing.hasActiveSubscription) {
    return {
      error: Response.json(
        {
          error: 'Subscription required. Open Settings to subscribe and unlock Soulmate AI.',
          code: 'subscription_required',
        },
        { status: 402 }
      ),
    };
  }

  return auth;
}

