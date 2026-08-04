export type AdminUsageUserRow = {
  userId: string;
  email: string | null;
  lastSignInAt: string | null;
  messagesToday: number;
  messagesLast7Days: number;
};

export type AdminTokenUsageUserRow = {
  userId: string;
  email: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
};

export type AdminUsageStats = {
  generatedAt: string;
  totalUsers: number;
  activeUsersToday: number;
  messagesToday: number;
  activeUsersLast7Days: number;
  messagesLast7Days: number;
  recentUsers: AdminUsageUserRow[];
  /** Sum of tokens across all users in the last 24 hours. */
  tokensLast24Hours: number;
  /** Distinct users with recorded token usage in the last 24 hours. */
  tokenUsersLast24Hours: number;
  /** Per-user token totals for the last 24 hours, highest first. */
  tokenUsageLast24Hours: AdminTokenUsageUserRow[];
};
