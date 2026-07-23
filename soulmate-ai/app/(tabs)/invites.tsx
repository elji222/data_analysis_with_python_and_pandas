import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRODUCTION_CHAT_URL } from '@/constants/app-urls';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { useInvites } from '@/hooks/use-invites';
import { useMobileChatLayout } from '@/hooks/use-mobile-chat-layout';
import { formatInviteCode } from '@/lib/access/invite-code';
import type { InviteCode } from '@/types/access';

function buildInviteLink(code: string) {
  const base = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_CHAT_URL;
  return `${base}/login?invite=${code}`;
}

function InviteRow({
  invite,
  onCopy,
}: {
  invite: InviteCode;
  onCopy: (value: string) => void;
}) {
  const isUsed = Boolean(invite.redeemed_by_user_id);
  const displayCode = formatInviteCode(invite.code);

  return (
    <View style={styles.inviteRow}>
      <View style={styles.inviteRowMain}>
        <ThemedText style={styles.inviteCode}>{displayCode}</ThemedText>
        <ThemedText style={styles.inviteMeta}>
          {isUsed ? 'Used' : 'Available'}
          {invite.redeemed_at ? ` · ${new Date(invite.redeemed_at).toLocaleDateString()}` : ''}
        </ThemedText>
      </View>
      {!isUsed ? (
        <Pressable
          style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
          onPress={() => onCopy(buildInviteLink(invite.code))}>
          <Ionicons name="copy-outline" size={18} color={ChatTheme.sidebarText} />
          <ThemedText style={styles.copyButtonText}>Copy link</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function InvitesScreen() {
  const router = useRouter();
  const { session, accessStatus } = useAuth();
  const isMobileChatLayout = useMobileChatLayout();
  const { status, isLoading, error, createInviteCode } = useInvites(session?.access_token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const invitesRemaining = status?.invitesRemaining ?? accessStatus?.invitesRemaining ?? 0;
  const isAdmin = status?.isAdmin ?? accessStatus?.isAdmin ?? false;
  const invites = status?.invites ?? [];

  async function handleCreateInvite() {
    try {
      setIsCreating(true);
      setActionError(null);
      const invite = await createInviteCode();
      await handleCopy(buildInviteLink(invite.code));
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Could not create invite.';
      setActionError(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy(value: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      setCopiedMessage('Invite link copied.');
    } else {
      await Share.share({ message: value });
      setCopiedMessage('Invite link ready to share.');
    }
    setTimeout(() => setCopiedMessage(null), 2500);
  }

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
            <ThemedText type="title">Invite friends</ThemedText>
            <ThemedText style={styles.subtitle}>
              {isAdmin
                ? 'You are an admin and can invite unlimited friends.'
                : `You have ${invitesRemaining} invite${invitesRemaining === 1 ? '' : 's'} left.`}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryTitle}>How it works</ThemedText>
            <ThemedText style={styles.summaryText}>
              Each member can invite up to 5 friends. Share a link below — your friend signs in
              with Google using that code.
            </ThemedText>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.pressed,
              (isCreating || (!isAdmin && invitesRemaining <= 0)) && styles.disabled,
            ]}
            disabled={isCreating || (!isAdmin && invitesRemaining <= 0)}
            onPress={() => void handleCreateInvite()}>
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.createButtonText}>Create invite link</ThemedText>
              </>
            )}
          </Pressable>

          {copiedMessage ? <ThemedText style={styles.successText}>{copiedMessage}</ThemedText> : null}
          {actionError || error ? (
            <ThemedText style={styles.errorText}>{actionError ?? error}</ThemedText>
          ) : null}

          <ThemedText style={styles.sectionTitle}>Your invites</ThemedText>

          {isLoading ? (
            <ActivityIndicator color={ChatTheme.accent} style={styles.loader} />
          ) : invites.length === 0 ? (
            <ThemedText style={styles.emptyText}>No invites created yet.</ThemedText>
          ) : (
            invites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} onCopy={(value) => void handleCopy(value)} />
            ))
          )}
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
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: ChatTheme.sidebarHover,
    gap: 8,
  },
  summaryTitle: {
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  summaryText: {
    color: ChatTheme.sidebarMuted,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ChatTheme.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
    marginTop: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ChatTheme.sidebarBorder,
  },
  inviteRowMain: {
    flex: 1,
    gap: 4,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    color: ChatTheme.sidebarText,
  },
  inviteMeta: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: ChatTheme.sidebarHover,
  },
  copyButtonText: {
    fontSize: 13,
    color: ChatTheme.sidebarText,
    fontWeight: '500',
  },
  emptyText: {
    color: ChatTheme.sidebarMuted,
    opacity: 0.8,
  },
  loader: {
    marginTop: 12,
  },
  successText: {
    color: '#2E8B57',
    textAlign: 'center',
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
