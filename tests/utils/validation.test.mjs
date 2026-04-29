import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { normalizeLocation, validateTripDraft, maskNickname } = require('../../miniprogram/utils/validation.js');

const validDraft = {
  from: '长安校区',
  to: '咸阳机场',
  earliestTime: 1777500000000,
  latestTime: 1777501800000,
  peopleCount: 1,
  note: '一人一箱，T5航站楼',
  contactType: 'qq',
  contactValue: '123456789'
};

function expectMissingDraftErrors(result) {
  expect(result.ok).toBe(false);
  expect(result.errors).toContain('出发地不能为空');
  expect(result.errors).toContain('到达地不能为空');
  expect(result.errors).toContain('最早出发时间无效');
  expect(result.errors).toContain('最晚出发时间无效');
  expect(result.errors).toContain('同行人数必须是1到6之间的整数');
  expect(result.errors).toContain('联系方式类型必须是QQ、微信或手机号');
  expect(result.errors).toContain('联系方式不能为空');
}

describe('trip validation', () => {
  it('normalizes location alias', () => {
    expect(normalizeLocation(' 西北工业大学长安校区 ')).toBe('长安校区');
    expect(normalizeLocation('机场')).toBe('咸阳机场');
  });

  it('accepts valid draft', () => {
    expect(validateTripDraft(validDraft)).toEqual({ ok: true, errors: [] });
  });

  it('rejects same from and to', () => {
    const result = validateTripDraft({ ...validDraft, to: '长安校区' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('出发地和到达地不能相同');
  });

  it('rejects time window over 24 hours', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: validDraft.earliestTime + 25 * 60 * 60 * 1000 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最早和最晚出发时间跨度不能超过24小时');
  });

  it('rejects missing latest time', () => {
    const { latestTime, ...draftWithoutLatestTime } = validDraft;
    const result = validateTripDraft(draftWithoutLatestTime);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects zero latest time', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: 0 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects null latest time', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: null });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects empty string latest time', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects negative latest time', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: -1 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects non-numeric latest time', () => {
    const result = validateTripDraft({ ...validDraft, latestTime: 'not-a-time' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('最晚出发时间无效');
  });

  it('rejects undefined draft without throwing', () => {
    let result;
    expect(() => {
      result = validateTripDraft(undefined);
    }).not.toThrow();
    expectMissingDraftErrors(result);
  });

  it('rejects null draft without throwing', () => {
    let result;
    expect(() => {
      result = validateTripDraft(null);
    }).not.toThrow();
    expectMissingDraftErrors(result);
  });

  it('masks Chinese real name', () => {
    expect(maskNickname('张三')).toBe('张*');
  });
});
