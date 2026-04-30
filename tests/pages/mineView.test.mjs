import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildStatusUpdatePayload, formatMineTrip, getStatusLabel } = require('../../miniprogram/pages/mine/view.js');

describe('mine page view helpers', () => {
  it('formats a mine trip with time and status label', () => {
    expect(formatMineTrip({
      _id: 't1',
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
      latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
      status: 'full'
    })).toMatchObject({
      _id: 't1',
      routeText: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a',
      timeText: '04/30 09:15 ~ 10:45',
      statusLabel: '\u5df2\u6ee1\u5458'
    });
  });

  it('builds status update payload', () => {
    expect(buildStatusUpdatePayload('t1', 'cancelled')).toEqual({ tripId: 't1', status: 'cancelled' });
  });

  it('falls back for unknown status', () => {
    expect(getStatusLabel('expired')).toBe('expired');
  });
});
