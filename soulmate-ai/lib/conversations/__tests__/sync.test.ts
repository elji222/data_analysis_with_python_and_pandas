import { describe, expect, it } from 'vitest';

import {
  conversationSignature,
  conversationsNeedCloudUpload,
  mapRowsToConversations,
  mergeConversations,
} from '@/lib/conversations/sync';
import type { Conversation } from '@/types/conversation';

const baseConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'Trip planning',
  createdAt: 1000,
  updatedAt: 1000,
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      text: 'Remember that I live in New Jersey.',
      createdAt: 1000,
    },
  ],
  ...overrides,
});

describe('conversation cloud sync', () => {
  it('merges local-only conversations into cloud history', () => {
    const cloud = [baseConversation({ id: 'cloud-1', updatedAt: 2000 })];
    const local = [baseConversation({ id: 'local-1', updatedAt: 1500 })];

    const merged = mergeConversations(cloud, local);

    expect(merged.map((conversation) => conversation.id)).toEqual(['cloud-1', 'local-1']);
  });

  it('keeps the newest copy when ids overlap', () => {
    const cloud = [
      baseConversation({
        id: 'shared-1',
        updatedAt: 1000,
        messages: [{ id: 'm1', role: 'user', text: 'Old text', createdAt: 1000 }],
      }),
    ];
    const local = [
      baseConversation({
        id: 'shared-1',
        updatedAt: 3000,
        messages: [{ id: 'm1', role: 'user', text: 'New text', createdAt: 3000 }],
      }),
    ];

    const merged = mergeConversations(cloud, local);

    expect(merged).toHaveLength(1);
    expect(merged[0].messages[0].text).toBe('New text');
  });

  it('maps database rows back into conversations', () => {
    const conversations = mapRowsToConversations(
      [
        {
          id: 'conv-1',
          user_id: 'user-1',
          title: 'Hello',
          created_at: '2026-07-06T10:00:00.000Z',
          updated_at: '2026-07-06T10:05:00.000Z',
          is_deleted: false,
        },
      ],
      [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          user_id: 'user-1',
          role: 'user',
          message_text: 'Hi there',
          attachments: null,
          created_at: '2026-07-06T10:01:00.000Z',
          sort_order: 0,
        },
      ]
    );

    expect(conversations[0].messages[0].text).toBe('Hi there');
    expect(conversations[0].updatedAt).toBe(new Date('2026-07-06T10:05:00.000Z').getTime());
  });

  it('detects when merged conversations need a cloud upload', () => {
    const cloud = [baseConversation({ id: 'cloud-1' })];
    const merged = [baseConversation({ id: 'cloud-1' }), baseConversation({ id: 'local-1' })];

    expect(conversationsNeedCloudUpload(cloud, merged)).toBe(true);
    expect(conversationSignature(cloud)).not.toBe(conversationSignature(merged));
  });
});
