import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  validateVerifyForm,
  buildVerifyPayload,
  getVerifyStatusView
} = require('../../miniprogram/pages/verify/form.js');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifyPagePath = require.resolve('../../miniprogram/pages/verify/verify.js');

const validForm = {
  studentId: ' 2024000000 ',
  realName: ' 张三 ',
  college: ' 计算机学院 ',
  grade: ' 2024 ',
  note: ' 长安校区 '
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

function loadVerifyPage({ results = [] } = {}) {
  delete require.cache[verifyPagePath];
  let pageConfig = null;
  const app = { globalData: {} };
  const calls = [];
  const wx = {
    showToast: vi.fn(),
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

  require(verifyPagePath);
  return { page: createPageInstance(pageConfig), wx, app, calls };
}

afterEach(() => {
  delete require.cache[verifyPagePath];
  delete globalThis.wx;
  delete globalThis.getApp;
  delete globalThis.Page;
});

describe('app page registration', () => {
  it('keeps required files for every app.json page', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'miniprogram/app.json'), 'utf8'));

    appJson.pages.forEach((page) => {
      ['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
        const pageFile = path.join(repoRoot, 'miniprogram', `${page}.${ext}`);
        expect(fs.existsSync(pageFile), `${page}.${ext}`).toBe(true);
      });
    });
  });
});

describe('verify form helpers', () => {
  it('builds a trimmed verification payload', () => {
    expect(buildVerifyPayload({
      studentId: ' 2024000000 ',
      realName: ' 张三 ',
      college: ' 计算机学院 ',
      grade: ' 2024 ',
      note: ' 长安校区 '
    })).toEqual({
      form: {
        studentId: '2024000000',
        realName: '张三',
        college: '计算机学院',
        grade: '2024',
        note: '长安校区'
      }
    });
  });

  it('rejects blank required fields', () => {
    const result = validateVerifyForm({ studentId: '', realName: '', college: '', grade: '', note: '' });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      '学号不能为空',
      '真实姓名不能为空',
      '学院不能为空',
      '年级不能为空'
    ]));
  });

  it('accepts required fields and trims optional note', () => {
    expect(validateVerifyForm({
      studentId: ' 2024000000 ',
      realName: ' 张三 ',
      college: ' 计算机学院 ',
      grade: ' 2024 ',
      note: ' 长安校区 '
    })).toEqual({
      ok: true,
      form: {
        studentId: '2024000000',
        realName: '张三',
        college: '计算机学院',
        grade: '2024',
        note: '长安校区'
      }
    });
  });

  it('rejects invalid student id and overlong manual verification fields before submit', () => {
    const result = validateVerifyForm({
      studentId: '2024A',
      realName: '张'.repeat(21),
      college: '计'.repeat(41),
      grade: '2'.repeat(21),
      note: 'a'.repeat(121)
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      '学号格式不正确',
      '姓名不能超过20个字',
      '学院不能超过40个字',
      '年级不能超过20个字',
      '备注不能超过120个字'
    ]));
  });

  it('returns pending status view labels', () => {
    expect(getVerifyStatusView({ verifyStatus: 'pending' })).toEqual({
      label: '认证审核中',
      tone: 'warning',
      actionText: '等待管理员审核'
    });
  });

  it('returns verified status view labels', () => {
    expect(getVerifyStatusView({ verifyStatus: 'verified' })).toEqual({
      label: '西工大已认证',
      tone: 'positive',
      actionText: '无需重复提交'
    });
  });

  it('returns rejected status view labels with reason', () => {
    expect(getVerifyStatusView({ verifyStatus: 'rejected', verifyRejectReason: '照片不清晰' })).toEqual({
      label: '认证未通过：照片不清晰',
      tone: 'danger',
      actionText: '修改信息后重新提交'
    });
  });

  it('returns unverified status view labels by default', () => {
    expect(getVerifyStatusView({})).toEqual({
      label: '未完成校园认证',
      tone: 'muted',
      actionText: '提交人工认证'
    });
  });
});

