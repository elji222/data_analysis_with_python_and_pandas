import { fetchAdminUsageStats } from '@/lib/admin/usage-stats';
import { isAdminEmail } from '@/lib/access/admin';
import { requireUserAccess } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  const isAdmin = Boolean(auth.access?.is_admin) || isAdminEmail(auth.user.email);
  if (!isAdmin) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const stats = await fetchAdminUsageStats(auth.serviceClient);
    return Response.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load usage stats.';
    return Response.json({ error: message }, { status: 500 });
  }
}
