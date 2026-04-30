import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildContactViewLog, canRevealContact } = require('../../cloudfunctions/contactView/logic.js');

describe('contactView logic', () => {
  it('allows open trips', () => {
    expect(canRevealContact({ status: 'open' })).toEqual({ ok: true, error: '' });
  });

  it('rejects hidden trips', () => {
    expect(canRevealContact({ status: 'hidden' })).toEqual({ ok: false, error: '\u884c\u7a0b\u4e0d\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' });
  });

  it('rejects cancelled and expired trips', () => {
    expect(canRevealContact({ status: 'cancelled' }).ok).toBe(false);
    expect(canRevealContact({ status: 'expired' }).ok).toBe(false);
  });

  it('builds contact view audit log', () => {
    expect(buildContactViewLog('t1', 'viewer', 'owner', 1777480000000)).toEqual({
      tripId: 't1',
      viewerOpenid: 'viewer',
      ownerOpenid: 'owner',
      createdAt: 1777480000000
    });
  });
});
