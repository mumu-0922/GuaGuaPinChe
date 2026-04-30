import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildDefaultDraft, buildTripDraftFromForm, combineDateTime, setDraftField } = require('../../miniprogram/pages/publish/form.js');

describe('publish form helpers', () => {
  it('builds a default draft with contact type and people count', () => {
    const draft = buildDefaultDraft(new Date(2026, 3, 30, 8, 20));
    expect(draft).toMatchObject({
      from: '',
      to: '',
      peopleCount: 1,
      contactType: 'qq',
      contactValue: '',
      note: '',
      date: '2026-04-30'
    });
    expect(draft.earliestClock).toBe('09:20');
    expect(draft.latestClock).toBe('09:50');
  });

  it('combines date and clock into a local timestamp', () => {
    expect(combineDateTime('2026-04-30', '09:15')).toBe(new Date(2026, 3, 30, 9, 15).getTime());
  });

  it('builds a validated trip draft from form fields', () => {
    expect(buildTripDraftFromForm({
      from: ' \u957f\u5b89\u6821\u533a ',
      to: '\u54b8\u9633\u673a\u573a',
      date: '2026-04-30',
      earliestClock: '09:15',
      latestClock: '10:45',
      peopleCount: '3',
      contactType: 'wechat',
      contactValue: '  wxid_123 ',
      note: ' \u4e00\u4eba\u4e00\u7bb1 '
    })).toEqual({
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
      latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
      peopleCount: 3,
      contactType: 'wechat',
      contactValue: 'wxid_123',
      note: '\u4e00\u4eba\u4e00\u7bb1'
    });
  });

  it('updates one field without mutating the original draft', () => {
    const draft = buildDefaultDraft(new Date(2026, 3, 30, 8, 20));
    const next = setDraftField(draft, 'from', '\u53cb\u8c0a\u6821\u533a');
    expect(next.from).toBe('\u53cb\u8c0a\u6821\u533a');
    expect(draft.from).toBe('');
  });
});
