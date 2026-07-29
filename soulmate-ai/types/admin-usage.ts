export type AdminUsageUserRow = {
  userId: string;
  email: string | null;
  lastSignInAt: string | null;
  messagesToday: number;
  messagesLast7Days: number;
};

export type AdminUsageStats = {
  generatedAt: string;
  totalUsers: number;
  activeUsersToday: number;
  messagesToday: number;
  activeUsersLast7Days: number;
  messagesLast7Days: number;
  recentUsers: AdminUsageUserRow[];
};
