import { createRequire } from 'node:module';
import Module from 'node:module';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.useRealTimers();
});

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function matches(doc, condition) {
  return Object.entries(condition || {}).every(([key, value]) => doc && doc[key] === value);
}

function makeQueryApi(name, state, condition = null) {
  const query = {
    _condition: condition,
    _order: null,
    _limit: null,
    _skip: 0,
    where(nextCondition) {
      state.calls.push({ collection: name, method: 'where', condition: nextCondition });
      query._condition = nextCondition;
      return query;
    },
    orderBy(field, direction) {
      state.calls.push({ collection: name, method: 'orderBy', field, direction });
      query._order = { field, direction };
      return query;
    },
    limit(value) {
      state.calls.push({ collection: name, method: 'limit', value });
      query._limit = value;
      return query;
    },
    skip(value) {
      state.calls.push({ collection: name, method: 'skip', value });
      query._skip = value;
      return query;
    },
    async get() {
      state.calls.push({ collection: name, method: 'query.get', condition: query._condition, limit: query._limit, skip: query._skip });
      let rows = Object.entries(state.collections[name] || {}).map(([id, doc]) => ({ _id: id, ...doc }));
      if (query._condition) rows = rows.filter((doc) => matches(doc, query._condition));
      if (query._order) {
        const { field, direction } = query._order;
        rows = rows.sort((a, b) => {
          const av = a[field] || 0;
          const bv = b[field] || 0;
          return direction === 'desc' ? bv - av : av - bv;
        });
      }
      if (query._skip) rows = rows.slice(query._skip);
      const defaultLimit = state.defaultQueryLimits[name] || null;
      const effectiveLimit = query._limit !== null ? query._limit : defaultLimit;
      if (effectiveLimit !== null) rows = rows.slice(0, effectiveLimit);
      return { data: clone(rows) };
    },
    async update(payload) {
      state.calls.push({ collection: name, method: 'query.update', condition: query._condition, payload });
      let updated = 0;
      Object.keys(state.collections[name] || {}).forEach((id) => {
        if (!query._condition || matches(state.collections[name][id], query._condition)) {
          state.collections[name][id] = { ...state.collections[name][id], ...payload.data };
          state.updates[name].push({ id, payload });
          updated += 1;
        }
      });
      return { updated };
    }
  };
  return query;
}

function makeCollectionApi(name, state, options = {}) {
  return {
    doc(id) {
      return {
        async get() {
          state.calls.push({ collection: name, method: 'doc.get', id, transaction: Boolean(options.transaction) });
          const failureIndex = state.docGetFailures.findIndex((failure) => failure.collection === name && failure.id === id);
          if (failureIndex >= 0) {
            const [failure] = state.docGetFailures.splice(failureIndex, 1);
            throw new Error(failure.message);
          }
          if (!Object.prototype.hasOwnProperty.call(state.collections[name] || {}, id)) throw new Error('not found');
          return { data: clone({ _id: id, ...state.collections[name][id] }) };
        },
        async update(payload) {
          state.calls.push({ collection: name, method: 'doc.update', id, payload });
          if (!Object.prototype.hasOwnProperty.call(state.collections[name] || {}, id)) throw new Error('not found');
          state.collections[name][id] = { ...state.collections[name][id], ...payload.data };
          state.updates[name].push({ id, payload });
          return { updated: 1 };
        }
      };
    },
    where(condition) {
      state.calls.push({ collection: name, method: 'where', condition, transaction: Boolean(options.transaction) });
      if (options.transaction && state.transactionWhereUnsupported) throw new Error('transaction where unsupported');
      return makeQueryApi(name, state, condition);
    },
    orderBy(field, direction) {
      return makeQueryApi(name, state).orderBy(field, direction);
    },
    limit(value) {
      return makeQueryApi(name, state).limit(value);
    }
  };
}

