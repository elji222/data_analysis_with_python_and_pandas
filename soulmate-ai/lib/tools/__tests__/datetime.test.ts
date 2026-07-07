import { describe, expect, it } from 'vitest';

import { datetimeTool } from '@/lib/tools/datetime';

describe('datetimeTool', () => {
  it('returns date and time for a timezone', async () => {
    const result = await datetimeTool.execute(
      { timezone: 'UTC' },
      {}
    );

    expect(result).toContain('Current date:');
    expect(result).toContain('Current time:');
    expect(result).toContain('Timezone: UTC');
  });

  it('falls back to UTC for invalid timezones', async () => {
    const result = await datetimeTool.execute({ timezone: 'Not/AZone' }, {});
    expect(result).toContain('Timezone: UTC');
  });
});
