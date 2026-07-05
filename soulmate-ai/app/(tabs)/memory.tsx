import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatTheme } from '@/constants/chat-theme';
import { useAuth } from '@/contexts/auth-context';
import { useUserMemories } from '@/hooks/use-user-memories';
import type { MemoryCategory } from '@/types/memory';

function formatCreatedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MemoryScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const accessToken = session?.access_token;
  const {
    filteredMemories,
    settings,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload,
    addMemory,
    editMemory,
    removeMemory,
    clearMemories,
    setEnabled,
  } = useUserMemories(accessToken);

  const [infoOpen, setInfoOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sortedMemories = useMemo(
    () =>
      [...filteredMemories].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ),
    [filteredMemories]
  );

  function openCreate() {
    setEditingId(null);
    setDraftText('');
    setEditorOpen(true);
  }

  function openEdit(memoryId: string) {
    const memory = sortedMemories.find((item) => item.id === memoryId);
    if (!memory) return;
    setEditingId(memory.id);
    setDraftText(memory.memory_text);
    setEditorOpen(true);
  }

  async function handleSave() {
    const text = draftText.trim();
    if (!text) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await editMemory({
          id: editingId,
          memory_text: text,
          category: 'other' as MemoryCategory,
        });
      } else {
        await addMemory({
          memory_text: text,
          category: 'other',
        });
      }
      setEditorOpen(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Could not save memory.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete memory?', 'This will be removed from future conversations.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void removeMemory(id);
          setEditorOpen(false);
        },
      },
    ]);
  }

  function confirmClearAll() {
    Alert.alert('Delete all memories?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: () => {
          void clearMemories();
        },
      },
    ]);
  }

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Please sign in to manage your memories.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push('/chat')}
            accessibilityLabel="Back to chat">
            <Ionicons name="chevron-back" size={24} color={ChatTheme.sidebarText} />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Saved memories</ThemedText>

          <Pressable
            style={styles.headerIconButton}
            onPress={() => setInfoOpen(true)}
            accessibilityLabel="About saved memories">
            <Ionicons name="information-circle-outline" size={22} color={ChatTheme.sidebarText} />
          </Pressable>
        </View>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor="#9A9A9A"
          style={styles.searchInput}
        />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ChatTheme.sidebarText} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => void reload()}>
              <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sortedMemories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedText style={styles.emptyText}>
                No saved memories yet. Tell the AI something like “Remember that I prefer concise
                answers.”
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.memoryCard}
                onPress={() => openEdit(item.id)}
                onLongPress={() => confirmDelete(item.id)}>
                <ThemedText style={styles.memoryText}>{item.memory_text}</ThemedText>
                <ThemedText style={styles.memoryDate}>
                  Created {formatCreatedDate(item.created_at)}
                </ThemedText>
              </Pressable>
            )}
            ListFooterComponent={
              sortedMemories.length > 0 ? (
                <View style={styles.footer}>
                  <Pressable style={styles.addMemoryButton} onPress={openCreate}>
                    <ThemedText style={styles.addMemoryText}>Add memory</ThemedText>
                  </Pressable>
                  <Pressable style={styles.deleteAllButton} onPress={confirmClearAll}>
                    <ThemedText style={styles.deleteAllText}>Delete all</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.emptyAddButton} onPress={openCreate}>
                  <ThemedText style={styles.addMemoryText}>Add memory</ThemedText>
                </Pressable>
              )
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={infoOpen} animationType="fade" transparent onRequestClose={() => setInfoOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoCard} onPress={(event) => event.stopPropagation()}>
            <ThemedText style={styles.infoTitle}>Saved memories</ThemedText>
            <ThemedText style={styles.infoBody}>
              Soulmate AI remembers useful details across chats so replies feel more personal. You
              can review, edit, or remove anything here.
            </ThemedText>
            <View style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Memory enabled</ThemedText>
              <Switch
                value={settings?.enabled ?? true}
                onValueChange={(value) => {
                  void setEnabled(value);
                }}
              />
            </View>
            <Pressable style={styles.infoCloseButton} onPress={() => setInfoOpen(false)}>
              <ThemedText style={styles.infoCloseText}>Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.editorCard}>
            <ThemedText style={styles.editorTitle}>
              {editingId ? 'Edit memory' : 'Add memory'}
            </ThemedText>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What should the AI remember?"
              placeholderTextColor="#9A9A9A"
              multiline
              autoFocus
              style={styles.editorInput}
            />
            <View style={styles.editorActions}>
              {editingId ? (
                <Pressable onPress={() => confirmDelete(editingId)}>
                  <ThemedText style={styles.deleteAllText}>Delete</ThemedText>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={styles.editorRightActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setEditorOpen(false)}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void handleSave()}
                  disabled={isSaving}>
                  <ThemedText style={styles.primaryButtonText}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 14,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  searchInput: {
    backgroundColor: '#F4F4F4',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: ChatTheme.sidebarText,
    marginBottom: 16,
  },
  listContent: {
    gap: 10,
    paddingBottom: 32,
  },
  memoryCard: {
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  memoryText: {
    fontSize: 16,
    lineHeight: 24,
    color: ChatTheme.sidebarText,
  },
  memoryDate: {
    fontSize: 12,
    color: '#8A8A8A',
    alignSelf: 'flex-end',
  },
  footer: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 28,
    paddingBottom: 8,
  },
  addMemoryButton: {
    paddingVertical: 8,
  },
  emptyAddButton: {
    alignItems: 'center',
    paddingTop: 20,
  },
  addMemoryText: {
    fontSize: 15,
    color: ChatTheme.sidebarText,
    fontWeight: '500',
  },
  deleteAllButton: {
    paddingVertical: 8,
  },
  deleteAllText: {
    fontSize: 15,
    color: '#D64545',
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
    color: '#8A8A8A',
    paddingTop: 24,
  },
  errorText: {
    color: '#D64545',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: ChatTheme.sidebarText,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  infoBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B6B6B',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  settingLabel: {
    fontSize: 15,
    color: ChatTheme.sidebarText,
  },
  infoCloseButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  infoCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  editorCard: {
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  editorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  editorInput: {
    minHeight: 120,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 24,
    color: ChatTheme.sidebarText,
    textAlignVertical: 'top',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: ChatTheme.sidebarText,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
