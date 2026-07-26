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
import { openBillingPortal, startCheckout } from '@/services/billing-api';

function formatRenewalDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.checkout === 'success') {
      setBannerMessage('Payment received. Your subscription should activate in a few seconds.');
      void refresh();
    } else if (params.checkout === 'canceled') {
      setBannerMessage('Checkout canceled. You can subscribe whenever you are ready.');
    }
  }, [params.checkout, refresh]);

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

  const isActive = Boolean(status?.hasActiveSubscription);
  const isComplimentary = Boolean(status?.isComplimentary);
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
                      : isActive
                        ? `Active${renewalDate ? ` · renews ${renewalDate}` : ''}`
                        : 'Not subscribed'}
                  </ThemedText>
                </View>

                {isComplimentary ? (
                  <ThemedText style={styles.helperText}>
                    Your admin account has full access without billing.
                  </ThemedText>
                ) : !status?.stripeConfigured ? (
                  <ThemedText style={styles.helperText}>
                    Stripe is not configured on the live server yet. Run DEPLOY.cmd after saving your
                    Stripe keys in .env.
                  </ThemedText>
                ) : isActive ? (
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
                        <ThemedText style={styles.primaryButtonText}>Subscribe with Stripe</ThemedText>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>

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
