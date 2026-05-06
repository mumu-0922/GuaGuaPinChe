import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { canOwnerUpdateTripStatus, validateStatusTransition } = require('../../cloudfunctions/tripUpdateStatus/logic.js');

describe('tripUpdateStatus logic', () => {
  it('allows owner-visible status changes', () => {
    expect(validateStatusTransition('full')).toEqual({ ok: true, error: '' });
    expect(validateStatusTransition('cancelled')).toEqual({ ok: true, error: '' });
  });

  it('rejects hidden because only admin can hide', () => {
    expect(validateStatusTransition('hidden')).toEqual({ ok: false, error: '\u72b6\u6001\u4e0d\u5141\u8bb8\u4fee\u6539' });
  });

  it('checks owner permissions before reopening a trip', () => {
    expect(canOwnerUpdateTripStatus({ verifyStatus: 'verified', blocked: false }, 'open')).toEqual({ ok: true, error: '' });
    expect(canOwnerUpdateTripStatus({ verified: true, blocked: false }, 'open')).toEqual({ ok: true, error: '' });
    expect(canOwnerUpdateTripStatus({ verifyStatus: 'unverified', blocked: false }, 'open')).toEqual({ ok: false, error: '完成西工大认证后可发布行程' });
    expect(canOwnerUpdateTripStatus({ verifyStatus: 'pending', blocked: false }, 'open')).toEqual({ ok: false, error: '认证审核中，通过后可发布行程' });
    expect(canOwnerUpdateTripStatus({ verifyStatus: 'verified', blocked: true }, 'cancelled')).toEqual({ ok: false, error: '账号已被限制，不能发布行程' });
  });
});
