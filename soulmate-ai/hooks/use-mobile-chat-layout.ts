import { Platform } from 'react-native';

import { isMobileWebBrowser } from '@/lib/browser-capabilities';
import { useWideLayout } from '@/hooks/use-wide-layout';

export function useMobileChatLayout() {
  const isWideLayout = useWideLayout();

  if (Platform.OS !== 'web') {
    return true;
  }

  if (isMobileWebBrowser()) {
    return true;
  }

  return !isWideLayout;
}

export function useShellLayout() {
  const isWideLayout = useWideLayout();

  if (Platform.OS !== 'web') {
    return 'mobile' as const;
  }

  if (isMobileWebBrowser()) {
    return 'mobile' as const;
  }

  return isWideLayout ? ('desktop' as const) : ('mobile' as const);
}
