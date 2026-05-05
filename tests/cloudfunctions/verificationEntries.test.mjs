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

const validForm = {
  studentId: '2024000000',
  realName: '张三',
  college: '计算机学院',
  grade: '2024',
  note: '长安校区'
};

function makeCollectionApi(name, state) {
  return {
    doc(id) {
      return {
        async get() {
          state.calls.push({ collection: name, method: 'doc.get', id });
          if (!Object.prototype.hasOwnProperty.call(state.collections[name] || {}, id)) throw new Error('not found');
          return { data: state.collections[name][id] };
        },
        async update(payload) {
          state.calls.push({ collection: name, method: 'doc.update', id, payload });
          const failureIndex = state.updateFailures.findIndex((failure) => failure.collection === name && failure.id === id);
          if (failureIndex >= 0) {
            const [failure] = state.updateFailures.splice(failureIndex, 1);
            throw new Error(failure.message || 'update failed');
          }
          state.updates[name].push({ id, payload });
          state.collections[name][id] = { ...(state.collections[name][id] || {}), ...payload.data };
          return { updated: 1 };
        }
      };
    },
    where(condition) {
      state.calls.push({ collection: name, method: 'where', condition });
      const query = {
        orderBy(field, direction) {
          state.calls.push({ collection: name, method: 'orderBy', field, direction });
          return query;
        },
        limit(value) {
          state.calls.push({ collection: name, method: 'limit', value });
          return query;
        },
        async get() {
          state.calls.push({ collection: name, method: 'query.get' });
          const data = state.queries[name] && state.queries[name][JSON.stringify(condition)];
          return { data: data || [] };
        }
      };
      return query;
    },
    async add(payload) {
      state.calls.push({ collection: name, method: 'add', payload });
      state.writes[name].push(payload);
      return { _id: `${name}-1` };
    }
  };
}

