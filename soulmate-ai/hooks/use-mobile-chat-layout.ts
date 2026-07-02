import { Platform } from 'react-native';

import { useWideLayout } from '@/hooks/use-wide-layout';

export function useMobileChatLayout() {
  const isWideLayout = useWideLayout();

  if (Platform.OS !== 'web') {
    return true;
  }

  return !isWideLayout;
}
