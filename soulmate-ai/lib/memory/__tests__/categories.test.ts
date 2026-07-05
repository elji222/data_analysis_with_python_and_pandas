import { describe, expect, it } from 'vitest';

import {
  classifyMemoryCategory,
  formatMemoryCategory,
  normalizeMemoryCategory,
  normalizeMemoryVisibility,
} from '@/lib/memory/categories';

describe('memory categories', () => {
  it('maps legacy categories to the new taxonomy', () => {
    expect(normalizeMemoryCategory('identity')).toBe('basic_information');
    expect(normalizeMemoryCategory('work')).toBe('work_career');
    expect(normalizeMemoryCategory('other')).toBe('everything_else');
  });

  it('classifies concise communication preferences', () => {
    expect(classifyMemoryCategory('Keep answers concise and brief.')).toBe('communication_style');
  });

  it('falls back to everything else when no keyword matches', () => {
    expect(classifyMemoryCategory('Keeps a blue notebook on the desk.')).toBe('everything_else');
  });

  it('formats category labels for the UI', () => {
    expect(formatMemoryCategory('work_career')).toBe('Work & Career');
  });

  it('defaults visibility to personal', () => {
    expect(normalizeMemoryVisibility(undefined)).toBe('personal');
    expect(normalizeMemoryVisibility('friends')).toBe('friends');
  });
});
