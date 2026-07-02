import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';

type TextSegment = {
  text: string;
  bold: boolean;
};

function parseBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

type FormattedMessageTextProps = TextProps & {
  text: string;
  lightColor?: string;
  darkColor?: string;
  style?: TextStyle;
  suffix?: ReactNode;
};

export function FormattedMessageText({
  text,
  lightColor,
  darkColor,
  style,
  suffix,
  ...rest
}: FormattedMessageTextProps) {
  const segments = parseBoldSegments(text);

  return (
    <ThemedText lightColor={lightColor} darkColor={darkColor} style={style} {...rest}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={`${index}-${segment.text}`} style={styles.bold}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        )
      )}
      {suffix}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
});
