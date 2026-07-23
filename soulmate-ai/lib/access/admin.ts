export const INVITES_PER_USER = 5;
export const ADMIN_INVITES_REMAINING = 999_999;

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? process.env.SOULMATE_ADMIN_EMAIL ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
