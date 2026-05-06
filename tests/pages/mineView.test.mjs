import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { buildStatusUpdatePayload, formatMineTrip, getStatusLabel } = require('../../miniprogram/pages/mine/view.js');
const { getVerifyStatusView } = require('../../miniprogram/pages/verify/form.js');
const minePagePath = require.resolve('../../miniprogram/pages/mine/mine.js');

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

function loadMinePage({ results = [] } = {}) {
  delete require.cache[minePagePath];
  let pageConfig = null;
  const app = { globalData: {} };
  const calls = [];
  const wx = {
    showToast: vi.fn(),
    navigateTo: vi.fn(),
    stopPullDownRefresh: vi.fn(),
    cloud: {
      callFunction: vi.fn(({ name, data }) => {
        calls.push({ name, data });
        const result = typeof results[0] === 'function' ? results.shift()({ name, data }) : results.shift();
        return Promise.resolve({ result: result || { ok: true } });
      })
    }
  };

  globalThis.wx = wx;
  globalThis.getApp = () => app;
  globalThis.Page = (config) => {
    pageConfig = config;
  };

  require(minePagePath);
  return { page: createPageInstance(pageConfig), wx, app, calls };
}

afterEach(() => {
  delete require.cache[minePagePath];
  delete globalThis.wx;
  delete globalThis.getApp;
  delete globalThis.Page;
});

describe('mine page view helpers', () => {
  it('formats a mine trip with time and status label', () => {
    expect(formatMineTrip({
      _id: 't1',
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
      latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
      status: 'full'
    })).toMatchObject({
      _id: 't1',
      routeText: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a',
      timeText: '04/30 09:15 ~ 10:45',
      statusLabel: '\u5df2\u6ee1\u5458'
    });
  });

  it('builds status update payload', () => {
    expect(buildStatusUpdatePayload('t1', 'cancelled')).toEqual({ tripId: 't1', status: 'cancelled' });
  });

  it('falls back for unknown status', () => {
    expect(getStatusLabel('expired')).toBe('expired');
  });

  it('clears stale verification user state when userEnsure fails', async () => {
    const staleUser = { _id: 'openid-1', verifyStatus: 'verified', role: 'admin' };
    const { page, wx, app, calls } = loadMinePage({
      results: [{ ok: false, errors: ['用户初始化失败'] }]
    });
    page.data.user = staleUser;
    page.data.statusView = getVerifyStatusView(staleUser);
    app.globalData.user = staleUser;

    await page.loadUser();

    expect(calls).toEqual([{ name: 'userEnsure', data: { profile: { nickname: '' } } }]);
    expect(page.data.user).toBeNull();
    expect(page.data.statusView).toEqual(getVerifyStatusView(null));
    expect(app.globalData.user).toBeNull();
    expect(wx.showToast).toHaveBeenCalledWith({ title: '用户初始化失败', icon: 'none' });
  });
});
