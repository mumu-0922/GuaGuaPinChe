import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildShareMessage, formatContact, formatTripView } = require('../../miniprogram/pages/detail/view.js');

const trip = {
  _id: 't1',
  from: '\u957f\u5b89\u6821\u533a',
  to: '\u54b8\u9633\u673a\u573a',
  earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
  latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
  peopleCount: 3,
  ownerNickname: '\u5f20*',
  ownerVerified: true,
  note: 'T5'
};

describe('detail page view helpers', () => {
  it('formats public trip fields for display without contact', () => {
    expect(formatTripView(trip)).toEqual({
      routeText: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a',
      timeText: '04/30 09:15 ~ 10:45',
      peopleText: '3\u4eba\u540c\u884c',
      ownerText: '\u5f20* \u00b7 \u5df2\u8ba4\u8bc1',
      noteText: 'T5'
    });
  });

  it('formats revealed contact exactly as type and value', () => {
    expect(formatContact({ contactType: 'qq', contactValue: '123456789' })).toBe('qq: 123456789');
  });

  it('builds a share message containing the trip id', () => {
    expect(buildShareMessage('t1', trip)).toEqual({
      title: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a \u62fc\u8f66',
      path: '/pages/detail/detail?id=t1'
    });
  });
});
