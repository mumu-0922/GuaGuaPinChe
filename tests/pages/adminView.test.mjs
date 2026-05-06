import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  formatAdminUser,
  getReportStatusLabel,
  getVerifyRequestTitle
} = require('../../miniprogram/pages/admin/view.js');
const adminPagePath = require.resolve('../../miniprogram/pages/admin/admin.js');

function applyData(target, patch) {
  Object.entries(patch).forEach(([key, value]) => {
    if (!key.includes('.')) {
      target[key] = value;
      return;
    }
    const parts = key.split('.');
    let cursor = target;
    parts.slice(0, -1).forEach((part) => {
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
  });
}

function createPageInstance(config) {
  return {
    ...config,
    data: JSON.parse(JSON.stringify(config.data)),
    setData(update) {
      applyData(this.data, update);
    }
  };
}

function loadAdminPage({ results = [], modalResults = [] } = {}) {
  delete require.cache[adminPagePath];
  let pageConfig = null;
  const calls = [];
  const wx = {
    showToast: vi.fn(),
    showModal: vi.fn((options) => {
      const result = modalResults.length ? modalResults.shift() : { confirm: true };
      if (options && typeof options.success === 'function') options.success(result);
      return Promise.resolve(result);
    }),
    cloud: {
      callFunction: vi.fn(({ name, data }) => {
        calls.push({ name, data });
        const result = typeof results[0] === 'function' ? results.shift()({ name, data }) : results.shift();
        if (result instanceof Error) return Promise.reject(result);
        return Promise.resolve({ result: result || { ok: true } });
      })
    }
  };

  globalThis.wx = wx;
  globalThis.Page = (config) => {
    pageConfig = config;
  };

  require(adminPagePath);
  return { page: createPageInstance(pageConfig), wx, calls };
}

afterEach(() => {
  delete require.cache[adminPagePath];
  delete globalThis.wx;
  delete globalThis.Page;
});

describe('admin page view helpers', () => {
  it('formats verification request title with identity fields', () => {
    expect(getVerifyRequestTitle({ realName: '张三', studentId: '2024000000', college: '计算机学院' })).toBe('张三 · 2024000000 · 计算机学院');
  });

  it('formats report statuses with fallback', () => {
    expect(getReportStatusLabel('open')).toBe('待处理');
    expect(getReportStatusLabel('reviewed')).toBe('已处理');
    expect(getReportStatusLabel('rejected')).toBe('已驳回');
    expect(getReportStatusLabel('archived')).toBe('archived');
    expect(getReportStatusLabel()).toBe('未知状态');
  });

  it('formats blocked admin user summary', () => {
    expect(formatAdminUser({ nickname: '同学', openidTail: 'abc123', verifiedLabel: '西工大认证', blocked: true, blockedReason: '广告' })).toEqual({
      title: '同学 · abc123',
      verifyText: '西工大认证',
      blockText: '已拉黑：广告'
    });
  });

  it('formats unblocked and incomplete user fields with safe fallback', () => {
    expect(formatAdminUser({})).toEqual({
      title: '同学 · 未知用户',
      verifyText: '未认证',
      blockText: '未拉黑'
    });
  });
});

describe('admin page flow', () => {
  it('switches tabs and loads reports from cloud', async () => {
    const { page, calls } = loadAdminPage({ results: [{ ok: true, reports: [{ _id: 'r1', status: 'open' }] }] });

    await page.switchTab({ currentTarget: { dataset: { tab: 'reports' } } });

    expect(calls).toEqual([{ name: 'adminReportList', data: {} }]);
    expect(page.data.activeTab).toBe('reports');
    expect(page.data.reports).toMatchObject([{ _id: 'r1', statusLabel: '待处理' }]);
  });

  it('asks for confirmation before rejecting verification request', async () => {
    const { page, wx, calls } = loadAdminPage({
      modalResults: [{ confirm: true, content: '资料不清晰' }],
      results: [{ ok: true }, { ok: true, requests: [] }]
    });

    await page.reviewVerify({ currentTarget: { dataset: { id: 'req-1', action: 'reject' } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(calls).toEqual([
      { name: 'verificationReview', data: { requestId: 'req-1', action: 'reject', reason: '资料不清晰' } },
      { name: 'verificationList', data: {} }
    ]);
  });

  it('asks for confirmation before hiding a reported trip', async () => {
    const { page, wx, calls } = loadAdminPage({
      modalResults: [{ confirm: true, content: '黑车' }],
      results: [{ ok: true }, { ok: true, reports: [] }]
    });

    await page.resolveReport({ currentTarget: { dataset: { id: 'report-1', status: 'reviewed', hideTrip: true } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(calls).toEqual([
      { name: 'adminReportResolve', data: { reportId: 'report-1', status: 'reviewed', hideTrip: true, note: '黑车' } },
      { name: 'adminReportList', data: {} }
    ]);
  });

  it('asks for confirmation before rejecting a report', async () => {
    const { page, wx, calls } = loadAdminPage({
      modalResults: [{ confirm: true, content: '证据不足' }],
      results: [{ ok: true }, { ok: true, reports: [] }]
    });

    await page.resolveReport({ currentTarget: { dataset: { id: 'report-2', status: 'rejected', hideTrip: false } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(calls).toEqual([
      { name: 'adminReportResolve', data: { reportId: 'report-2', status: 'rejected', hideTrip: false, note: '证据不足' } },
      { name: 'adminReportList', data: {} }
    ]);
  });

  it('does not reject a report when confirmation is cancelled', async () => {
    const { page, wx, calls } = loadAdminPage({
      modalResults: [{ confirm: false }],
      results: [{ ok: true }, { ok: true, reports: [] }]
    });

    await page.resolveReport({ currentTarget: { dataset: { id: 'report-3', status: 'rejected', hideTrip: false } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(calls).toEqual([]);
  });
  it('asks for confirmation before blocking a user', async () => {
    const { page, wx, calls } = loadAdminPage({
      modalResults: [{ confirm: true, content: '广告' }],
      results: [{ ok: true }, { ok: true, users: [] }]
    });

    await page.blockUser({ currentTarget: { dataset: { openid: 'openid-1', action: 'block' } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(calls).toEqual([
      { name: 'adminUserBlock', data: { userOpenid: 'openid-1', action: 'block', reason: '广告' } },
      { name: 'adminUserList', data: {} }
    ]);
  });
});
