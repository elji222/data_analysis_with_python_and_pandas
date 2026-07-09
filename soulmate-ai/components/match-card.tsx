import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { MATCH_STRENGTH_LABELS } from '@/lib/matches/match-labels';
import type { MatchRecommendation } from '@/types/match';

type MatchCardProps = {
  match: MatchRecommendation;
  onViewProfile: (match: MatchRecommendation) => void;
  onAskWhy: (match: MatchRecommendation) => void;
  onSave: (match: MatchRecommendation) => void;
  onPass: (match: MatchRecommendation) => void;
  onRequestIntro: (match: MatchRecommendation) => void;
};

function MatchMetaLine({ match }: { match: MatchRecommendation }) {
  const parts = [match.age ? `${match.age}` : null, match.location ?? null].filter(Boolean);

  if (!parts.length) return null;

  return <ThemedText style={styles.meta}>{parts.join(' · ')}</ThemedText>;
}

export function MatchCard({
  match,
  onViewProfile,
  onAskWhy,
  onSave,
  onPass,
  onRequestIntro,
}: MatchCardProps) {
  const showSave = match.status === 'new';
  const showPass = match.status === 'new' || match.status === 'saved';
  const showRequestIntro = match.status === 'new' || match.status === 'saved';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <ThemedText style={styles.name}>{match.name}</ThemedText>
          <MatchMetaLine match={match} />
        </View>
        <View style={styles.strengthBadge}>
          <Ionicons name="sparkles" size={14} color={ChatTheme.accent} />
          <ThemedText style={styles.strengthText}>
            {MATCH_STRENGTH_LABELS[match.matchStrength]}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.summary}>{match.compatibilitySummary}</ThemedText>

      <View style={styles.reasons}>
        {match.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <ThemedText style={styles.reasonText}>{reason}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => onViewProfile(match)}>
          <ThemedText style={styles.primaryButtonText}>View Profile</ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => onAskWhy(match)}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={ChatTheme.sidebarText} />
          <ThemedText style={styles.secondaryButtonText}>Ask AI Why</ThemedText>
        </Pressable>
      </View>

      <View style={styles.footerActions}>
        {showSave ? (
          <Pressable
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            onPress={() => onSave(match)}>
            <Ionicons name="bookmark-outline" size={16} color={ChatTheme.sidebarMuted} />
            <ThemedText style={styles.textActionLabel}>Save</ThemedText>
          </Pressable>
        ) : null}

        {showPass ? (
          <Pressable
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            onPress={() => onPass(match)}>
            <Ionicons name="close-circle-outline" size={16} color={ChatTheme.sidebarMuted} />
            <ThemedText style={styles.textActionLabel}>Pass</ThemedText>
          </Pressable>
        ) : null}

        {showRequestIntro ? (
          <Pressable
            style={({ pressed }) => [styles.introButton, pressed && styles.pressed]}
            onPress={() => onRequestIntro(match)}>
            <ThemedText style={styles.introButtonText}>Request Intro</ThemedText>
          </Pressable>
        ) : null}

        {match.status === 'waiting' ? (
          <View style={styles.statusPill}>
            <ThemedText style={styles.statusPillText}>Intro requested</ThemedText>
          </View>
        ) : null}

        {match.status === 'active' ? (
          <View style={[styles.statusPill, styles.statusPillActive]}>
            <ThemedText style={[styles.statusPillText, styles.statusPillTextActive]}>
              Active introduction
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ChatTheme.sidebarBorder,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  meta: {
    fontSize: 14,
    color: ChatTheme.sidebarMuted,
  },
  strengthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
    maxWidth: '46%',
  },
  strengthText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: ChatTheme.accent,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: ChatTheme.sidebarText,
  },
  reasons: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: ChatTheme.accent,
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: ChatTheme.sidebarMuted,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ChatTheme.sendButton,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ChatTheme.sidebarHover,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: ChatTheme.sidebarText,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textActionLabel: {
    fontSize: 14,
    color: ChatTheme.sidebarMuted,
  },
  introButton: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ChatTheme.accent,
  },
  introButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ChatTheme.accent,
  },
  statusPill: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ChatTheme.sidebarHover,
  },
  statusPillActive: {
    backgroundColor: '#EAF7EE',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ChatTheme.sidebarMuted,
  },
  statusPillTextActive: {
    color: '#2F7A45',
  },
  pressed: {
    opacity: 0.75,
  },
});
