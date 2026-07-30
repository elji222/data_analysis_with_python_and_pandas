import { useEffect, useRef } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  useKeyboardState,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileQuickSuggestions } from '@/components/mobile-quick-suggestions';
import type { ChatMessage } from '@/types/chat';

const MIN_BOTTOM_INSET = 10;

type NativeMobileChatShellProps = {
  listData: ChatMessage[];
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  showHeroEmpty: boolean;
  mobileEdgeGutter: number;
  pageBackgroundColor: string;
  onSelectSuggestion: (prompt: string) => void;
  onKeyboardShow: () => void;
  onListLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onViewableItemsChanged: (info: { viewableItems: { index: number | null }[] }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
  renderItem: ListRenderItem<ChatMessage>;
  composer: React.ReactNode;
};

export function NativeMobileChatShell({
  listData,
  listRef,
  showHeroEmpty,
  mobileEdgeGutter,
  pageBackgroundColor,
  onSelectSuggestion,
  onKeyboardShow,
  onListLayout,
  onScroll,
  onContentSizeChange,
  onViewableItemsChanged,
  viewabilityConfig,
  onScrollToIndexFailed,
  renderItem,
  composer,
}: NativeMobileChatShellProps) {
  const insets = useSafeAreaInsets();
  const { height: keyboardOffset } = useReanimatedKeyboardAnimation();
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const restingBottomInset = Math.max(insets.bottom, MIN_BOTTOM_INSET);

  const onKeyboardShowRef = useRef(onKeyboardShow);
  onKeyboardShowRef.current = onKeyboardShow;

  useEffect(() => {
    if (isKeyboardVisible) {
      onKeyboardShowRef.current();
    }
  }, [isKeyboardVisible]);

  // `keyboardOffset` is negative while the keyboard is open. Growing a spacer under the
  // composer squeezes the whole column, which reproduces `adjustResize` behaviour that
  // Android disables once the app runs edge-to-edge.
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: Math.max(-keyboardOffset.value, restingBottomInset),
  }));

  return (
    <View style={[styles.shell, { backgroundColor: pageBackgroundColor }]}>
      <FlatList
        ref={listRef}
        style={styles.messageList}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messageListContent,
          { paddingHorizontal: mobileEdgeGutter },
          showHeroEmpty && listData.length === 0 ? styles.messageListContentEmpty : null,
        ]}
        ListEmptyComponent={
          showHeroEmpty && !isKeyboardVisible ? (
            <MobileQuickSuggestions embedded onSelect={onSelectSuggestion} />
          ) : null
        }
        onLayout={onListLayout}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={onScrollToIndexFailed}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator
      />

      <View
        style={[
          styles.composerDock,
          { paddingHorizontal: mobileEdgeGutter, backgroundColor: pageBackgroundColor },
        ]}>
        {composer}
      </View>

      <Animated.View
        style={[keyboardSpacerStyle, { backgroundColor: pageBackgroundColor }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  messageList: {
    flex: 1,
    minHeight: 0,
  },
  messageListContent: {
    paddingTop: 12,
    paddingBottom: 12,
    width: '100%',
  },
  messageListContentEmpty: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  composerDock: {
    width: '100%',
    paddingTop: 4,
    paddingBottom: 4,
    gap: 8,
    flexShrink: 0,
  },
});
