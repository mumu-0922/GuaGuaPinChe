import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildVerificationRequest,
  canSubmitVerification,
  validateVerificationForm
} = require('../../cloudfunctions/verificationSubmit/logic.js');
const { normalizeVerificationStatus } = require('../../cloudfunctions/verificationList/logic.js');
const { buildReviewUpdates } = require('../../cloudfunctions/verificationReview/logic.js');

const now = 1777480000000;
const validForm = {
  studentId: '2024000000',
  realName: '张三',
  college: '计算机学院',
  grade: '2024',
  note: '长安校区'
};

describe('manual verification logic', () => {
  it('accepts valid verification form', () => {
    expect(validateVerificationForm(validForm)).toEqual({ ok: true, errors: [] });
  });

  it('rejects blank required fields and long note', () => {
    const result = validateVerificationForm({
      studentId: ' ',
      realName: '',
      college: '   ',
      grade: '',
      note: 'a'.repeat(121)
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('学号不能为空');
    expect(result.errors).toContain('姓名不能为空');
    expect(result.errors).toContain('学院不能为空');
    expect(result.errors).toContain('年级不能为空');
    expect(result.errors).toContain('备注不能超过120个字');
  });

  it('rejects student id that is not 6-20 digits', () => {
    const result = validateVerificationForm({ ...validForm, studentId: '2024A' });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('学号格式不正确');
  });

  it('rejects overlong real name, college, and grade', () => {
    const result = validateVerificationForm({
      ...validForm,
      realName: '张'.repeat(21),
      college: '计'.repeat(41),
      grade: '2'.repeat(21)
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('姓名不能超过20个字');
    expect(result.errors).toContain('学院不能超过40个字');
    expect(result.errors).toContain('年级不能超过20个字');
  });

  it('builds pending verification request document', () => {
    expect(buildVerificationRequest('openid-1', validForm, now)).toEqual({
      userOpenid: 'openid-1',
      studentId: '2024000000',
      realName: '张三',
      college: '计算机学院',
      grade: '2024',
      note: '长安校区',
      status: 'pending',
      rejectReason: '',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    });
  });

  it('trims fields when building pending verification request document', () => {
    expect(buildVerificationRequest('openid-1', {
      studentId: ' 2024000000 ',
      realName: ' 张三 ',
      college: ' 计算机学院 ',
      grade: ' 2024 ',
      note: ' 长安校区 '
    }, now)).toEqual({
      userOpenid: 'openid-1',
      studentId: '2024000000',
      realName: '张三',
      college: '计算机学院',
      grade: '2024',
      note: '长安校区',
      status: 'pending',
      rejectReason: '',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    });
  });

  it('checks whether user can submit verification', () => {
    expect(canSubmitVerification({ blocked: false }, null)).toEqual({ ok: true, error: '' });
    expect(canSubmitVerification({ blocked: true }, null)).toEqual({ ok: false, error: '账号已被限制，不能提交认证' });
    expect(canSubmitVerification({ blocked: false }, { _id: 'request-1', status: 'pending' })).toEqual({ ok: false, error: '已有认证申请正在审核中' });
  });

  it('normalizes verification list status', () => {
    expect(normalizeVerificationStatus('pending')).toBe('pending');
    expect(normalizeVerificationStatus('approved')).toBe('approved');
    expect(normalizeVerificationStatus('rejected')).toBe('rejected');
    expect(normalizeVerificationStatus('')).toBe('pending');
    expect(normalizeVerificationStatus(null)).toBe('pending');
    expect(normalizeVerificationStatus(' bad ')).toBe('pending');
  });

  it('builds approve review updates', () => {
    expect(buildReviewUpdates('approve', '', 'admin-1', now)).toEqual({
      requestUpdate: {
        status: 'approved',
        rejectReason: '',
        reviewedBy: 'admin-1',
        reviewedAt: now,
        updatedAt: now
      },
      userUpdate: {
        verified: true,
        verifiedLabel: '西工大认证',
        verifyStatus: 'verified',
        verifyMethod: 'manual',
        rejectReason: '',
        updatedAt: now
      }
    });
  });

  it('builds reject review updates', () => {
    expect(buildReviewUpdates('reject', '信息不完整', 'admin-1', now)).toEqual({
      requestUpdate: {
        status: 'rejected',
        rejectReason: '信息不完整',
        reviewedBy: 'admin-1',
        reviewedAt: now,
        updatedAt: now
      },
      userUpdate: {
        verified: false,
        verifiedLabel: '认证失败',
        verifyStatus: 'rejected',
        verifyMethod: 'manual',
        rejectReason: '信息不完整',
        updatedAt: now
      }
    });
  });

  it('builds reject review updates with fallback reason', () => {
    expect(buildReviewUpdates('reject', '', 'admin-1', now)).toEqual({
      requestUpdate: {
        status: 'rejected',
        rejectReason: '认证信息未通过审核',
        reviewedBy: 'admin-1',
        reviewedAt: now,
        updatedAt: now
      },
      userUpdate: {
        verified: false,
        verifiedLabel: '认证失败',
        verifyStatus: 'rejected',
        verifyMethod: 'manual',
        rejectReason: '认证信息未通过审核',
        updatedAt: now
      }
    });
  });

  it('rejects overlong reject reason in review updates', () => {
    expect(buildReviewUpdates('reject', 'a'.repeat(121), 'admin-1', now)).toEqual({ error: '拒绝原因不能超过120个字' });
  });

  it('returns null for invalid review action', () => {
    expect(buildReviewUpdates('bad', '', 'admin-1', now)).toBeNull();
  });
});
