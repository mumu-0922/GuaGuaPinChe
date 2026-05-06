const { callFunction } = require('../../utils/cloud');
const { validateVerifyForm, buildVerifyPayload, getVerifyStatusView } = require('./form');

const emptyForm = {
  studentId: '',
  realName: '',
  college: '',
  grade: '',
  note: ''
};

Page({
  data: {
    user: null,
    statusView: getVerifyStatusView(null),
    form: { ...emptyForm },
    errors: [],
    loading: false,
    submitting: false
  },

  onShow() {
    return this.loadUserStatus();
  },

  loadUserStatus(options = {}) {
    const silent = Boolean(options.silent);
    this.setData({ loading: true });
    return callFunction('userEnsure', { profile: { nickname: '' } })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '用户初始化失败');
        }
        const user = result.user || null;
        this.setData({ user, statusView: getVerifyStatusView(user), errors: [] });
        const app = getApp();
        if (app && app.globalData) app.globalData.user = user;
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '加载认证状态失败';
        if (silent) return;
        this.setData({ user: null, statusView: getVerifyStatusView(null), errors: [message] });
        const app = getApp();
        if (app && app.globalData) app.globalData.user = null;
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  setField(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  submitManual() {
    if (this.data.submitting) return;
    const validation = validateVerifyForm(this.data.form);
    if (!validation.ok) {
      this.setData({ errors: validation.errors });
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return;
    }

    this.setData({ submitting: true, errors: [] });
    return callFunction('verificationSubmit', buildVerifyPayload(validation.form))
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '提交认证失败');
        }
        const pendingUser = {
          ...(this.data.user || {}),
          verified: false,
          verifiedLabel: '审核中',
          verifyStatus: 'pending',
          verifyMethod: 'manual',
          rejectReason: ''
        };
        this.setData({ user: pendingUser, statusView: getVerifyStatusView(pendingUser), errors: [] });
        const app = getApp();
        if (app && app.globalData) app.globalData.user = pendingUser;
        wx.showToast({ title: '已提交认证', icon: 'success' });
        return this.loadUserStatus({ silent: true });
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '提交认证失败';
        this.setData({ errors: [message] });
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  submitVerify() {
    return this.submitManual();
  }
});
