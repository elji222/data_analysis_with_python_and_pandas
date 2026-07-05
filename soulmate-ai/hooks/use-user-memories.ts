import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  formatMemoryCategory,
  formatMemoryVisibility,
} from '@/lib/memory/categories';
import {
  clearAllMemories,
  createMemory,
  deleteMemory,
  fetchMemories,
  updateMemory,
  updateMemorySettings,
} from '@/services/memory-api';
import {
  MEMORY_CATEGORIES,
  MEMORY_VISIBILITIES,
  type MemoryCategory,
  type MemoryVisibility,
  type UserMemory,
  type UserMemorySettings,
} from '@/types/memory';

export function useUserMemories(accessToken: string | null | undefined) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [settings, setSettings] = useState<UserMemorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<MemoryVisibility | 'all'>('all');

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

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const filteredMemories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return memories.filter((memory) => {
      if (categoryFilter !== 'all' && memory.category !== categoryFilter) return false;
      if (visibilityFilter !== 'all' && memory.visibility !== visibilityFilter) return false;
      if (!query) return true;

      return (
        memory.memory_text.toLowerCase().includes(query) ||
        formatMemoryCategory(memory.category).toLowerCase().includes(query) ||
        formatMemoryVisibility(memory.visibility).toLowerCase().includes(query)
      );
    });
  }, [memories, searchQuery, categoryFilter, visibilityFilter]);

  const groupedMemories = useMemo(() => {
    const groups = new Map<MemoryCategory, UserMemory[]>();

    for (const category of MEMORY_CATEGORIES) {
      groups.set(category, []);
    }

    for (const memory of filteredMemories) {
      const bucket = groups.get(memory.category) ?? groups.get('everything_else')!;
      bucket.push(memory);
    }

    return MEMORY_CATEGORIES.map((category) => ({
      category,
      title: formatMemoryCategory(category),
      data: (groups.get(category) ?? []).sort(
        (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      ),
    })).filter((section) => section.data.length > 0);
  }, [filteredMemories]);

  const addMemory = useCallback(
    async (input: {
      category: MemoryCategory;
      memory_text: string;
      visibility?: MemoryVisibility;
      is_pinned?: boolean;
    }) => {
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
      visibility?: MemoryVisibility;
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
    groupedMemories,
    categories: MEMORY_CATEGORIES,
    visibilities: MEMORY_VISIBILITIES,
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
    updateSettings,
  };
}
