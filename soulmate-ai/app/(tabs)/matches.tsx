import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchCard } from '@/components/match-card';
import { MatchProfileModal } from '@/components/match-profile-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme } from '@/constants/chat-theme';
import { useChatIntent } from '@/contexts/chat-intent-context';
import { useAuth } from '@/contexts/auth-context';
import { useMatches } from '@/hooks/use-matches';
import { buildAskWhyPrompt } from '@/lib/matches/match-prompts';
import type { MatchRecommendation } from '@/types/match';

export default function MatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setChatIntent } = useChatIntent();
  const { sections, hasMatches, isLoading, saveMatch, passMatch, requestIntro } = useMatches(
    user?.id
  );
  const [profileMatch, setProfileMatch] = useState<MatchRecommendation | null>(null);

  function handleAskWhy(match: MatchRecommendation) {
    setChatIntent({
      prompt: buildAskWhyPrompt(match),
      newConversation: true,
    });
    router.push('/chat');
  }

  function handlePass(match: MatchRecommendation) {
    Alert.alert(`Pass on ${match.name}?`, 'You can still get new thoughtful introductions later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pass',
        style: 'destructive',
        onPress: () => {
          void passMatch(match.id);
        },
      },
    ]);
  }

  function handleRequestIntro(match: MatchRecommendation) {
    Alert.alert(
      `Request intro to ${match.name}?`,
      'Your AI will send a thoughtful introduction request. You will be notified when they respond.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Intro',
          onPress: () => {
            void requestIntro(match.id);
          },
        },
      ]
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Please sign in to view your matches.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push('/chat')}
            accessibilityLabel="Back to chat">
            <Ionicons name="chevron-back" size={24} color={ChatTheme.sidebarText} />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Matches</ThemedText>

          <View style={styles.headerIconButton} />
        </View>

        <View style={styles.introBlock}>
          <Ionicons name="heart-outline" size={18} color={ChatTheme.accent} />
          <ThemedText style={styles.introText}>
            Thoughtful introductions curated by your AI — no endless scrolling, just people worth
            meeting.
          </ThemedText>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ChatTheme.accent} size="large" />
          </View>
        ) : !hasMatches ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={28} color={ChatTheme.accent} />
            </View>
            <ThemedText style={styles.emptyTitle}>No introductions yet</ThemedText>
            <ThemedText style={styles.emptyBody}>
              Your AI is still learning about you. As your profile becomes richer, thoughtful
              introductions will appear here.
            </ThemedText>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            )}
            renderItem={({ item }) => (
              <MatchCard
                match={item}
                onViewProfile={setProfileMatch}
                onAskWhy={handleAskWhy}
                onSave={(match) => void saveMatch(match.id)}
                onPass={handlePass}
                onRequestIntro={handleRequestIntro}
              />
            )}
            SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
            ItemSeparatorComponent={() => <View style={styles.itemGap} />}
          />
        )}
      </SafeAreaView>

      <MatchProfileModal
        match={profileMatch}
        visible={profileMatch !== null}
        onClose={() => setProfileMatch(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ChatTheme.pageBg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  introBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8F6FF',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: ChatTheme.sidebarMuted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionGap: {
    height: 18,
  },
  itemGap: {
    height: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEFF',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 23,
    color: ChatTheme.sidebarMuted,
    textAlign: 'center',
  },
});
