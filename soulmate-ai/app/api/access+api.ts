import {
  bootstrapUserAccess,
  buildAccessStatus,
  createInviteForUser,
} from '@/lib/access/repository';
import {
  createSupabaseServiceClient,
  requireAuthenticatedUser,
  requireUserAccess,
} from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ('error' in auth) return auth.error;

  try {
    const status = await buildAccessStatus(auth.client, auth.userId);
    return Response.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load access status.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ('error' in auth) return auth.error;

  let body: { action?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    const serviceClient = createSupabaseServiceClient();

    if (action === 'bootstrap') {
      const inviteCode = typeof body.code === 'string' ? body.code : null;
      const status = await bootstrapUserAccess(serviceClient, {
        userId: auth.userId,
        email: auth.user.email ?? '',
        inviteCode,
      });
      return Response.json(status);
    }

    if (action === 'create-invite') {
      const accessAuth = await requireUserAccess(request);
      if ('error' in accessAuth) return accessAuth.error;

      const { invite, access } = await createInviteForUser(accessAuth.serviceClient, auth.userId);
      const invites = await buildAccessStatus(accessAuth.client, auth.userId);

      return Response.json({
        invite,
        invitesRemaining: access.invites_remaining,
        invites: invites.invites,
        isAdmin: access.is_admin,
        hasAccess: true,
      });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update access.';
    const status = /invite code|required to join|used all 5/i.test(message) ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
