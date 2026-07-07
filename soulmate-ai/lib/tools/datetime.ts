import { formatCurrentDate } from '@/lib/current-date';

import type { ToolHandler } from './types';

function resolveTimezone(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'UTC';
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value.trim() });
    return value.trim();
  } catch {
    return 'UTC';
  }
}

export const datetimeTool: ToolHandler = {
  definition: {
    name: 'get_current_datetime',
    description:
      'Get the current date and time. Use when the user asks what day it is, today\'s date, or the current time.',
    input_schema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA timezone such as Asia/Jerusalem or UTC. Defaults to UTC.',
        },
      },
    },
  },
  async execute(input) {
    const timezone = resolveTimezone(input.timezone);
    const now = new Date();
    const date = formatCurrentDate(now, timezone);
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    });

    return `Current date: ${date}\nCurrent time: ${time}\nTimezone: ${timezone}`;
  },
};