describe('verify page flow', () => {
  it('loads userEnsure status on show and stores user status view', async () => {
    const user = { _id: 'openid-1', verifyStatus: 'pending' };
    const { page, calls, app } = loadVerifyPage({ results: [{ ok: true, user }] });

    await page.onShow();

    expect(calls).toEqual([{ name: 'userEnsure', data: { profile: { nickname: '' } } }]);
    expect(page.data.user).toEqual(user);
    expect(page.data.statusView).toEqual(getVerifyStatusView(user));
    expect(page.data.errors).toEqual([]);
    expect(page.data.loading).toBe(false);
    expect(app.globalData.user).toEqual(user);
  });

  it('clears stale user status when userEnsure status load fails', async () => {
    const staleUser = { _id: 'openid-1', verifyStatus: 'verified', role: 'admin' };
    const { page, wx, app } = loadVerifyPage({
      results: [{ ok: false, errors: ['用户初始化失败'] }]
    });
    page.data.user = staleUser;
    page.data.statusView = getVerifyStatusView(staleUser);
    app.globalData.user = staleUser;

    await page.loadUserStatus();

    expect(page.data.user).toBeNull();
    expect(page.data.statusView).toEqual(getVerifyStatusView(null));
    expect(page.data.errors).toEqual(['用户初始化失败']);
    expect(page.data.loading).toBe(false);
    expect(app.globalData.user).toBeNull();
    expect(wx.showToast).toHaveBeenCalledWith({ title: '用户初始化失败', icon: 'none' });
  });

  it('does not submit invalid manual form and shows validation error', async () => {
    const { page, calls, wx } = loadVerifyPage();
    page.data.form = { studentId: '', realName: '', college: '', grade: '', note: '' };

    await page.submitManual();

    expect(calls).toEqual([]);
    expect(page.data.submitting).toBe(false);
    expect(page.data.errors).toContain('学号不能为空');
    expect(wx.showToast).toHaveBeenCalledWith({ title: '学号不能为空', icon: 'none' });
  });

  it('submits manual verification then reloads user status and clears submitting', async () => {
    const user = { _id: 'openid-1', verifyStatus: 'pending' };
    const { page, calls } = loadVerifyPage({
      results: [
        { ok: true, requestId: 'request-1' },
        { ok: true, user }
      ]
    });
    page.data.form = { ...validForm };

    await page.submitManual();

    expect(calls).toEqual([
      { name: 'verificationSubmit', data: buildVerifyPayload(validForm) },
      { name: 'userEnsure', data: { profile: { nickname: '' } } }
    ]);
    expect(page.data.user).toEqual(user);
    expect(page.data.statusView).toEqual(getVerifyStatusView(user));
    expect(page.data.submitting).toBe(false);
  });

  it('keeps submitted pending status when post-submit refresh fails', async () => {
    const { page, wx } = loadVerifyPage({
      results: [
        { ok: true, requestId: 'request-1' },
        new Error('加载认证状态失败')
      ]
    });
    page.data.form = { ...validForm };

    await page.submitManual();

    expect(page.data.user).toMatchObject({ verifyStatus: 'pending', verifyMethod: 'manual' });
    expect(page.data.statusView).toEqual(getVerifyStatusView({ verifyStatus: 'pending' }));
    expect(page.data.errors).toEqual([]);
    expect(page.data.submitting).toBe(false);
    expect(wx.showToast).toHaveBeenCalledTimes(1);
    expect(wx.showToast).toHaveBeenCalledWith({ title: '已提交认证', icon: 'success' });
  });

  it('ignores duplicate manual submit while submitting', async () => {
    const { page, calls } = loadVerifyPage();
    page.data.submitting = true;
    page.data.form = { ...validForm };

    await page.submitManual();

    expect(calls).toEqual([]);
    expect(page.data.submitting).toBe(true);
  });
});
