import { Platform, useWindowDimensions } from 'react-native';

const WIDE_LAYOUT_MIN_WIDTH = 900;

export function useWideLayout() {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return false;
  }

  return width >= WIDE_LAYOUT_MIN_WIDTH;
}

export function useCompactWebLayout() {
  const { width } = useWindowDimensions();

  return Platform.OS === 'web' && width < WIDE_LAYOUT_MIN_WIDTH;
}
