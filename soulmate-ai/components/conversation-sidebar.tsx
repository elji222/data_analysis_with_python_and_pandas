import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import { ThemedText } from '@/components/themed-text';
import { ChatTheme, SIDEBAR_NAV_ITEMS } from '@/constants/chat-theme';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isMobile = variant === 'mobile';

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
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
              onPress={() => {
                if ('route' in item && item.route) {
                  router.push(item.route);
                  onClose?.();
                }
              }}>
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
          <LogoutButton variant="row" onLoggedOut={onClose} />
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
        <ThemedText style={styles.newChatLabel}>New Chat</ThemedText>
      </Pressable>

      <View style={styles.navSection}>
        {SIDEBAR_NAV_ITEMS.slice(0, 4).map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
            onPress={() => {
              if ('route' in item && item.route) {
                router.push(item.route);
                onClose?.();
              }
            }}>
            <Ionicons name={item.icon} size={18} color={ChatTheme.sidebarMuted} />
            <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={styles.sectionTitle}>Chats</ThemedText>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        style={styles.listScroll}
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

      <View style={styles.sidebarFooter}>
        <LogoutButton variant="row" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    width: 280,
    maxWidth: 280,
    backgroundColor: ChatTheme.sidebarBg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: ChatTheme.sidebarBorder,
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
  listScroll: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 2,
  },
  sidebarFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ChatTheme.sidebarBorder,
    paddingTop: 4,
    paddingBottom: 12,
    paddingHorizontal: 4,
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
    paddingHorizontal: 4,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECEC',
  },
  pressed: {
    opacity: 0.75,
  },
});
