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
  return { cloudFunction: require(relativePath), writes };
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
});
