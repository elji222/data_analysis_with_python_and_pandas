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
import { useAuth } from '@/contexts/auth-context';
import { useUserMemories } from '@/hooks/use-user-memories';
import type { MemoryCategory } from '@/types/memory';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatCategory(category: MemoryCategory) {
  return category.replace(/_/g, ' ');
}

export default function MemoryScreen() {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;
  const {
    filteredMemories,
    settings,
    categories,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    addMemory,
    editMemory,
    removeMemory,
    clearMemories,
    setEnabled,
    updateSettings,
  } = useUserMemories(accessToken);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('other');
  const [draftPinned, setDraftPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => ['all' as const, ...categories],
    [categories]
  );

  function openCreate() {
    setEditingId(null);
    setDraftText('');
    setDraftCategory('other');
    setDraftPinned(false);
    setEditorOpen(true);
  }

  function openEdit(memoryId: string) {
    const memory = filteredMemories.find((item) => item.id === memoryId);
    if (!memory) return;
    setEditingId(memory.id);
    setDraftText(memory.memory_text);
    setDraftCategory(memory.category);
    setDraftPinned(memory.is_pinned);
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
          is_pinned: draftPinned,
        });
      } else {
        await addMemory({
          memory_text: text,
          category: draftCategory,
          is_pinned: draftPinned,
        });
      }
      setEditorOpen(false);
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
        },
      },
    ]);
  }

  function confirmClearAll() {
    Alert.alert('Clear all memories?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
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
          <ThemedText type="title">Memory</ThemedText>
          <ThemedText style={styles.subtitle}>
            This is everything the AI remembers about you across conversations.
          </ThemedText>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <ThemedText type="defaultSemiBold">Long-term memory</ThemedText>
              <ThemedText style={styles.settingHint}>
                When disabled, the AI will not save or use cross-chat memories.
              </ThemedText>
            </View>
            <Switch
              value={settings?.enabled ?? true}
              onValueChange={(value) => {
                void setEnabled(value);
              }}
            />
          </View>

          <TextInput
            value={settings?.preferred_language ?? ''}
            onChangeText={(value) => {
              void updateSettings({ preferred_language: value || null });
            }}
            placeholder="Preferred language (optional)"
            placeholderTextColor="#999"
            style={styles.input}
          />
          <TextInput
            value={settings?.answer_style ?? ''}
            onChangeText={(value) => {
              void updateSettings({ answer_style: value || null });
            }}
            placeholder="Preferred answer style (optional)"
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>

        <View style={styles.toolbar}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search memories"
            placeholderTextColor="#999"
            style={[styles.input, styles.searchInput]}
          />
          <Pressable style={styles.primaryButton} onPress={openCreate}>
            <ThemedText style={styles.primaryButtonText}>+ Add memory</ThemedText>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={categoryOptions}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterRow}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = categoryFilter === item;
            return (
              <Pressable
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setCategoryFilter(item)}>
                <ThemedText style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item === 'all' ? 'All' : formatCategory(item)}
                </ThemedText>
              </Pressable>
            );
          }}
        />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#7B61FF" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredMemories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText style={styles.emptyText}>
                No memories yet. The AI will add them as you chat, or you can add one manually.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <View style={styles.memoryCard}>
                <View style={styles.memoryHeader}>
                  <ThemedText style={styles.categoryLabel}>{formatCategory(item.category)}</ThemedText>
                  {item.is_pinned ? <ThemedText style={styles.pinnedLabel}>Pinned</ThemedText> : null}
                </View>
                <ThemedText style={styles.memoryText}>{item.memory_text}</ThemedText>
                <ThemedText style={styles.memoryMeta}>Updated {formatDate(item.updated_at)}</ThemedText>
                <View style={styles.memoryActions}>
                  <Pressable onPress={() => openEdit(item.id)}>
                    <ThemedText style={styles.actionText}>Edit</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item.id)}>
                    <ThemedText style={[styles.actionText, styles.deleteText]}>Delete</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Pressable style={styles.clearButton} onPress={confirmClearAll}>
          <ThemedText style={styles.clearButtonText}>Clear all memories</ThemedText>
        </Pressable>
      </SafeAreaView>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle">{editingId ? 'Edit memory' : 'Add memory'}</ThemedText>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="What should the AI remember?"
              placeholderTextColor="#999"
              multiline
              style={[styles.input, styles.editorInput]}
            />
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item }) => {
                const isActive = draftCategory === item;
                return (
                  <Pressable
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setDraftCategory(item)}>
                    <ThemedText style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {formatCategory(item)}
                    </ThemedText>
                  </Pressable>
                );
              }}
            />
            <View style={styles.settingRow}>
              <ThemedText>Pin this memory</ThemedText>
              <Switch value={draftPinned} onValueChange={setDraftPinned} />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setEditorOpen(false)}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void handleSave()} disabled={isSaving}>
                <ThemedText style={styles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  header: { gap: 8, marginBottom: 16, marginTop: 8 },
  subtitle: { opacity: 0.7, lineHeight: 22 },
  settingsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingCopy: { flex: 1, gap: 4 },
  settingHint: { opacity: 0.65, fontSize: 13, lineHeight: 18 },
  toolbar: { gap: 10, marginBottom: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8D8D8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FFF',
  },
  searchInput: { marginBottom: 0 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  filterChipActive: { backgroundColor: '#E9E0FF', borderColor: '#C4B5FD' },
  filterChipText: { fontSize: 13, textTransform: 'capitalize' },
  filterChipTextActive: { color: '#5B21B6', fontWeight: '600' },
  list: { gap: 12, paddingBottom: 24 },
  memoryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5E5',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: '#FFF',
  },
  memoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLabel: { fontSize: 12, textTransform: 'capitalize', opacity: 0.7, fontWeight: '600' },
  pinnedLabel: { fontSize: 12, color: '#7B61FF', fontWeight: '600' },
  memoryText: { fontSize: 15, lineHeight: 22 },
  memoryMeta: { fontSize: 12, opacity: 0.55 },
  memoryActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionText: { color: '#7B61FF', fontWeight: '600' },
  deleteText: { color: '#DC2626' },
  primaryButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: '600' },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDD',
  },
  clearButton: { alignItems: 'center', paddingVertical: 16, marginBottom: 12 },
  clearButtonText: { color: '#DC2626', fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { opacity: 0.65, textAlign: 'center', lineHeight: 22 },
  errorText: { color: '#DC2626', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  editorInput: { minHeight: 110, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
