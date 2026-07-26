import { buildBillingStatus } from '@/lib/billing/repository';
import { requireUserAccess } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  try {
    const status = await buildBillingStatus(auth.client, auth.userId, auth.user.email);
    return Response.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load billing status.';
    return Response.json({ error: message }, { status: 500 });
  }
}
