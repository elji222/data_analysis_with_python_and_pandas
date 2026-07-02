import { useColorScheme } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ChatTheme } from '@/constants/chat-theme';
import { VOICE_WAVEFORM_BAR_COUNT } from '@/hooks/use-voice-input';

type VoiceWaveformProps = {
  levels: number[];
};

export function VoiceWaveform({ levels }: VoiceWaveformProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const barColor = isDark ? ChatTheme.sidebarMutedDark : '#8E8E8E';

  const normalizedLevels =
    levels.length === VOICE_WAVEFORM_BAR_COUNT
      ? levels
      : Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => levels[index] ?? 0.14);

  return (
    <View style={styles.container}>
      {normalizedLevels.map((level, index) => {
        const height = 4 + level * 22;

        return (
          <View
            key={`wave-${index}`}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: barColor,
                opacity: level > 0.2 ? 0.95 : 0.45,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 28,
    paddingHorizontal: 8,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
