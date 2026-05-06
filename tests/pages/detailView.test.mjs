import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { buildShareMessage, formatContact, formatTripView } = require('../../miniprogram/pages/detail/view.js');
const detailPagePath = require.resolve('../../miniprogram/pages/detail/detail.js');

const trip = {
  _id: 't1',
  from: '\u957f\u5b89\u6821\u533a',
  to: '\u54b8\u9633\u673a\u573a',
  earliestTime: new Date(2026, 3, 30, 9, 15).getTime(),
  latestTime: new Date(2026, 3, 30, 10, 45).getTime(),
  peopleCount: 3,
  ownerNickname: '\u5f20*',
  ownerVerified: true,
  note: 'T5'
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

function loadDetailPage({ results = [] } = {}) {
  delete require.cache[detailPagePath];
  let pageConfig = null;
  const calls = [];
  const wx = {
    showToast: vi.fn(),
    showModal: vi.fn(),
    navigateTo: vi.fn(),
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

  require(detailPagePath);
  return { page: createPageInstance(pageConfig), wx, calls };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  delete require.cache[detailPagePath];
  delete globalThis.wx;
  delete globalThis.Page;
  vi.unstubAllGlobals();
});

describe('detail page view helpers', () => {
  it('formats public trip fields for display without contact', () => {
    expect(formatTripView(trip)).toEqual({
      routeText: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a',
      timeText: '04/30 09:15 ~ 10:45',
      peopleText: '3\u4eba\u540c\u884c',
      ownerText: '\u5f20* \u00b7 \u5df2\u8ba4\u8bc1',
      noteText: 'T5'
    });
  });

  it('formats revealed contact exactly as type and value', () => {
    expect(formatContact({ contactType: 'qq', contactValue: '123456789' })).toBe('qq: 123456789');
  });

  it('builds a share message containing the trip id', () => {
    expect(buildShareMessage('t1', trip)).toEqual({
      title: '\u957f\u5b89\u6821\u533a \u2192 \u54b8\u9633\u673a\u573a \u62fc\u8f66',
      path: '/pages/detail/detail?id=t1'
    });
  });
});

describe('detail page contact flow', () => {
  it('prompts certification errors and navigates to verify on confirm', async () => {
    const { page, wx, calls } = loadDetailPage({
      results: [
        { ok: false, errors: ['完成西工大认证后可查看联系方式'] }
      ]
    });
    page.data.tripId = 't1';

    page.revealContact();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showModal).toHaveBeenCalled());

    expect(calls).toEqual([{ name: 'contactView', data: { tripId: 't1' } }]);
    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '需要校园认证',
      content: '完成西工大认证后可查看联系方式',
      confirmText: '去认证'
    }));
    expect(wx.showToast).not.toHaveBeenCalledWith({ title: '完成西工大认证后可查看联系方式', icon: 'none' });
    expect(page.data.revealing).toBe(false);

    wx.showModal.mock.calls[0][0].success({ confirm: true });
    expect(wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/verify/verify' });
  });


  it('shows blocked modal for blocked contact errors without navigating or toast', async () => {
    const { page, wx } = loadDetailPage({
      results: [
        { ok: false, errors: ['\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f'] }
      ]
    });
    page.data.tripId = 't1';

    page.revealContact();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showModal).toHaveBeenCalled());

    expect(wx.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236',
      content: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f',
      showCancel: false
    }));
    expect(wx.showModal.mock.calls[0][0]).not.toHaveProperty('confirmText', '\u53bb\u8ba4\u8bc1');
    expect(wx.showToast).not.toHaveBeenCalled();
    expect(page.data.revealing).toBe(false);

    wx.showModal.mock.calls[0][0].success?.({ confirm: true });
    expect(wx.navigateTo).not.toHaveBeenCalled();
  });

  it('keeps generic errors containing certification text as toasts', async () => {
    const { page, wx } = loadDetailPage({
      results: [
        { ok: false, errors: ['\u7cfb\u7edf\u8ba4\u8bc1\u670d\u52a1\u5f02\u5e38'] }
      ]
    });
    page.data.tripId = 't1';

    page.revealContact();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showToast).toHaveBeenCalled());

    expect(wx.showToast).toHaveBeenCalledWith({ title: '\u7cfb\u7edf\u8ba4\u8bc1\u670d\u52a1\u5f02\u5e38', icon: 'none' });
    expect(wx.showModal).not.toHaveBeenCalled();
    expect(wx.navigateTo).not.toHaveBeenCalled();
    expect(page.data.revealing).toBe(false);
  });

  it('keeps non-certification contact errors as toasts', async () => {
    const { page, wx } = loadDetailPage({
      results: [
        { ok: false, errors: ['行程不可查看联系方式'] }
      ]
    });
    page.data.tripId = 't1';

    page.revealContact();
    await flushPromises();
    await vi.waitFor(() => expect(wx.showToast).toHaveBeenCalled());

    expect(wx.showToast).toHaveBeenCalledWith({ title: '行程不可查看联系方式', icon: 'none' });
    expect(wx.showModal).not.toHaveBeenCalled();
    expect(page.data.revealing).toBe(false);
  });
});
