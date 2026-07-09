export type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  looking_for: string | null;
  discoverable: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type UserProfileRow = UserProfile;
