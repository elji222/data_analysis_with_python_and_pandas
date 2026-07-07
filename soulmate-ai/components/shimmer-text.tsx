import { useEffect } from 'react';
import { Platform, StyleSheet, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme } from '@/constants/chat-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SHIMMER_STYLE_ID = 'soulmate-shimmer-keyframes';
const SHIMMER_DURATION_MS = 2400;

type ShimmerTextProps = {
  children: string;
  style?: TextStyle;
};

function ensureShimmerKeyframes() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(SHIMMER_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes soulmate-text-shimmer {
      0% { background-position: 120% 0; }
      100% { background-position: -120% 0; }
    }
  `;
  document.head.appendChild(style);
}

function WebShimmerText({ children, style, isDark }: ShimmerTextProps & { isDark: boolean }) {
  useEffect(() => {
    ensureShimmerKeyframes();
  }, []);

  const base = isDark ? '#8e8ea0' : '#6e6e80';
  const highlight = isDark ? '#ececf1' : '#b4b4bc';

  return (
    <ThemedText
      style={[
        styles.text,
        style,
        {
          backgroundImage: `linear-gradient(90deg, ${base} 0%, ${base} 38%, ${highlight} 50%, ${base} 62%, ${base} 100%)`,
          backgroundSize: '200% 100%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          animationName: 'soulmate-text-shimmer',
          animationDuration: `${SHIMMER_DURATION_MS}ms`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        } as TextStyle,
      ]}>
      {children}
    </ThemedText>
  );
}

function NativeShimmerText({ children, style }: ShimmerTextProps) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText
        lightColor={ChatTheme.sidebarMuted}
        darkColor={ChatTheme.sidebarMutedDark}
        style={[styles.text, style]}>
        {children}
      </ThemedText>
    </Animated.View>
  );
}

export function ShimmerText({ children, style }: ShimmerTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  if (Platform.OS === 'web') {
    return <WebShimmerText style={style} isDark={isDark}>{children}</WebShimmerText>;
  }

  return <NativeShimmerText style={style}>{children}</NativeShimmerText>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: ChatTheme.messageFontSize,
    lineHeight: ChatTheme.messageLineHeight,
  },
});
