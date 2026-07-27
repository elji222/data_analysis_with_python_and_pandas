import { isAdminEmail } from '@/lib/access/admin';
import { getFreeAccessForAll, setFreeAccessForAll } from '@/lib/billing/app-settings';
import { buildBillingStatus } from '@/lib/billing/repository';
import { requireUserAccess } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  const isAdmin = Boolean(auth.access?.is_admin) || isAdminEmail(auth.user.email);
  if (!isAdmin) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const freeAccessForAll = await getFreeAccessForAll(auth.serviceClient);
    return Response.json({ freeAccessForAll });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load access mode.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  const isAdmin = Boolean(auth.access?.is_admin) || isAdminEmail(auth.user.email);
  if (!isAdmin) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const freeAccessForAll = body.freeAccessForAll === true;
    await setFreeAccessForAll(auth.serviceClient, freeAccessForAll);

    const status = await buildBillingStatus(auth.client, auth.userId, auth.user.email, auth.access, {
      freeAccessForAll,
    });

    return Response.json({
      freeAccessForAll,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update access mode.';
    return Response.json({ error: message }, { status: 500 });
  }
}
