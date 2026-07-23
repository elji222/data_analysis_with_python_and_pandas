export type UserAccess = {
  user_id: string;
  email: string;
  is_admin: boolean;
  invited_by_user_id: string | null;
  invite_code_id: string | null;
  invites_remaining: number;
  granted_at: string;
};

export type InviteCode = {
  id: string;
  code: string;
  creator_user_id: string | null;
  created_by_admin: boolean;
  redeemed_by_user_id: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type AccessStatus = {
  hasAccess: boolean;
  isAdmin: boolean;
  invitesRemaining: number;
  invites: InviteCode[];
};
