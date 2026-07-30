import { Platform } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

type KeyboardSpacerProps = {
  minHeight?: number;
};

function NativeKeyboardSpacer({ minHeight = 0 }: KeyboardSpacerProps) {
  const { height } = useReanimatedKeyboardAnimation();

  const style = useAnimatedStyle(() => ({
    height: Math.max(-height.value, minHeight),
  }));

  return <Animated.View style={style} pointerEvents="none" />;
}

/**
 * Grows to the keyboard height so a bottom-anchored view is pushed above it.
 * Android disables `adjustResize` once the app runs edge-to-edge, so the layout
 * has to follow the keyboard manually. The web build reflows on its own.
 */
export function KeyboardSpacer(props: KeyboardSpacerProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  return <NativeKeyboardSpacer {...props} />;
}
