import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { buildDefaultDraft, buildTripDraftFromForm, combineDateTime, setDraftField } = require('../../miniprogram/pages/publish/form.js');
const publishPagePath = require.resolve('../../miniprogram/pages/publish/publish.js');

const validDraft = {
  from: '长安校区',
  to: '咸阳机场',
  date: '2026-04-30',
  earliestClock: '09:15',
  latestClock: '10:45',
  peopleCount: 3,
  contactType: 'wechat',
  contactValue: 'wxid_123',
  note: '一人一箱'
};

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

function loadPublishPage({ results = [] } = {}) {
  delete require.cache[publishPagePath];
  let pageConfig = null;
  const app = { globalData: {} };
  const calls = [];
  const wx = {
    showToast: vi.fn(),
    showModal: vi.fn(),
    navigateTo: vi.fn(),
    switchTab: vi.fn(),
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
  globalThis.getApp = () => app;
  globalThis.Page = (config) => {
    pageConfig = config;
  };
  vi.stubGlobal('setTimeout', vi.fn((callback) => {
    callback();
    return 1;
  }));

  require(publishPagePath);
  return { page: createPageInstance(pageConfig), wx, app, calls };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  delete require.cache[publishPagePath];
  delete globalThis.wx;
  delete globalThis.getApp;
  delete globalThis.Page;
  vi.unstubAllGlobals();
});

describe('publish form helpers', () => {
  it('builds a default draft with contact type and people count', () => {
    const draft = buildDefaultDraft(new Date(2026, 3, 30, 8, 20));
    expect(draft).toMatchObject({
      from: '',
      to: '',
      peopleCount: 1,
      contactType: 'qq',
      contactValue: '',
      note: '',
      date: '2026-04-30'
    });
    expect(draft.earliestClock).toBe('09:20');
    expect(draft.latestClock).toBe('09:50');
  });

  it('combines date and clock into a local timestamp', () => {
    expect(combineDateTime('2026-04-30', '09:15')).toBe(new Date(2026, 3, 30, 9, 15).getTime());
  });

  it('builds a validated trip draft from form fields', () => {
    expect(buildTripDraftFromForm({
      from: ' \u957f\u5b89\u6821\u533a ',
      to: '\u54b8\u9633\u673a\u573a',
      date: '2026-04-30',
      earliestClock: '09:15',
      latestClock: '10:45',
      peopleCount: '3',
      contactType: 'wechat',
      contactValue: '  wxid_123 ',
      note: ' \u4e00\u4eba\u4e00\u7bb1 '
    })).toEqual({
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
      latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
      peopleCount: 3,
      contactType: 'wechat',
      contactValue: 'wxid_123',
      note: '\u4e00\u4eba\u4e00\u7bb1'
    });
  });

  it('updates one field without mutating the original draft', () => {
    const draft = buildDefaultDraft(new Date(2026, 3, 30, 8, 20));
    const next = setDraftField(draft, 'from', '\u53cb\u8c0a\u6821\u533a');
    expect(next.from).toBe('\u53cb\u8c0a\u6821\u533a');
    expect(draft.from).toBe('');
  });
});

describe('publish page flow', () => {
  it('checks similar trips by created trip id and shows count modal', async () => {
    const similarTrip = { _id: 'near-trip' };
    const { page, wx, calls } = loadPublishPage({
      results: [
        { ok: true, user: { verifyStatus: 'verified' } },
        { ok: true, tripId: 'new-trip' },
        { ok: true, trips: [similarTrip] }
      ]
    });
    page.data.draft = { ...validDraft };

    page.submitTrip();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showModal).toHaveBeenCalled());

    expect(calls[2]).toEqual({ name: 'tripSimilar', data: { tripId: 'new-trip' } });
    expect(calls[2].data).not.toHaveProperty('trip');
    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '发布成功',
      content: '发现 1 个相似行程，可以去看看',
      showCancel: false
    }));
  });

  it('keeps publish success when tripSimilar rejects', async () => {
    const { page, wx, calls } = loadPublishPage({
      results: [
        { ok: true, user: { verifyStatus: 'verified' } },
        { ok: true, tripId: 'new-trip' },
        new Error('similar failed')
      ]
    });
    page.data.draft = { ...validDraft };

    page.submitTrip();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showToast).toHaveBeenCalledWith({ title: '已发布', icon: 'success' }));

    expect(calls.map((call) => call.name)).toEqual(['userEnsure', 'tripCreate', 'tripSimilar']);
    expect(wx.switchTab).toHaveBeenCalledWith({ url: '/pages/index/index' });
    expect(wx.showToast).not.toHaveBeenCalledWith({ title: '发布失败', icon: 'none' });
  });

  it('prompts pending users to verify before creating a trip', async () => {
    const { page, wx, calls } = loadPublishPage({
      results: [
        { ok: true, user: { verifyStatus: 'pending' } }
      ]
    });
    page.data.draft = { ...validDraft };

    page.submitTrip();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showModal).toHaveBeenCalled());

    expect(calls.map((call) => call.name)).toEqual(['userEnsure']);
    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '需要校园认证',
      content: '认证审核中，通过后可发布行程',
      confirmText: '去认证'
    }));
    expect(page.data.submitting).toBe(false);

    wx.showModal.mock.calls[0][0].success({ confirm: true });
    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/verify/verify' });
  });

  it('prompts blocked users without navigating to verify or creating a trip', async () => {
    const { page, wx, calls } = loadPublishPage({
      results: [
        { ok: true, user: { verifyStatus: 'verified', blocked: true, blockedReason: '\u8fdd\u89c4\u53d1\u5e03' } }
      ]
    });
    page.data.draft = { ...validDraft };

    page.submitTrip();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showModal).toHaveBeenCalled());

    expect(calls.map((call) => call.name)).toEqual(['userEnsure']);
    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236',
      content: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u53d1\u5e03\u884c\u7a0b\uff1a\u8fdd\u89c4\u53d1\u5e03',
      showCancel: false
    }));
    expect(wx.showModal.mock.calls[0][0]).not.toHaveProperty('confirmText', '\u53bb\u8ba4\u8bc1');
    expect(page.data.submitting).toBe(false);

    wx.showModal.mock.calls[0][0].success?.({ confirm: true });
    expect(wx.navigateTo).not.toHaveBeenCalled();
  });

  it('allows legacy verified users without verifyStatus to create a trip', async () => {
    const { page, wx, calls } = loadPublishPage({
      results: [
        { ok: true, user: { verified: true } },
        { ok: true, tripId: 'legacy-trip' },
        { ok: true, trips: [] }
      ]
    });
    page.data.draft = { ...validDraft };

    page.submitTrip();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showToast).toHaveBeenCalledWith({ title: '\u5df2\u53d1\u5e03', icon: 'success' }));

    expect(calls.map((call) => call.name)).toEqual(['userEnsure', 'tripCreate', 'tripSimilar']);
    expect(calls[1].data).toHaveProperty('trip');
    expect(calls[2]).toEqual({ name: 'tripSimilar', data: { tripId: 'legacy-trip' } });
  });
});
