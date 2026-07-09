import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { MatchRecommendation } from '@/types/match';

type MatchProfileModalProps = {
  match: MatchRecommendation | null;
  visible: boolean;
  onClose: () => void;
};

export function MatchProfileModal({ match, visible, onClose }: MatchProfileModalProps) {
  if (!match) return null;

  const profile = match.profile;
  const visibilityLabel =
    profile?.visibility === 'public'
      ? 'Public profile'
      : profile?.visibility === 'friends'
        ? 'Friends visibility'
        : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{match.name}</ThemedText>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close profile">
              <Ionicons name="close" size={22} color={ChatTheme.sidebarText} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {(match.age || match.location) && (
              <ThemedText style={styles.meta}>
                {[match.age, match.location].filter(Boolean).join(' · ')}
              </ThemedText>
            )}

            {visibilityLabel ? (
              <View style={styles.visibilityPill}>
                <Ionicons
                  name={profile?.visibility === 'public' ? 'earth-outline' : 'people-outline'}
                  size={14}
                  color={ChatTheme.sidebarMuted}
                />
                <ThemedText style={styles.visibilityText}>{visibilityLabel}</ThemedText>
              </View>
            ) : null}

            <ThemedText style={styles.sectionLabel}>About</ThemedText>
            <ThemedText style={styles.bodyText}>
              {profile?.bio ?? match.compatibilitySummary}
            </ThemedText>

            {profile?.lookingFor ? (
              <>
                <ThemedText style={styles.sectionLabel}>Looking for</ThemedText>
                <ThemedText style={styles.bodyText}>{profile.lookingFor}</ThemedText>
              </>
            ) : null}

            {profile?.interests?.length ? (
              <>
                <ThemedText style={styles.sectionLabel}>Interests</ThemedText>
                <View style={styles.interestRow}>
                  {profile.interests.map((interest) => (
                    <View key={interest} style={styles.interestChip}>
                      <ThemedText style={styles.interestText}>{interest}</ThemedText>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: ChatTheme.sidebarHover,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  meta: {
    fontSize: 15,
    color: ChatTheme.sidebarMuted,
  },
  visibilityPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: ChatTheme.sidebarHover,
  },
  visibilityText: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
  sectionLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: ChatTheme.sidebarMuted,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: ChatTheme.sidebarText,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3EEFF',
  },
  interestText: {
    fontSize: 13,
    fontWeight: '500',
    color: ChatTheme.accent,
  },
});
