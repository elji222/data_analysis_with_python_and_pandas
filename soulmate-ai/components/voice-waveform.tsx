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
  const barColor = isDark ? ChatTheme.sidebarMutedDark : '#7A7A7A';

  const normalizedLevels =
    levels.length === VOICE_WAVEFORM_BAR_COUNT
      ? levels
      : Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => levels[index] ?? 0.12);

  return (
    <View style={styles.container}>
      {normalizedLevels.map((level, index) => {
        const height = 3 + level * 26;

        return (
          <View
            key={`wave-${index}`}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: barColor,
                opacity: level > 0.18 ? 0.95 : 0.35,
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
    gap: 2,
    minHeight: 30,
    paddingHorizontal: 6,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
