import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildUserDocument, buildUserUpdate, cleanNickname } = require('../../cloudfunctions/userEnsure/logic.js');

describe('userEnsure logic', () => {
  it('cleans blank nickname to default student name', () => {
    expect(cleanNickname('   ')).toBe('\u540c\u5b66');
  });

  it('builds a new default user document', () => {
    expect(buildUserDocument('openid-1', { nickname: ' \u5f20\u4e09 ', avatarUrl: 'https://a.example/a.png' }, 1777480000000)).toEqual({
      openid: 'openid-1',
      nickname: '\u5f20\u4e09',
      avatarUrl: 'https://a.example/a.png',
      verified: false,
      verifiedLabel: '\u672a\u8ba4\u8bc1',
      verifyStatus: 'unverified',
      verifyMethod: '',
      rejectReason: '',
      blocked: false,
      blockedReason: '',
      blockedAt: null,
      blockedBy: '',
      role: 'user',
      createdAt: 1777480000000,
      updatedAt: 1777480000000
    });
  });

  it('builds updates without overwriting verified or role', () => {
    expect(buildUserUpdate({ nickname: '', avatarUrl: 'avatar' }, 1777480000001)).toEqual({
      nickname: '\u540c\u5b66',
      avatarUrl: 'avatar',
      updatedAt: 1777480000001
    });
  });
});
