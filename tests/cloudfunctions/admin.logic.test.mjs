import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildReportResolution,
  normalizeReportStatus,
  validateResolutionNote
} = require('../../cloudfunctions/adminReportResolve/logic.js');
const { normalizeReportListStatus } = require('../../cloudfunctions/adminReportList/logic.js');
const {
  buildUserBlockUpdate,
  validateBlockReason
} = require('../../cloudfunctions/adminUserBlock/logic.js');
const {
  MAX_USER_SCAN,
  USER_PAGE_SIZE,
  USER_RESULT_LIMIT,
  buildUserFilters,
  matchesUserKeyword,
  toAdminUserView
} = require('../../cloudfunctions/adminUserList/logic.js');

const now = 1777480000000;

describe('admin report governance logic', () => {
  it('builds reviewed resolution and hides trip when requested', () => {
    expect(buildReportResolution('reviewed', '已处理', true, 'admin-1', now)).toEqual({
      reportUpdate: {
        status: 'reviewed',
        resolutionNote: '已处理',
        resolvedBy: 'admin-1',
        resolvedAt: now,
        updatedAt: now
      },
      tripUpdate: { status: 'hidden', updatedAt: now }
    });
  });

  it('builds rejected resolution without trip update', () => {
    expect(buildReportResolution('rejected', '', false, 'admin-1', now)).toEqual({
      reportUpdate: {
        status: 'rejected',
        resolutionNote: '',
        resolvedBy: 'admin-1',
        resolvedAt: now,
        updatedAt: now
      },
      tripUpdate: null
    });
  });

  it('rejects invalid report status and normalizes list status', () => {
    expect(normalizeReportStatus('open')).toBe('');
    expect(buildReportResolution('open', '', false, 'admin-1', now)).toBeNull();
    expect(normalizeReportListStatus('bad')).toBe('open');
  });

  it('validates resolution note length', () => {
    expect(validateResolutionNote(' x '.repeat(61))).toEqual({ ok: false, error: '处理备注不能超过120个字' });
  });
});

describe('admin user governance logic', () => {
  it('builds block update with reason and admin metadata', () => {
    expect(buildUserBlockUpdate('block', '广告', 'admin-1', now)).toEqual({
      blocked: true,
      blockedReason: '广告',
      blockedAt: now,
      blockedBy: 'admin-1',
      updatedAt: now
    });
  });

  it('builds unblock update and resets block fields', () => {
    expect(buildUserBlockUpdate('unblock', '', 'admin-1', now)).toEqual({
      blocked: false,
      blockedReason: '',
      blockedAt: null,
      blockedBy: '',
      updatedAt: now
    });
  });

  it('rejects invalid block action and validates reason length', () => {
    expect(buildUserBlockUpdate('mute', '', 'admin-1', now)).toBeNull();
    expect(validateBlockReason('违'.repeat(121))).toEqual({ ok: false, error: '拉黑原因不能超过120个字' });
  });

  it('builds normalized user filters', () => {
    expect(buildUserFilters({ verifyStatus: 'verified', blocked: 'true', keyword: ' abc ' })).toEqual({
      verifyStatus: 'verified',
      blocked: true,
      keyword: 'abc'
    });
    expect(buildUserFilters({ blocked: false })).toEqual({ verifyStatus: '', blocked: false, keyword: '' });
    expect(buildUserFilters({ blocked: true })).toEqual({ verifyStatus: '', blocked: true, keyword: '' });
  });

  it('exports stable user search scan limits', () => {
    expect(MAX_USER_SCAN).toBe(500);
    expect(USER_PAGE_SIZE).toBe(100);
    expect(USER_RESULT_LIMIT).toBe(50);
  });

  it('matches keyword against nickname or openid tail', () => {
    expect(matchesUserKeyword({ openid: 'openid-abcdef123456', nickname: '张三' }, '123456')).toBe(true);
    expect(matchesUserKeyword({ openid: 'openid-abcdef123456', nickname: '张三' }, '张')).toBe(true);
    expect(matchesUserKeyword({ openid: 'openid-abcdef123456', nickname: '张三' }, 'missing')).toBe(false);
  });

  it('formats admin user view with openid tail and blocked status', () => {
    expect(toAdminUserView({
      _id: 'openid-abcdef123456',
      openid: 'openid-abcdef123456',
      nickname: '张三',
      verified: true,
      verifiedLabel: '已认证学生',
      verifyStatus: 'verified',
      role: 'user',
      blocked: true,
      blockedReason: '广告'
    })).toEqual({
      _id: 'openid-abcdef123456',
      openidTail: '123456',
      nickname: '张三',
      verified: true,
      verifiedLabel: '已认证学生',
      verifyStatus: 'verified',
      role: 'user',
      blocked: true,
      blockedReason: '广告'
    });
  });
});

