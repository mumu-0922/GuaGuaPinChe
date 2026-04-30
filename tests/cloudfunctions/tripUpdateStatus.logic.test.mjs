import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { validateStatusTransition } = require('../../cloudfunctions/tripUpdateStatus/logic.js');

describe('tripUpdateStatus logic', () => {
  it('allows owner-visible status changes', () => {
    expect(validateStatusTransition('full')).toEqual({ ok: true, error: '' });
    expect(validateStatusTransition('cancelled')).toEqual({ ok: true, error: '' });
  });

  it('rejects hidden because only admin can hide', () => {
    expect(validateStatusTransition('hidden')).toEqual({ ok: false, error: '\u72b6\u6001\u4e0d\u5141\u8bb8\u4fee\u6539' });
  });
});