function loadCloudFunction(relativePath, options = {}) {
  const state = {
    calls: [],
    collections: {
      users: options.users || {},
      verificationRequests: options.verificationRequests || {}
    },
    queries: {
      verificationRequests: options.verificationRequestQueries || {}
    },
    writes: { verificationRequests: [] },
    updates: { users: [], verificationRequests: [] },
    transactions: 0,
    transactionCollections: options.transactionCollections || null,
    updateFailures: options.updateFailures || []
  };

  fakeCloud = {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    getWXContext() {
      return { OPENID: options.openid || 'openid-1' };
    },
    database() {
      return {
        collection(name) {
          return makeCollectionApi(name, state);
        },
        async runTransaction(callback) {
          state.transactions += 1;
          const originalCollections = state.collections;
          if (state.transactionCollections) {
            state.collections = state.transactionCollections;
          }
          const transaction = {
            collection(name) {
              return makeCollectionApi(name, state);
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

describe('manual verification cloudfunction entries', () => {
  it('verificationSubmit submits request and updates user to pending', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationSubmit/index.js', {
      openid: 'openid-1',
      users: { 'openid-1': { blocked: false } },
      verificationRequestQueries: {
        [JSON.stringify({ userOpenid: 'openid-1', status: 'pending' })]: []
      }
    });

    await expect(cloudFunction.main({ form: validForm })).resolves.toEqual({ ok: true, requestId: 'verificationRequests-1' });
    expect(state.calls).toEqual(expect.arrayContaining([
      { collection: 'users', method: 'doc.get', id: 'openid-1' },
      { collection: 'verificationRequests', method: 'where', condition: { userOpenid: 'openid-1', status: 'pending' } },
      { collection: 'verificationRequests', method: 'limit', value: 1 }
    ]));
    expect(state.transactions).toBe(1);
    expect(state.writes.verificationRequests).toHaveLength(1);
    expect(state.writes.verificationRequests[0].data).toMatchObject({ userOpenid: 'openid-1', status: 'pending' });
    expect(state.updates.users).toHaveLength(1);
    expect(state.updates.users[0]).toMatchObject({
      id: 'openid-1',
      payload: {
        data: {
          verified: false,
          verifiedLabel: '审核中',
          verifyStatus: 'pending',
          verifyMethod: 'manual',
          rejectReason: '',
          updatedAt: 1777480000000
        }
      }
    });
  });

  it('verificationSubmit rejects invalid form before database writes', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationSubmit/index.js', {
      openid: 'openid-1',
      users: { 'openid-1': { blocked: false } }
    });

    await expect(cloudFunction.main({ form: {} })).resolves.toEqual({
      ok: false,
      errors: ['学号不能为空', '姓名不能为空', '学院不能为空', '年级不能为空']
    });
    expect(state.writes.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationSubmit rejects when user does not exist', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationSubmit/index.js', {
      openid: 'missing-user',
      users: {}
    });

    await expect(cloudFunction.main({ form: validForm })).resolves.toEqual({ ok: false, errors: ['用户不存在'] });
    expect(state.writes.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationSubmit rejects when pending request exists', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationSubmit/index.js', {
      openid: 'openid-1',
      users: { 'openid-1': { blocked: false } },
      verificationRequestQueries: {
        [JSON.stringify({ userOpenid: 'openid-1', status: 'pending' })]: [{ _id: 'vr-1', status: 'pending' }]
      }
    });

    await expect(cloudFunction.main({ form: validForm })).resolves.toEqual({ ok: false, errors: ['已有认证申请正在审核中'] });
    expect(state.writes.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationList rejects non-admin users', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationList/index.js', {
      openid: 'user-1',
      users: { 'user-1': { role: 'user', blocked: false } }
    });

    await expect(cloudFunction.main({ status: 'pending' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
  });

  it('verificationList lets admin query requests by normalized status', async () => {
    const request = { _id: 'vr-1', status: 'rejected' };
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationList/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequestQueries: {
        [JSON.stringify({ status: 'rejected' })]: [request]
      }
    });

    await expect(cloudFunction.main({ status: 'rejected' })).resolves.toEqual({ ok: true, requests: [request] });
    expect(state.calls).toEqual(expect.arrayContaining([
      { collection: 'verificationRequests', method: 'where', condition: { status: 'rejected' } },
      { collection: 'verificationRequests', method: 'orderBy', field: 'createdAt', direction: 'desc' },
      { collection: 'verificationRequests', method: 'limit', value: 50 },
      { collection: 'verificationRequests', method: 'query.get' }
    ]));
  });

  it('verificationReview approves pending request and updates request and user', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false }, 'user-1': { role: 'user' } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).resolves.toEqual({ ok: true });
    expect(state.transactions).toBe(1);
    expect(state.updates.verificationRequests).toEqual([{ id: 'vr-1', payload: { data: {
      status: 'approved',
      rejectReason: '',
      reviewedBy: 'admin-1',
      reviewedAt: 1777480000000,
      updatedAt: 1777480000000
    } } }]);
    expect(state.updates.users).toEqual([{ id: 'user-1', payload: { data: {
      verified: true,
      verifiedLabel: '西工大认证',
      verifyStatus: 'verified',
      verifyMethod: 'manual',
      rejectReason: '',
      updatedAt: 1777480000000
    } } }]);
  });

  it('verificationReview rejects pending request and updates request and user', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false }, 'user-1': { role: 'user' } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'reject', reason: ' 信息不完整 ' })).resolves.toEqual({ ok: true });
    expect(state.transactions).toBe(1);
    expect(state.updates.verificationRequests).toEqual([{ id: 'vr-1', payload: { data: {
      status: 'rejected',
      rejectReason: '信息不完整',
      reviewedBy: 'admin-1',
      reviewedAt: 1777480000000,
      updatedAt: 1777480000000
    } } }]);
    expect(state.updates.users).toEqual([{ id: 'user-1', payload: { data: {
      verified: false,
      verifiedLabel: '认证失败',
      verifyStatus: 'rejected',
      verifyMethod: 'manual',
      rejectReason: '信息不完整',
      updatedAt: 1777480000000
    } } }]);
  });

  it('verificationReview rejects non-admin users', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'user-1',
      users: { 'user-1': { role: 'user', blocked: false } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
  });

  it('verificationReview rejects blocked admins before transaction', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: true } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
    expect(state.transactions).toBe(0);
  });

  it('verificationReview rejects when admin becomes blocked inside transaction', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } },
      transactionCollections: {
        users: { 'admin-1': { role: 'admin', blocked: true }, 'user-1': { role: 'user' } },
        verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
      }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
    expect(state.transactions).toBe(1);
    expect(state.updates.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationReview rejects when admin role is revoked inside transaction', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } },
      transactionCollections: {
        users: { 'admin-1': { role: 'user', blocked: false }, 'user-1': { role: 'user' } },
        verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
      }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).resolves.toEqual({ ok: false, errors: ['无管理员权限'] });
    expect(state.transactions).toBe(1);
    expect(state.updates.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationReview rejects overlong reject reason without updates', async () => {
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false }, 'user-1': { role: 'user' } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'reject', reason: 'a'.repeat(121) })).resolves.toEqual({ ok: false, errors: ['拒绝原因不能超过120个字'] });
    expect(state.transactions).toBe(1);
    expect(state.updates.verificationRequests).toHaveLength(0);
    expect(state.updates.users).toHaveLength(0);
  });

  it('verificationReview does not return ok when user update fails', async () => {
    vi.setSystemTime(1777480000000);
    const { cloudFunction, state } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false }, 'user-1': { role: 'user' } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } },
      updateFailures: [{ collection: 'users', id: 'user-1', message: 'user update failed' }]
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'approve' })).rejects.toThrow('user update failed');
    expect(state.transactions).toBe(1);
  });

  it('verificationReview rejects missing request id', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } }
    });

    await expect(cloudFunction.main({ action: 'approve' })).resolves.toEqual({ ok: false, errors: ['认证申请ID不能为空'] });
  });

  it('verificationReview rejects when request does not exist', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequests: {}
    });

    await expect(cloudFunction.main({ requestId: 'missing-vr', action: 'approve' })).resolves.toEqual({ ok: false, errors: ['认证申请不存在'] });
  });

  it('verificationReview rejects non-pending request', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'approved' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'reject' })).resolves.toEqual({ ok: false, errors: ['认证申请已处理'] });
  });

  it('verificationReview rejects invalid action', async () => {
    const { cloudFunction } = loadCloudFunction('../../cloudfunctions/verificationReview/index.js', {
      openid: 'admin-1',
      users: { 'admin-1': { role: 'admin', blocked: false } },
      verificationRequests: { 'vr-1': { _id: 'vr-1', userOpenid: 'user-1', status: 'pending' } }
    });

    await expect(cloudFunction.main({ requestId: 'vr-1', action: 'bad' })).resolves.toEqual({ ok: false, errors: ['审核动作无效'] });
  });
});