function loadCloudFunction(relativePath, options = {}) {
  const state = {
    calls: [],
    collections: {
      users: clone(options.users),
      reports: clone(options.reports),
      trips: clone(options.trips)
    },
    updates: { users: [], reports: [], trips: [] },
    transactions: 0,
    transactionCollections: options.transactionCollections ? clone(options.transactionCollections) : null,
    defaultQueryLimits: options.defaultQueryLimits || {},
    docGetFailures: [...(options.docGetFailures || [])],
    transactionWhereUnsupported: options.transactionWhereUnsupported !== false
  };

  fakeCloud = {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    getWXContext() {
      return { OPENID: options.openid || 'admin-1' };
    },
    database() {
      return {
        collection(name) {
          return makeCollectionApi(name, state);
        },
        async runTransaction(callback) {
          state.transactions += 1;
          const originalCollections = state.collections;
          if (state.transactionCollections) state.collections = state.transactionCollections;
          const transaction = {
            collection(name) {
              return makeCollectionApi(name, state, { transaction: true });
            }
          };
          try {
            return await callback(transaction);
          } finally {
            state.collections = originalCollections;
          }
        }
      };
    }
  };

  const id = require.resolve(relativePath);
  delete require.cache[id];
  return { cloudFunction: require(relativePath), state };
}

const adminUsers = {
  'admin-1': { openid: 'admin-1', role: 'admin', blocked: false, updatedAt: 10 },
  'blocked-admin': { openid: 'blocked-admin', role: 'admin', blocked: true, updatedAt: 10 },
  'user-1': { openid: 'user-1', role: 'user', blocked: false, updatedAt: 9 }
};

