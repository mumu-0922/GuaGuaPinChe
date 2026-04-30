import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildTripDocument, validateServerTripDraft } = require('../../cloudfunctions/tripCreate/logic.js');

const validDraft = {
  from: '\u957f\u5b89\u6821\u533a',
  to: '\u54b8\u9633\u673a\u573a',
  earliestTime: 1777500000000,
  latestTime: 1777501800000,
  peopleCount: 1,
  note: '\u4e00\u4eba\u4e00\u7bb1\uff0cT5\u822a\u7ad9\u697c',
  contactType: 'qq',
  contactValue: '123456789'
};

const owner = {
  openid: 'owner-1',
  nickname: '\u5f20\u4e09',
  verified: true,
  verifiedLabel: '\u5df2\u8ba4\u8bc1'
};

describe('tripCreate logic', () => {
  it('accepts valid draft', () => {
    expect(validateServerTripDraft(validDraft)).toEqual({ ok: true, errors: [] });
  });

  it('normalizes location aliases', () => {
    expect(validateServerTripDraft({ ...validDraft, from: ' \u897f\u5317\u5de5\u4e1a\u5927\u5b66\u957f\u5b89\u6821\u533a ' })).toEqual({ ok: true, errors: [] });
  });

  it('rejects same start and destination', () => {
    const result = validateServerTripDraft({ ...validDraft, to: '\u957f\u5b89\u6821\u533a' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u51fa\u53d1\u5730\u548c\u5230\u8fbe\u5730\u4e0d\u80fd\u76f8\u540c');
  });

  it('rejects time windows over 24 hours', () => {
    const result = validateServerTripDraft({ ...validDraft, latestTime: validDraft.earliestTime + 25 * 60 * 60 * 1000 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u6700\u65e9\u548c\u6700\u665a\u51fa\u53d1\u65f6\u95f4\u8de8\u5ea6\u4e0d\u80fd\u8d85\u8fc724\u5c0f\u65f6');
  });

  it('rejects invalid latest time without fallback', () => {
    const result = validateServerTripDraft({ ...validDraft, latestTime: 0 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u6700\u665a\u51fa\u53d1\u65f6\u95f4\u65e0\u6548');
  });

  it('builds trip document with masked owner and stored contact', () => {
    expect(buildTripDocument(validDraft, owner, 1777480000000)).toEqual({
      ownerOpenid: 'owner-1',
      ownerNickname: '\u5f20*',
      ownerVerified: true,
      ownerVerifiedLabel: '\u5df2\u8ba4\u8bc1',
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      earliestTime: 1777500000000,
      latestTime: 1777501800000,
      peopleCount: 1,
      status: 'open',
      note: '\u4e00\u4eba\u4e00\u7bb1\uff0cT5\u822a\u7ad9\u697c',
      contactType: 'qq',
      contactValue: '123456789',
      createdAt: 1777480000000,
      updatedAt: 1777480000000
    });
  });
});
