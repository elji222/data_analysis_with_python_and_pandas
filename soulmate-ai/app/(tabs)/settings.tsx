import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { useBilling } from '@/hooks/use-billing';
import { useMobileChatLayout } from '@/hooks/use-mobile-chat-layout';
import { openBillingPortal, startCheckout, updateFreeAccessForAll } from '@/services/billing-api';
import { fetchAdminUsageStats } from '@/services/admin-api';
import type { AdminUsageStats } from '@/types/admin-usage';

function formatRenewalDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatUsageTimestamp(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const { session } = useAuth();
  const isMobileChatLayout = useMobileChatLayout();
  const { status, isLoading, error, refresh } = useBilling(session?.access_token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingAccessMode, setIsUpdatingAccessMode] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<AdminUsageStats | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  useEffect(() => {
    if (params.checkout === 'success') {
      setBannerMessage('Payment received. Your subscription should activate in a few seconds.');
      void refresh();
    } else if (params.checkout === 'canceled') {
      setBannerMessage('Checkout canceled. You can subscribe whenever you are ready.');
    }
  }, [params.checkout, refresh]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken || !status?.isAdmin) {
      setUsageStats(null);
      return;
    }

    let cancelled = false;

    async function loadUsage() {
      try {
        setIsUsageLoading(true);
        setUsageError(null);
        const stats = await fetchAdminUsageStats(accessToken);
        if (!cancelled) {
          setUsageStats(stats);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Could not load usage stats.';
          setUsageError(message);
        }
      } finally {
        if (!cancelled) {
          setIsUsageLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, status?.isAdmin]);

  async function openStripeUrl(url: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = url;
      return;
    }

    await Linking.openURL(url);
  }

  async function handleSubscribe() {
    if (!session?.access_token) return;

    try {
      setIsSubmitting(true);
      setActionError(null);
      const url = await startCheckout(session.access_token);
      await openStripeUrl(url);
    } catch (subscribeError) {
      const message =
        subscribeError instanceof Error ? subscribeError.message : 'Could not start checkout.';
      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleManageBilling() {
    if (!session?.access_token) return;

    try {
      setIsSubmitting(true);
      setActionError(null);
      const url = await openBillingPortal(session.access_token);
      await openStripeUrl(url);
    } catch (portalError) {
      const message =
        portalError instanceof Error ? portalError.message : 'Could not open billing portal.';
      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleFreeAccess(nextValue: boolean) {
    if (!session?.access_token) return;

    try {
      setIsUpdatingAccessMode(true);
      setActionError(null);
      const nextStatus = await updateFreeAccessForAll(session.access_token, nextValue);
      await refresh();
      setBannerMessage(
        nextStatus.freeAccessForAll
          ? 'Free access is now enabled for all users. Subscribe remains available in Settings.'
          : 'Paid access restored. Users need an active subscription again.'
      );
    } catch (toggleError) {
      const message =
        toggleError instanceof Error ? toggleError.message : 'Could not update free access mode.';
      setActionError(message);
    } finally {
      setIsUpdatingAccessMode(false);
    }
  }

  const isActive = Boolean(status?.hasActiveSubscription);
  const isComplimentary = Boolean(status?.isComplimentary);
  const isAdmin = Boolean(status?.isAdmin);
  const freeAccessForAll = Boolean(status?.freeAccessForAll);
  const renewalDate = formatRenewalDate(status?.subscription?.current_period_end);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {isMobileChatLayout ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={ChatTheme.sidebarText} />
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            <ThemedText type="title">Settings</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your Soulmate AI subscription</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {bannerMessage ? <ThemedText style={styles.banner}>{bannerMessage}</ThemedText> : null}

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Soulmate AI Pro</ThemedText>
            <ThemedText style={styles.price}>{status?.priceLabel ?? '$9.99/month'}</ThemedText>
            <ThemedText style={styles.cardText}>
              Unlimited chat, memory, and matches after you subscribe with Stripe.
            </ThemedText>

            {isLoading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={ChatTheme.accent} style={styles.loader} />
                <ThemedText style={styles.loadingText}>Checking subscription...</ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.statusPill}>
                  <ThemedText style={styles.statusText}>
                    {isComplimentary
                      ? 'Admin access (complimentary)'
                      : freeAccessForAll
                        ? 'Free access enabled'
                        : isActive
                          ? `Active${renewalDate ? ` · renews ${renewalDate}` : ''}`
                          : 'Not subscribed'}
                  </ThemedText>
                </View>

                {isComplimentary ? (
                  <ThemedText style={styles.helperText}>
                    Your admin account has full access without billing.
                  </ThemedText>
                ) : freeAccessForAll ? (
                  <ThemedText style={styles.helperText}>
                    Soulmate AI is currently free for everyone. You can still subscribe below to
                    support the app.
                  </ThemedText>
                ) : !status?.stripeConfigured ? (
                  <ThemedText style={styles.helperText}>
                    Stripe is not configured on the live server yet. Check that STRIPE_SECRET_KEY in .env
                    is your Stripe key (sk_test_... or sk_live_...), not your Anthropic key, then run
                    DEPLOY.cmd again.
                  </ThemedText>
                ) : isActive && status?.subscription ? (
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    disabled={isSubmitting}
                    onPress={() => void handleManageBilling()}>
                    <ThemedText style={styles.secondaryButtonText}>Manage billing</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                      isSubmitting && styles.disabled,
                    ]}
                    disabled={isSubmitting || isLoading || !status?.stripeConfigured}
                    onPress={() => void handleSubscribe()}>
                    {isSubmitting ? (
                      <View style={styles.submittingBlock}>
                        <ActivityIndicator color="#FFFFFF" />
                        <ThemedText style={styles.submittingText}>Opening Stripe...</ThemedText>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                        <ThemedText style={styles.primaryButtonText}>
                          {freeAccessForAll ? 'Subscribe to support Soulmate AI' : 'Subscribe with Stripe'}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>

          {isAdmin ? (
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>Usage overview</ThemedText>
              <ThemedText style={styles.cardText}>
                Signed-in users with cloud-synced chat activity. Times are shown in your local
                timezone.
              </ThemedText>

              {isUsageLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={ChatTheme.accent} style={styles.loader} />
                  <ThemedText style={styles.loadingText}>Loading usage...</ThemedText>
                </View>
              ) : usageError ? (
                <ThemedText style={styles.errorText}>{usageError}</ThemedText>
              ) : usageStats ? (
                <>
                  <View style={styles.statsGrid}>
                    <View style={styles.statTile}>
                      <ThemedText style={styles.statValue}>{usageStats.activeUsersToday}</ThemedText>
                      <ThemedText style={styles.statLabel}>Active today</ThemedText>
                    </View>
                    <View style={styles.statTile}>
                      <ThemedText style={styles.statValue}>{usageStats.messagesToday}</ThemedText>
                      <ThemedText style={styles.statLabel}>Messages today</ThemedText>
                    </View>
                    <View style={styles.statTile}>
                      <ThemedText style={styles.statValue}>{usageStats.activeUsersLast7Days}</ThemedText>
                      <ThemedText style={styles.statLabel}>Active 7 days</ThemedText>
                    </View>
                    <View style={styles.statTile}>
                      <ThemedText style={styles.statValue}>{usageStats.totalUsers}</ThemedText>
                      <ThemedText style={styles.statLabel}>Total users</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.sectionLabel}>Recent users</ThemedText>
                  {usageStats.recentUsers.length === 0 ? (
                    <ThemedText style={styles.helperText}>No signed-in users yet.</ThemedText>
                  ) : (
                    usageStats.recentUsers.map((row) => (
                      <View key={row.userId} style={styles.usageRow}>
                        <View style={styles.usageRowCopy}>
                          <ThemedText style={styles.usageEmail}>{row.email ?? 'Unknown user'}</ThemedText>
                          <ThemedText style={styles.helperText}>
                            Last sign-in: {formatUsageTimestamp(row.lastSignInAt)}
                          </ThemedText>
                        </View>
                        <View style={styles.usageCounts}>
                          <ThemedText style={styles.usageCount}>{row.messagesToday} today</ThemedText>
                          <ThemedText style={styles.helperText}>{row.messagesLast7Days} this week</ThemedText>
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : null}
            </View>
          ) : null}

          {isAdmin ? (
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>Admin access mode</ThemedText>
              <ThemedText style={styles.cardText}>
                Turn on free access for everyone while keeping Stripe subscriptions available in
                Settings.
              </ThemedText>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <ThemedText style={styles.toggleTitle}>Free access for all users</ThemedText>
                  <ThemedText style={styles.helperText}>
                    {freeAccessForAll
                      ? 'All signed-in users can chat without paying.'
                      : 'Users need an active subscription to use Soulmate AI.'}
                  </ThemedText>
                </View>
                <Switch
                  value={freeAccessForAll}
                  disabled={isUpdatingAccessMode || isLoading}
                  onValueChange={(value) => void handleToggleFreeAccess(value)}
                  trackColor={{ false: '#D9D9D9', true: ChatTheme.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ) : null}

          {(actionError || error) && !isLoading ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{actionError ?? error}</ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <LogoutButton variant="row" />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  banner: {
    color: '#2E8B57',
    textAlign: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: ChatTheme.sidebarHover,
    gap: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: ChatTheme.accent,
  },
  cardText: {
    color: ChatTheme.sidebarMuted,
    lineHeight: 22,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  helperText: {
    color: ChatTheme.sidebarMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  statLabel: {
    color: ChatTheme.sidebarMuted,
  },
  sectionLabel: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
    marginTop: 4,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  usageRowCopy: {
    flex: 1,
    gap: 2,
  },
  usageEmail: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  usageCounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  usageCount: {
    fontWeight: '600',
    color: ChatTheme.accent,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ChatTheme.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ChatTheme.sidebarBorder,
  },
  secondaryButtonText: {
    color: ChatTheme.sidebarText,
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginTop: 8,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: ChatTheme.sidebarMuted,
    textAlign: 'center',
  },
  submittingBlock: {
    alignItems: 'center',
    gap: 8,
  },
  submittingText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F3C2C2',
  },
  errorText: {
    color: ChatTheme.error,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ChatTheme.sidebarBorder,
    paddingTop: 4,
    paddingBottom: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
