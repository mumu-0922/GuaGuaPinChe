import { createRequire } from 'node:module';
import Module from 'node:module';
import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const originalLoad = Module._load;
let fakeCloud;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') return fakeCloud;
  return originalLoad.call(this, request, parent, isMain);
};

afterAll(() => {
  Module._load = originalLoad;
});

function loadCloudFunction(relativePath, options) {
  const writes = { trips: [], contactViews: [] };
  const collections = {
    users: options.users || {},
    trips: options.trips || {}
  };

  fakeCloud = {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    getWXContext() {
      return { OPENID: options.openid };
    },
    database() {
      return {
        collection(name) {
          return {
            doc(id) {
              return {
                async get() {
                  if (!Object.prototype.hasOwnProperty.call(collections[name] || {}, id)) throw new Error('not found');
                  return { data: collections[name][id] };
                },
                async update(payload) {
                  if (!Object.prototype.hasOwnProperty.call(collections[name] || {}, id)) throw new Error('not found');
                  collections[name][id] = { ...collections[name][id], ...payload.data };
                  writes[name].push({ id, payload });
                  return { updated: 1 };
                }
              };
            },
            async add(payload) {
              writes[name].push(payload);
              return { _id: `${name}-1` };
            }
          };
        }
      };
    }
  };

  const id = require.resolve(relativePath);
  delete require.cache[id];
  return { cloudFunction: require(relativePath), writes, collections };
}

const validDraft = {
  from: '长安校区',
  to: '咸阳机场',
  earliestTime: 1777500000000,
  latestTime: 1777501800000,
  peopleCount: 1,
  note: '一人一箱',
  contactType: 'qq',
  contactValue: '123456789'
};

describe('permission enforcement cloudfunction entries', () => {
  it('tripCreate accepts old verified users without verifyStatus', async () => {
    const { cloudFunction, writes } = loadCloudFunction('../../cloudfunctions/tripCreate/index.js', {
      openid: 'old-verified',
      users: {
        'old-verified': {
          nickname: '张三',
          verified: true,
          verifiedLabel: '已认证'
        }
      }
    });

    await expect(cloudFunction.main({ trip: validDraft })).resolves.toEqual({ ok: true, tripId: 'trips-1' });
    expect(writes.trips).toHaveLength(1);
  });

  it('contactView accepts old verified viewers without verifyStatus', async () => {
    const { cloudFunction, writes } = loadCloudFunction('../../cloudfunctions/contactView/index.js', {
      openid: 'old-viewer',
      users: {
        'old-viewer': {
          verified: true,
          verifiedLabel: '已认证'
        }
      },
      trips: {
        t1: {
          status: 'open',
          ownerOpenid: 'owner-1',
          contactType: 'qq',
          contactValue: '123456789'
        }
      }
    });

    await expect(cloudFunction.main({ tripId: 't1' })).resolves.toEqual({
      ok: true,
      contactType: 'qq',
      contactValue: '123456789'
    });
    expect(writes.contactViews).toHaveLength(1);
  });

  it('tripUpdateStatus rejects blocked owners before status changes', async () => {
    const { cloudFunction, writes, collections } = loadCloudFunction('../../cloudfunctions/tripUpdateStatus/index.js', {
      openid: 'blocked-owner',
      users: {
        'blocked-owner': { verifyStatus: 'verified', blocked: true }
      },
      trips: {
        t1: { ownerOpenid: 'blocked-owner', status: 'cancelled' }
      }
    });

    await expect(cloudFunction.main({ tripId: 't1', status: 'open' })).resolves.toEqual({
      ok: false,
      errors: ['账号已被限制，不能发布行程']
    });
    expect(writes.trips).toHaveLength(0);
    expect(collections.trips.t1.status).toBe('cancelled');
  });

  it('tripUpdateStatus rejects reopening trips for unverified owners', async () => {
    const { cloudFunction, writes, collections } = loadCloudFunction('../../cloudfunctions/tripUpdateStatus/index.js', {
      openid: 'owner-1',
      users: {
        'owner-1': { verifyStatus: 'unverified', blocked: false }
      },
      trips: {
        t1: { ownerOpenid: 'owner-1', status: 'cancelled' }
      }
    });

    await expect(cloudFunction.main({ tripId: 't1', status: 'open' })).resolves.toEqual({
      ok: false,
      errors: ['完成西工大认证后可发布行程']
    });
    expect(writes.trips).toHaveLength(0);
    expect(collections.trips.t1.status).toBe('cancelled');
  });

  it('tripUpdateStatus allows old verified owners to reopen trips', async () => {
    const { cloudFunction, writes, collections } = loadCloudFunction('../../cloudfunctions/tripUpdateStatus/index.js', {
      openid: 'old-owner',
      users: {
        'old-owner': { verified: true, blocked: false }
      },
      trips: {
        t1: { ownerOpenid: 'old-owner', status: 'cancelled' }
      }
    });

    await expect(cloudFunction.main({ tripId: 't1', status: 'open' })).resolves.toEqual({ ok: true });
    expect(writes.trips).toHaveLength(1);
    expect(collections.trips.t1.status).toBe('open');
  });
});
