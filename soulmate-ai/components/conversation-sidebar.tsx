import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ChatTheme, SIDEBAR_NAV_ITEMS, UI_VERSION } from '@/constants/chat-theme';
import { CLAUDE_MODEL } from '@/constants/ai';
import type { Conversation } from '@/types/conversation';

type ConversationSidebarProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile';
  userEmail?: string | null;
};

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
  variant = 'desktop',
  userEmail,
}: ConversationSidebarProps) {
  const insets = useSafeAreaInsets();
  const isMobile = variant === 'mobile';
  const userInitial = userEmail?.charAt(0).toUpperCase() ?? 'U';

  if (isMobile) {
    return (
      <View style={[styles.mobileSidebar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.mobileHeader}>
          <ThemedText style={styles.mobileBrand}>Soulmate AI</ThemedText>
          <View style={styles.mobileHeaderActions}>
            <Pressable style={styles.iconButton}>
              <Ionicons name="search-outline" size={22} color={ChatTheme.sidebarText} />
            </Pressable>
            {onClose ? (
              <Pressable style={styles.iconButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={ChatTheme.sidebarText} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.navSection}>
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <Pressable key={item.label} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
              <Ionicons name={item.icon} size={20} color={ChatTheme.sidebarText} />
              <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>Recents</ThemedText>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.mobileList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = item.id === activeConversationId;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.mobileConversationRow,
                  isActive && styles.conversationButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelectConversation(item.id)}>
                <Ionicons name="chatbubble-outline" size={16} color={ChatTheme.sidebarMuted} />
                <ThemedText numberOfLines={1} style={styles.conversationTitle}>
                  {item.title}
                </ThemedText>
              </Pressable>
            );
          }}
        />

        <View style={[styles.mobileFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={({ pressed }) => [styles.mobileChatButton, pressed && styles.pressed]}
            onPress={onNewConversation}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.mobileChatButtonText}>Chat</ThemedText>
          </Pressable>

          <View style={styles.mobileAvatar}>
            <ThemedText style={styles.mobileAvatarText}>{userInitial}</ThemedText>
          </View>

          <Pressable style={styles.mobileVoiceButton}>
            <Ionicons name="pulse" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.sidebar, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.brandRow}>
        <View style={styles.brandLeft}>
          <View style={styles.logoMark}>
            <Ionicons name="sparkles" size={16} color={ChatTheme.accent} />
          </View>
          <View>
            <ThemedText style={styles.brandText}>Soulmate AI</ThemedText>
            <ThemedText style={styles.versionText}>UI {UI_VERSION}</ThemedText>
            <ThemedText style={styles.modelText}>{CLAUDE_MODEL}</ThemedText>
          </View>
        </View>
        {onClose ? (
          <Pressable style={styles.iconButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={20} color={ChatTheme.sidebarMuted} />
          </Pressable>
        ) : (
          <Pressable style={styles.iconButton}>
            <Ionicons name="create-outline" size={18} color={ChatTheme.sidebarMuted} />
          </Pressable>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.newChatButton, pressed && styles.pressed]}
        onPress={onNewConversation}>
        <Ionicons name="create-outline" size={18} color={ChatTheme.sidebarText} />
        <ThemedText style={styles.newChatLabel}>New chat</ThemedText>
      </Pressable>

      <View style={styles.navSection}>
        {SIDEBAR_NAV_ITEMS.slice(0, 3).map((item) => (
          <Pressable key={item.label} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
            <Ionicons name={item.icon} size={18} color={ChatTheme.sidebarMuted} />
            <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.sectionTitle}>Chats</ThemedText>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isActive = item.id === activeConversationId;

          return (
            <View style={styles.row}>
              <Pressable
                style={({ pressed }) => [
                  styles.conversationButton,
                  isActive && styles.conversationButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelectConversation(item.id)}>
                <ThemedText numberOfLines={1} style={styles.conversationTitle}>
                  {item.title}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={() => onDeleteConversation(item.id)}>
                <Ionicons name="trash-outline" size={14} color={ChatTheme.sidebarMuted} />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: ChatTheme.sidebarBg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: ChatTheme.sidebarBorder,
    paddingBottom: 16,
  },
  mobileSidebar: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileBrand: {
    fontSize: 28,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  versionText: {
    fontSize: 11,
    color: ChatTheme.sidebarMuted,
    marginTop: 1,
  },
  modelText: {
    fontSize: 10,
    color: ChatTheme.sidebarMuted,
    marginTop: 1,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: ChatTheme.sidebarHover,
  },
  newChatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: ChatTheme.sidebarText,
  },
  navSection: {
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  navLabel: {
    fontSize: 16,
    color: ChatTheme.sidebarText,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ChatTheme.sidebarMuted,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 2,
  },
  mobileList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mobileConversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  conversationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  conversationButtonActive: {
    backgroundColor: ChatTheme.sidebarActive,
  },
  conversationTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: ChatTheme.sidebarText,
  },
  deleteButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  mobileFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECEC',
  },
  mobileChatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ChatTheme.chatGptBlue,
    borderRadius: 999,
    paddingVertical: 14,
  },
  mobileChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mobileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
  },
  mobileVoiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ChatTheme.chatGptBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
