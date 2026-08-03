import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import {
  parseCritiqueSegments,
  parseCritiqueStructure,
} from '@/lib/parse-critique-segments';
import type { CouncilAnswer, CouncilReview } from '@/types/chat';

type CouncilAnswersPanelProps = {
  review: CouncilReview;
};

function CritiqueRichText({ text, style }: { text: string; style?: object }) {
  const segments = parseCritiqueSegments(text);

  return (
    <Text style={[styles.critiqueText, style]}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={`${index}-${segment.text.slice(0, 24)}`} style={styles.critiqueHighlight}>
            {segment.text}
          </Text>
        ) : (
          <Text key={`${index}-${segment.text.slice(0, 24)}`}>{segment.text}</Text>
        )
      )}
    </Text>
  );
}

function CritiqueBody({ text }: { text: string }) {
  const { summary, bullets } = parseCritiqueStructure(text);

  if (bullets.length === 0) {
    return <CritiqueRichText text={summary || text} />;
  }

  return (
    <View style={styles.critiqueBody}>
      {summary ? <CritiqueRichText text={summary} /> : null}
      <View style={styles.bulletList}>
        {bullets.map((bullet, index) => (
          <View key={`${index}-${bullet.slice(0, 24)}`} style={styles.bulletRow}>
            <Text style={styles.bulletMarker}>•</Text>
            <CritiqueRichText text={bullet} style={styles.bulletText} />
          </View>
        ))}
      </View>
    </View>
  );
}

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
                <View
                  key={`${critique.fromModelId}-${critique.text.slice(0, 24)}`}
                  style={styles.critiqueCard}>
                  <ThemedText style={styles.critiqueFrom}>{critique.fromModelLabel}</ThemedText>
                  <CritiqueBody text={critique.text} />
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
    gap: 6,
  },
  critiqueFrom: {
    fontSize: 13,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  critiqueBody: {
    gap: 8,
  },
  critiqueText: {
    fontSize: 14,
    lineHeight: 20,
    color: ChatTheme.sidebarMuted,
  },
  critiqueHighlight: {
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletMarker: {
    fontSize: 14,
    lineHeight: 20,
    color: ChatTheme.sidebarText,
    fontWeight: '700',
    width: 10,
  },
  bulletText: {
    flex: 1,
  },
  noCritiques: {
    fontSize: 13,
    color: ChatTheme.sidebarMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
