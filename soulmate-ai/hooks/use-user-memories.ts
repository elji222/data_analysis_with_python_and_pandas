import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearAllMemories,
  createMemory,
  deleteMemory,
  fetchMemories,
  updateMemory,
  updateMemorySettings,
} from '@/services/memory-api';
import { MEMORY_CATEGORIES, type MemoryCategory, type UserMemory, type UserMemorySettings } from '@/types/memory';

export function useUserMemories(accessToken: string | null | undefined) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [settings, setSettings] = useState<UserMemorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');

  const reload = useCallback(async () => {
    if (!accessToken) {
      setMemories([]);
      setSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMemories(accessToken);
      setMemories(data.memories);
      setSettings(data.settings);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Could not load memories.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredMemories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return memories.filter((memory) => {
      if (categoryFilter !== 'all' && memory.category !== categoryFilter) return false;
      if (!query) return true;
      return (
        memory.memory_text.toLowerCase().includes(query) ||
        memory.category.toLowerCase().includes(query)
      );
    });
  }, [memories, searchQuery, categoryFilter]);

  const addMemory = useCallback(
    async (input: { category: MemoryCategory; memory_text: string; is_pinned?: boolean }) => {
      if (!accessToken) return;
      const memory = await createMemory(accessToken, input);
      setMemories((current) => [memory, ...current]);
      return memory;
    },
    [accessToken]
  );

  const editMemory = useCallback(
    async (input: {
      id: string;
      memory_text?: string;
      category?: MemoryCategory;
      is_pinned?: boolean;
    }) => {
      if (!accessToken) return;
      const memory = await updateMemory(accessToken, input);
      setMemories((current) => current.map((item) => (item.id === memory.id ? memory : item)));
      return memory;
    },
    [accessToken]
  );

  const removeMemory = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      await deleteMemory(accessToken, id);
      setMemories((current) => current.filter((item) => item.id !== id));
    },
    [accessToken]
  );

  const clearMemories = useCallback(async () => {
    if (!accessToken) return;
    await clearAllMemories(accessToken);
    setMemories([]);
  }, [accessToken]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!accessToken) return;
      const next = await updateMemorySettings(accessToken, { enabled });
      setSettings(next);
    },
    [accessToken]
  );

  const updateSettings = useCallback(
    async (patch: Partial<Pick<UserMemorySettings, 'preferred_language' | 'answer_style'>>) => {
      if (!accessToken) return;
      const next = await updateMemorySettings(accessToken, patch);
      setSettings(next);
    },
    [accessToken]
  );

  return {
    memories,
    settings,
    filteredMemories,
    categories: MEMORY_CATEGORIES,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    reload,
    addMemory,
    editMemory,
    removeMemory,
    clearMemories,
    setEnabled,
    updateSettings,
  };
}
