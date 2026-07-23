import type { SupabaseClient } from '@supabase/supabase-js';

import { ADMIN_INVITES_REMAINING, INVITES_PER_USER, isAdminEmail } from '@/lib/access/admin';
import { generateInviteCode, normalizeInviteCode } from '@/lib/access/invite-code';
import type { AccessStatus, InviteCode, UserAccess } from '@/types/access';

export async function getUserAccess(
  client: SupabaseClient,
  userId: string
): Promise<UserAccess | null> {
  const { data, error } = await client
    .from('user_access')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserAccess | null;
}

export async function listInviteCodes(
  client: SupabaseClient,
  userId: string
): Promise<InviteCode[]> {
  const { data, error } = await client
    .from('invite_codes')
    .select('*')
    .eq('creator_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as InviteCode[];
}

export async function buildAccessStatus(
  client: SupabaseClient,
  userId: string
): Promise<AccessStatus> {
  const access = await getUserAccess(client, userId);
  if (!access) {
    return {
      hasAccess: false,
      isAdmin: false,
      invitesRemaining: 0,
      invites: [],
    };
  }

  const invites = await listInviteCodes(client, userId);
  return {
    hasAccess: true,
    isAdmin: access.is_admin,
    invitesRemaining: access.invites_remaining,
    invites,
  };
}

async function insertUniqueInviteCode(
  serviceClient: SupabaseClient,
  params: {
    creatorUserId: string;
    createdByAdmin: boolean;
  }
): Promise<InviteCode> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateInviteCode();
    const { data, error } = await serviceClient
      .from('invite_codes')
      .insert({
        code,
        creator_user_id: params.creatorUserId,
        created_by_admin: params.createdByAdmin,
      })
      .select('*')
      .single();

    if (!error && data) {
      return data as InviteCode;
    }

    if (error?.code !== '23505') {
      throw error ?? new Error('Could not create invite code.');
    }
  }

  throw new Error('Could not create invite code. Please try again.');
}

export async function grantAdminAccess(
  serviceClient: SupabaseClient,
  userId: string,
  email: string
): Promise<UserAccess> {
  const existing = await getUserAccess(serviceClient, userId);
  if (existing) {
    if (!existing.is_admin) {
      const { data, error } = await serviceClient
        .from('user_access')
        .update({
          is_admin: true,
          invites_remaining: ADMIN_INVITES_REMAINING,
        })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return data as UserAccess;
    }

    return existing;
  }

  const { data, error } = await serviceClient
    .from('user_access')
    .insert({
      user_id: userId,
      email,
      is_admin: true,
      invites_remaining: ADMIN_INVITES_REMAINING,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as UserAccess;
}

export async function redeemInviteCode(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    email: string;
    code: string;
  }
): Promise<UserAccess> {
  const existing = await getUserAccess(serviceClient, params.userId);
  if (existing) return existing;

  const normalizedCode = normalizeInviteCode(params.code);
  if (!normalizedCode) {
    throw new Error('Enter a valid invite code.');
  }

  const { data: invite, error: inviteError } = await serviceClient
    .from('invite_codes')
    .select('*')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) {
    throw new Error('That invite code is not valid.');
  }

  if (invite.redeemed_by_user_id) {
    throw new Error('This invite code has already been used.');
  }

  const { data: access, error: accessError } = await serviceClient
    .from('user_access')
    .insert({
      user_id: params.userId,
      email: params.email,
      invited_by_user_id: invite.creator_user_id,
      invite_code_id: invite.id,
      invites_remaining: INVITES_PER_USER,
    })
    .select('*')
    .single();

  if (accessError) throw accessError;

  const { error: redeemError } = await serviceClient
    .from('invite_codes')
    .update({
      redeemed_by_user_id: params.userId,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', invite.id)
    .is('redeemed_by_user_id', null);

  if (redeemError) throw redeemError;

  return access as UserAccess;
}

export async function bootstrapUserAccess(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    email: string;
    inviteCode?: string | null;
  }
): Promise<AccessStatus> {
  const existing = await getUserAccess(serviceClient, params.userId);
  if (existing) {
    if (isAdminEmail(params.email) && !existing.is_admin) {
      await grantAdminAccess(serviceClient, params.userId, params.email);
    }
    return buildAccessStatus(serviceClient, params.userId);
  }

  if (isAdminEmail(params.email)) {
    await grantAdminAccess(serviceClient, params.userId, params.email);
    return buildAccessStatus(serviceClient, params.userId);
  }

  if (!params.inviteCode?.trim()) {
    throw new Error('An invite code is required to join Soulmate AI.');
  }

  await redeemInviteCode(serviceClient, {
    userId: params.userId,
    email: params.email,
    code: params.inviteCode,
  });

  return buildAccessStatus(serviceClient, params.userId);
}

export async function createInviteForUser(
  serviceClient: SupabaseClient,
  userId: string
): Promise<{ invite: InviteCode; access: UserAccess }> {
  const access = await getUserAccess(serviceClient, userId);
  if (!access) {
    throw new Error('You do not have access yet.');
  }

  if (!access.is_admin && access.invites_remaining <= 0) {
    throw new Error('You have used all 5 invites.');
  }

  const invite = await insertUniqueInviteCode(serviceClient, {
    creatorUserId: userId,
    createdByAdmin: access.is_admin,
  });

  if (access.is_admin) {
    return { invite, access };
  }

  const { data: updatedAccess, error } = await serviceClient
    .from('user_access')
    .update({
      invites_remaining: access.invites_remaining - 1,
    })
    .eq('user_id', userId)
    .gt('invites_remaining', 0)
    .select('*')
    .single();

  if (error || !updatedAccess) {
    throw new Error('You have used all 5 invites.');
  }

  return { invite, access: updatedAccess as UserAccess };
}