describe('admin governance cloudfunction entries', () => {
  it('rejects non-admin and blocked admin before report resolve transaction', async () => {
    const nonAdmin = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      openid: 'user-1',
      users: adminUsers
    });
    await expect(nonAdmin.cloudFunction.main({ reportId: 'r1', status: 'reviewed' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
    expect(nonAdmin.state.transactions).toBe(0);

    const blockedAdmin = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      openid: 'blocked-admin',
      users: adminUsers
    });
    await expect(blockedAdmin.cloudFunction.main({ userOpenid: 'user-1', action: 'block' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
    expect(blockedAdmin.state.transactions).toBe(0);
  });

  it('adminReportResolve updates report and hides trip inside transaction', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      users: adminUsers,
      reports: { 'r1': { tripId: 't1', status: 'open' } },
      trips: { 't1': { ownerOpenid: 'user-1', status: 'open' } }
    });

    await expect(cloudFunction.main({ reportId: 'r1', status: 'reviewed', note: '已处理', hideTrip: true })).resolves.toEqual({ ok: true });
    expect(state.transactions).toBe(1);
    expect(state.collections.reports.r1).toMatchObject({ status: 'reviewed', resolutionNote: '已处理', resolvedBy: 'admin-1', resolvedAt: 1777480000000 });
    expect(state.collections.trips.t1).toMatchObject({ status: 'hidden', updatedAt: 1777480000000 });
  });

  it('adminReportResolve returns report missing from transaction as business error', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      users: adminUsers,
      reports: {}
    });

    await expect(cloudFunction.main({ reportId: 'missing', status: 'reviewed' })).resolves.toEqual({ ok: false, errors: ['举报不存在'] });
    expect(state.transactions).toBe(1);
  });



  it('adminReportResolve returns trip missing when hideTrip has no tripId', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      users: adminUsers,
      reports: { r1: { status: 'open' } }
    });

    await expect(cloudFunction.main({ reportId: 'r1', status: 'reviewed', hideTrip: true })).resolves.toEqual({ ok: false, errors: ['\u884c\u7a0b\u4e0d\u5b58\u5728'] });
  });

  it('adminReportResolve returns trip missing when hideTrip trip doc does not exist', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      users: adminUsers,
      reports: { r1: { status: 'open', tripId: 'missing-trip' } },
      trips: {}
    });

    await expect(cloudFunction.main({ reportId: 'r1', status: 'reviewed', hideTrip: true })).resolves.toEqual({ ok: false, errors: ['\u884c\u7a0b\u4e0d\u5b58\u5728'] });
  });

  it('adminReportList rejects system errors from requireAdmin doc get', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/adminReportList/index.js', {
      openid: 'admin-1',
      users: adminUsers,
      docGetFailures: [{ collection: 'users', id: 'admin-1', message: 'database unavailable' }]
    });

    await expect(cloudFunction.main({ status: 'open' })).rejects.toThrow('database unavailable');
  });


  it('adminReportList lets admin query reports by normalized status', async () => {
    const reports = {
      'r-open': { status: 'open', createdAt: 3 },
      'r-reviewed': { status: 'reviewed', createdAt: 2 }
    };
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminReportList/index.js', {
      users: adminUsers,
      reports
    });

    await expect(cloudFunction.main({ status: 'bad-status' })).resolves.toEqual({
      ok: true,
      reports: [{ _id: 'r-open', status: 'open', createdAt: 3 }]
    });
    expect(state.calls).toContainEqual({ collection: 'reports', method: 'where', condition: { status: 'open' }, transaction: false });
    expect(state.calls).toContainEqual({ collection: 'reports', method: 'orderBy', field: 'createdAt', direction: 'desc' });
    expect(state.calls).toContainEqual({ collection: 'reports', method: 'limit', value: 50 });
  });

  it('adminReportResolve rejects system errors from transaction report doc get', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/adminReportResolve/index.js', {
      users: adminUsers,
      reports: { r1: { status: 'open' } },
      docGetFailures: [{ collection: 'reports', id: 'r1', message: 'permission denied' }]
    });

    await expect(cloudFunction.main({ reportId: 'r1', status: 'reviewed' })).rejects.toThrow('permission denied');
  });


  it('adminUserBlock rejects invalid action before transaction without updates', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers,
      trips: { 't-open': { ownerOpenid: 'user-1', status: 'open' } }
    });

    await expect(cloudFunction.main({ userOpenid: 'user-1', action: 'mute' })).resolves.toEqual({ ok: false, errors: ['\u64cd\u4f5c\u65e0\u6548'] });
    expect(state.transactions).toBe(0);
    expect(state.updates.users).toHaveLength(0);
    expect(state.updates.trips).toHaveLength(0);
  });

  it('adminUserBlock rejects overlong reason before transaction without updates', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers,
      trips: { 't-open': { ownerOpenid: 'user-1', status: 'open' } }
    });

    await expect(cloudFunction.main({ userOpenid: 'user-1', action: 'block', reason: '\u8fdd'.repeat(121) })).resolves.toEqual({ ok: false, errors: ['\u62c9\u9ed1\u539f\u56e0\u4e0d\u80fd\u8d85\u8fc7120\u4e2a\u5b57'] });
    expect(state.transactions).toBe(0);
    expect(state.updates.users).toHaveLength(0);
    expect(state.updates.trips).toHaveLength(0);
  });

  it('adminUserBlock rejects self operation before transaction', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers
    });

    await expect(cloudFunction.main({ userOpenid: 'admin-1', action: 'block' })).resolves.toEqual({ ok: false, errors: ['\u4e0d\u80fd\u64cd\u4f5c\u81ea\u5df1'] });
    expect(state.transactions).toBe(0);
  });

  it('adminUserBlock returns target user missing from transaction as business error', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers
    });

    await expect(cloudFunction.main({ userOpenid: 'missing', action: 'block' })).resolves.toEqual({ ok: false, errors: ['用户不存在'] });
    expect(state.transactions).toBe(1);
  });

  it('adminUserBlock blocks target user in transaction and hides open trips outside transaction', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers,
      trips: {
        't-open-1': { ownerOpenid: 'user-1', status: 'open', updatedAt: 1 },
        't-open-2': { ownerOpenid: 'user-1', status: 'open', updatedAt: 2 },
        't-hidden': { ownerOpenid: 'user-1', status: 'hidden', updatedAt: 3 },
        't-other': { ownerOpenid: 'other', status: 'open', updatedAt: 4 }
      }
    });

    await expect(cloudFunction.main({ userOpenid: 'user-1', action: 'block', reason: '广告' })).resolves.toEqual({ ok: true });
    expect(state.transactions).toBe(1);
    expect(state.collections.users['user-1']).toMatchObject({ blocked: true, blockedReason: '广告', blockedBy: 'admin-1' });
    expect(state.collections.trips['t-open-1']).toMatchObject({ status: 'hidden', updatedAt: 1777480000000 });
    expect(state.collections.trips['t-open-2']).toMatchObject({ status: 'hidden', updatedAt: 1777480000000 });
    expect(state.collections.trips['t-hidden']).toMatchObject({ status: 'hidden', updatedAt: 3 });
    expect(state.calls.filter((call) => call.collection === 'trips' && call.method === 'where').every((call) => !call.transaction)).toBe(true);
  });

  it('adminUserBlock hides all open trips across multiple limited query rounds', async () => {
    vi.setSystemTime(1777480000000);
    const trips = {};
    for (let index = 0; index < 5; index += 1) {
      trips[`t-open-${index}`] = { ownerOpenid: 'user-1', status: 'open', updatedAt: index };
    }
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: adminUsers,
      trips,
      defaultQueryLimits: { trips: 2 }
    });

    await expect(cloudFunction.main({ userOpenid: 'user-1', action: 'block', reason: '广告' })).resolves.toEqual({ ok: true });
    expect(Object.values(state.collections.trips).every((trip) => trip.status === 'hidden')).toBe(true);
    const tripGets = state.calls.filter((call) => call.collection === 'trips' && call.method === 'query.get');
    expect(tripGets.length).toBeGreaterThan(1);
    expect(state.updates.trips).toHaveLength(5);
  });
  it('adminUserBlock unblocks target user without restoring hidden trips', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserBlock/index.js', {
      users: { ...adminUsers, 'user-1': { openid: 'user-1', role: 'user', blocked: true, blockedReason: '广告' } },
      trips: { 't-hidden': { ownerOpenid: 'user-1', status: 'hidden', updatedAt: 3 } }
    });

    await expect(cloudFunction.main({ userOpenid: 'user-1', action: 'unblock' })).resolves.toEqual({ ok: true });
    expect(state.collections.users['user-1']).toMatchObject({ blocked: false, blockedReason: '', blockedAt: null, blockedBy: '' });
    expect(state.collections.trips['t-hidden']).toMatchObject({ status: 'hidden', updatedAt: 3 });
  });

  it('adminUserList without keyword uses filters, orderBy updatedAt desc, and limit 50', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserList/index.js', {
      users: adminUsers
    });

    await expect(cloudFunction.main({ verifyStatus: 'verified', blocked: false })).resolves.toMatchObject({ ok: true });
    expect(state.calls).toContainEqual({ collection: 'users', method: 'where', condition: { verifyStatus: 'verified', blocked: false }, transaction: false });
    expect(state.calls).toContainEqual({ collection: 'users', method: 'orderBy', field: 'updatedAt', direction: 'desc' });
    expect(state.calls).toContainEqual({ collection: 'users', method: 'limit', value: 50 });
  });

  it('adminUserList with keyword scans beyond first page and finds later matches', async () => {
    const users = { 'admin-1': adminUsers['admin-1'] };
    for (let index = 0; index < 120; index += 1) {
      const id = `openid-${String(index).padStart(6, '0')}`;
      users[id] = { openid: id, nickname: index === 119 ? 'needle 同学' : `同学${index}`, verifyStatus: 'verified', blocked: false, role: 'user', updatedAt: 1000 - index };
    }
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/adminUserList/index.js', { users });

    const result = await cloudFunction.main({ verifyStatus: 'verified', blocked: 'false', keyword: 'needle' });
    expect(result.users).toHaveLength(1);
    expect(result.users[0].nickname).toBe('needle 同学');
    expect(state.calls).toContainEqual({ collection: 'users', method: 'limit', value: 100 });
    expect(state.calls).toContainEqual({ collection: 'users', method: 'skip', value: 100 });
  });
});

