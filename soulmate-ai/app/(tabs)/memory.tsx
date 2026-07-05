import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
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
import {
  formatMemoryCategory,
  formatMemoryVisibility,
  MEMORY_VISIBILITY_LABELS,
} from '@/lib/memory/categories';
import type { MemoryCategory, MemoryVisibility, UserMemory } from '@/types/memory';

function formatUpdatedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}>
      <ThemedText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function MemoryScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const accessToken = session?.access_token;
  const {
    groupedMemories,
    filteredMemories,
    settings,
    categories,
    visibilities,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    visibilityFilter,
    setVisibilityFilter,
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
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('everything_else');
  const [draftVisibility, setDraftVisibility] = useState<MemoryVisibility>('personal');
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setDraftText('');
    setDraftCategory('everything_else');
    setDraftVisibility('personal');
    setEditorOpen(true);
  }

  function openEdit(memory: UserMemory) {
    setEditingId(memory.id);
    setDraftText(memory.memory_text);
    setDraftCategory(memory.category);
    setDraftVisibility(memory.visibility);
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
          category: draftCategory,
          visibility: draftVisibility,
        });
      } else {
        await addMemory({
          memory_text: text,
          category: draftCategory,
          visibility: draftVisibility,
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
          placeholder="Search memories"
          placeholderTextColor="#9A9A9A"
          style={styles.searchInput}
        />

        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>Category</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip
              label="All"
              active={categoryFilter === 'all'}
              onPress={() => setCategoryFilter('all')}
            />
            {categories.map((category) => (
              <FilterChip
                key={category}
                label={formatMemoryCategory(category)}
                active={categoryFilter === category}
                onPress={() => setCategoryFilter(category)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <ThemedText style={styles.filterLabel}>Visibility</ThemedText>
          <View style={styles.filterRow}>
            <FilterChip
              label="All"
              active={visibilityFilter === 'all'}
              onPress={() => setVisibilityFilter('all')}
            />
            {visibilities.map((visibility) => (
              <FilterChip
                key={visibility}
                label={formatMemoryVisibility(visibility)}
                active={visibilityFilter === visibility}
                onPress={() => setVisibilityFilter(visibility)}
              />
            ))}
          </View>
        </View>

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
          <SectionList
            sections={groupedMemories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <ThemedText style={styles.emptyText}>
                No saved memories yet. Tell the AI something like “Remember that I prefer concise
                answers.”
              </ThemedText>
            }
            renderSectionHeader={({ section }) => (
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            )}
            renderItem={({ item }) => (
              <Pressable
                style={styles.memoryCard}
                onPress={() => openEdit(item)}
                onLongPress={() => confirmDelete(item.id)}>
                <ThemedText style={styles.memoryText}>{item.memory_text}</ThemedText>
                <View style={styles.memoryMetaRow}>
                  <ThemedText style={styles.memoryMeta}>
                    {formatMemoryCategory(item.category)}
                  </ThemedText>
                  <ThemedText style={styles.memoryMeta}>
                    {formatMemoryVisibility(item.visibility)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.memoryDate}>
                  Updated {formatUpdatedDate(item.updated_at)}
                </ThemedText>
              </Pressable>
            )}
            ListFooterComponent={
              filteredMemories.length > 0 ? (
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
              Memories are grouped by category. Personal memories are used by the AI in your chats.
              Friends and Public are saved for future sharing features.
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
        <View style={styles.editorBackdrop}>
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

            <ThemedText style={styles.fieldLabel}>Category</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  label={formatMemoryCategory(category)}
                  active={draftCategory === category}
                  onPress={() => setDraftCategory(category)}
                />
              ))}
            </ScrollView>

            <ThemedText style={styles.fieldLabel}>Visibility</ThemedText>
            <View style={styles.visibilityRow}>
              {visibilities.map((visibility) => {
                const active = draftVisibility === visibility;
                const label = MEMORY_VISIBILITY_LABELS[visibility];
                return (
                  <Pressable
                    key={visibility}
                    style={[styles.visibilityOption, active && styles.visibilityOptionActive]}
                    onPress={() => setDraftVisibility(visibility)}>
                    <ThemedText
                      style={[
                        styles.visibilityOptionText,
                        active && styles.visibilityOptionTextActive,
                      ]}>
                      {label.icon} {label.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
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
    marginBottom: 12,
  },
  filterSection: { marginBottom: 10 },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 8,
  },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#E4E4E4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#F4F4F4',
    borderColor: ChatTheme.sidebarText,
  },
  filterChipText: { fontSize: 13, color: ChatTheme.sidebarText },
  filterChipTextActive: { fontWeight: '600' },
  listContent: { gap: 10, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ChatTheme.sidebarText,
    marginTop: 8,
    marginBottom: 8,
  },
  memoryCard: {
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  memoryText: {
    fontSize: 16,
    lineHeight: 24,
    color: ChatTheme.sidebarText,
  },
  memoryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memoryMeta: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  memoryDate: {
    fontSize: 12,
    color: '#8A8A8A',
    alignSelf: 'flex-end',
  },
  footer: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },
  addMemoryButton: { paddingVertical: 8 },
  emptyAddButton: { alignItems: 'center', paddingTop: 20 },
  addMemoryText: {
    fontSize: 15,
    color: ChatTheme.sidebarText,
    fontWeight: '500',
  },
  deleteAllButton: { paddingVertical: 8 },
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
  errorText: { color: '#D64545', textAlign: 'center' },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10 },
  retryButtonText: { color: ChatTheme.sidebarText, fontWeight: '600' },
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
  settingLabel: { fontSize: 15, color: ChatTheme.sidebarText },
  infoCloseButton: { alignSelf: 'flex-end', paddingVertical: 8 },
  infoCloseText: { fontSize: 15, fontWeight: '600', color: ChatTheme.sidebarText },
  editorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  editorCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    maxHeight: '88%',
  },
  editorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ChatTheme.sidebarText,
  },
  editorInput: {
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 24,
    color: ChatTheme.sidebarText,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
  },
  visibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visibilityOption: {
    borderWidth: 1,
    borderColor: '#E4E4E4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  visibilityOptionActive: {
    backgroundColor: '#F4F4F4',
    borderColor: ChatTheme.sidebarText,
  },
  visibilityOptionText: {
    fontSize: 13,
    color: ChatTheme.sidebarText,
  },
  visibilityOptionTextActive: {
    fontWeight: '600',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
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
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
