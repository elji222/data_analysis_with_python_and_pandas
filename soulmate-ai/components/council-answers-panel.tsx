import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import type { CouncilAnswer, CouncilReview } from '@/types/chat';

type CouncilAnswersPanelProps = {
  review: CouncilReview;
};

function CouncilAnswerRow({ answer }: { answer: CouncilAnswer }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.rowHeader, pressed && styles.pressed]}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Hide' : 'Show'} ${answer.modelLabel} answer`}>
        <View style={styles.rowTitle}>
          <ThemedText style={styles.rank}>#{answer.rank}</ThemedText>
          <ThemedText style={styles.modelLabel}>{answer.modelLabel}</ThemedText>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={ChatTheme.sidebarMuted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.rowBody}>
          <ThemedText style={styles.answerText}>{answer.answer}</ThemedText>

          {answer.critiques.length > 0 ? (
            <View style={styles.critiques}>
              <ThemedText style={styles.critiquesTitle}>What the others said</ThemedText>
              {answer.critiques.map((critique) => (
                <View key={`${critique.fromModelId}-${critique.text.slice(0, 24)}`} style={styles.critiqueCard}>
                  <ThemedText style={styles.critiqueFrom}>{critique.fromModelLabel}</ThemedText>
                  <ThemedText style={styles.critiqueText}>{critique.text}</ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.noCritiques}>No critiques from the other models.</ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function CouncilAnswersPanel({ review }: CouncilAnswersPanelProps) {
  if (review.answers.length === 0) return null;

  return (
    <View style={styles.panel}>
      <ThemedText style={styles.panelTitle}>Council answers</ThemedText>
      {review.answers.map((answer) => (
        <CouncilAnswerRow key={answer.modelId} answer={answer} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ChatTheme.inputBorder,
    paddingTop: 12,
    gap: 6,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ChatTheme.sidebarMuted,
    marginBottom: 4,
  },
  row: {
    borderRadius: 12,
    backgroundColor: '#F7F7F8',
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rank: {
    fontSize: 12,
    fontWeight: '700',
    color: ChatTheme.sidebarMuted,
    minWidth: 22,
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  rowBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 12,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    color: ChatTheme.assistantText,
  },
  critiques: {
    gap: 8,
  },
  critiquesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: ChatTheme.sidebarMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  critiqueCard: {
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  critiqueFrom: {
    fontSize: 13,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  critiqueText: {
    fontSize: 14,
    lineHeight: 20,
    color: ChatTheme.sidebarMuted,
  },
  noCritiques: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
