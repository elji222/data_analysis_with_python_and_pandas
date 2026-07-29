import { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileQuickSuggestions } from '@/components/mobile-quick-suggestions';
import type { ChatMessage } from '@/types/chat';

const DEFAULT_COMPOSER_CLEARANCE = 108;

type NativeMobileChatShellProps = {
  listData: ChatMessage[];
  listRef: React.RefObject<FlatList<ChatMessage> | null>;
  showHeroEmpty: boolean;
  isKeyboardVisible: boolean;
  mobileEdgeGutter: number;
  pageBackgroundColor: string;
  onSelectSuggestion: (prompt: string) => void;
  onListLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onViewableItemsChanged: (info: { viewableItems: Array<{ index: number | null }> }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
  renderItem: ListRenderItem<ChatMessage>;
  composer: React.ReactNode;
};

export function NativeMobileChatShell({
  listData,
  listRef,
  showHeroEmpty,
  isKeyboardVisible,
  mobileEdgeGutter,
  pageBackgroundColor,
  onSelectSuggestion,
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
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_CLEARANCE);
  const bottomInset = isKeyboardVisible ? 8 : Math.max(insets.bottom, 12);
  const listBottomPadding = composerHeight + 12;

  const handleComposerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = Math.ceil(event.nativeEvent.layout.height);
      if (nextHeight > 0) {
        setComposerHeight(nextHeight);
      }
    },
    []
  );

  const composerDock = (
    <View
      onLayout={handleComposerLayout}
      style={[
        styles.composerDock,
        {
          paddingBottom: bottomInset,
          paddingHorizontal: mobileEdgeGutter,
          backgroundColor: pageBackgroundColor,
        },
      ]}>
      {composer}
    </View>
  );

  return (
    <View style={styles.shell}>
      <FlatList
        ref={listRef}
        style={styles.messageList}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messageListContent,
          { paddingBottom: listBottomPadding, paddingHorizontal: mobileEdgeGutter },
          showHeroEmpty && listData.length === 0 ? styles.messageListContentEmpty : null,
        ]}
        ListEmptyComponent={
          showHeroEmpty ? (
            <View style={styles.emptySuggestions}>
              {!isKeyboardVisible ? (
                <MobileQuickSuggestions embedded onSelect={onSelectSuggestion} />
              ) : null}
            </View>
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

      {Platform.OS === 'ios' ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>{composerDock}</KeyboardStickyView>
      ) : (
        composerDock
      )}
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
    width: '100%',
  },
  messageListContentEmpty: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptySuggestions: {
    width: '100%',
  },
  composerDock: {
    width: '100%',
    paddingTop: 4,
    gap: 8,
    flexShrink: 0,
  },
});
