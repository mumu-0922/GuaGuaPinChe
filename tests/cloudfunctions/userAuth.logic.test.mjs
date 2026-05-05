import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  DEFAULT_USER_FIELDS,
  buildUserDocument,
  buildUserUpdate,
  mergeUserDefaults
} = require('../../cloudfunctions/userEnsure/logic.js');
const { canCreateTrip } = require('../../cloudfunctions/tripCreate/logic.js');
const { canRevealContact, canViewerRevealContact } = require('../../cloudfunctions/contactView/logic.js');

describe('user auth defaults and permissions', () => {
  it('builds new users with verification, block, and role defaults', () => {
    expect(DEFAULT_USER_FIELDS).toMatchObject({
      verified: false,
      verifiedLabel: '未认证',
      verifyStatus: 'unverified',
      verifyMethod: '',
      rejectReason: '',
      blocked: false,
      blockedReason: '',
      blockedAt: null,
      blockedBy: '',
      role: 'user'
    });

    expect(buildUserDocument('openid-1', {}, 1777480000000)).toMatchObject({
      verified: false,
      verifiedLabel: '未认证',
      verifyStatus: 'unverified',
      verifyMethod: '',
      rejectReason: '',
      blocked: false,
      blockedReason: '',
      blockedAt: null,
      blockedBy: '',
      role: 'user'
    });
  });

  it('backfills old users without overwriting role, verification, or block fields', () => {
    const oldAdmin = {
      openid: 'admin-1',
      nickname: '管理员',
      role: 'admin',
      verified: true,
      verifiedLabel: '已认证',
      blocked: true,
      blockedReason: 'abuse',
      blockedAt: 1777480000000,
      blockedBy: 'root'
    };

    expect(mergeUserDefaults(oldAdmin)).toEqual({
      ...oldAdmin,
      verifyStatus: 'verified',
      verifyMethod: '',
      rejectReason: ''
    });
  });

  it('builds profile updates without resetting verification or block fields', () => {
    expect(buildUserUpdate({ nickname: ' 李四 ', avatarUrl: 'avatar' }, 1777480000001)).toEqual({
      nickname: '李四',
      avatarUrl: 'avatar',
      updatedAt: 1777480000001
    });
  });

  it('checks whether a user can create trips', () => {
    expect(canCreateTrip({ verifyStatus: 'verified', blocked: false })).toEqual({ ok: true, error: '' });
    expect(canCreateTrip({ verified: true, blocked: false })).toEqual({ ok: true, error: '' });
    expect(canCreateTrip({ verifyStatus: 'pending', blocked: false })).toEqual({ ok: false, error: '认证审核中，通过后可发布行程' });
    expect(canCreateTrip({ verifyStatus: 'verified', blocked: true })).toEqual({ ok: false, error: '账号已被限制，不能发布行程' });
    expect(canCreateTrip({ verifyStatus: 'unverified', blocked: false })).toEqual({ ok: false, error: '完成西工大认证后可发布行程' });
  });

  it('checks whether a viewer can reveal contact while preserving trip visibility wording', () => {
    expect(canRevealContact({ status: 'hidden' })).toEqual({ ok: false, error: '行程不可查看联系方式' });
    expect(canViewerRevealContact({ verifyStatus: 'verified', blocked: false }, { status: 'open' })).toEqual({ ok: true, error: '' });
    expect(canViewerRevealContact({ verified: true, blocked: false }, { status: 'open' })).toEqual({ ok: true, error: '' });
    expect(canViewerRevealContact({ verifyStatus: 'unverified', blocked: false }, { status: 'open' })).toEqual({ ok: false, error: '完成西工大认证后可查看联系方式' });
    expect(canViewerRevealContact({ verifyStatus: 'verified', blocked: true }, { status: 'open' })).toEqual({ ok: false, error: '账号已被限制，不能查看联系方式' });
    expect(canViewerRevealContact({ verifyStatus: 'pending', blocked: false }, { status: 'open' })).toEqual({ ok: false, error: '认证审核中，通过后可查看联系方式' });
    expect(canViewerRevealContact({ verifyStatus: 'verified', blocked: false }, { status: 'hidden' })).toEqual({ ok: false, error: '行程不可查看联系方式' });
  });
});
