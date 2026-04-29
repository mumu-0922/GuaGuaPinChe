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

  it('masks Chinese real name', () => {
    expect(maskNickname('张三')).toBe('张*');
  });
});
