const { callFunction } = require('../../utils/cloud');
const { formatAdminUser, getReportStatusLabel, getVerifyRequestTitle } = require('./view');

function getErrorMessage(result, fallback) {
  if (result && Array.isArray(result.errors) && result.errors.length > 0) return result.errors[0];
  if (result && result.error) return result.error;
  return fallback || '操作失败';
}

function askModal(options) {
  return new Promise((resolve) => {
    wx.showModal({
      ...options,
      success(res) {
        resolve(res || {});
      },
      fail() {
        resolve({ confirm: false });
      }
    });
  });
}

Page({
  data: {
    activeTab: 'verify',
    loading: false,
    error: '',
    verifyRequests: [],
    reports: [],
    users: []
  },

  onShow() {
    return this.loadActiveTab();
  },

  switchTab(event) {
    const tab = event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.tab;
    if (!['verify', 'reports', 'users'].includes(tab)) return Promise.resolve();
    this.setData({ activeTab: tab, error: '' });
    return this.loadActiveTab();
  },

  loadActiveTab() {
    if (this.data.activeTab === 'reports') return this.loadReports();
    if (this.data.activeTab === 'users') return this.loadUsers();
    return this.loadVerify();
  },

  handleFailure(result, fallback) {
    const message = result instanceof Error ? result.message : getErrorMessage(result, fallback);
    this.setData({ error: message });
    wx.showToast({ title: message, icon: 'none' });
    return message;
  },

  async loadVerify() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callFunction('verificationList', {});
      if (!result || result.ok === false) {
        this.handleFailure(result, '加载认证申请失败');
        return result;
      }
      const verifyRequests = (result.requests || []).map((request) => ({
        ...request,
        title: getVerifyRequestTitle(request)
      }));
      this.setData({ verifyRequests });
      return result;
    } catch (error) {
      this.handleFailure(error, '加载认证申请失败');
      return { ok: false, errors: [error.message] };
    } finally {
      this.setData({ loading: false });
    }
  },

  async reviewVerify(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset : {};
    const requestId = String(dataset.id || '').trim();
    const action = String(dataset.action || '').trim();
    if (!requestId || !action) return;

    let reason = '';
    if (action === 'reject') {
      const modal = await askModal({
        title: '拒绝认证',
        content: '确认拒绝该认证申请？',
        editable: true,
        placeholderText: '拒绝原因（选填）'
      });
      if (!modal.confirm) return;
      reason = String(modal.content || '').trim();
    }

    const payload = { requestId, action };
    if (action === 'reject') payload.reason = reason;
    try {
      const result = await callFunction('verificationReview', payload);
      if (!result || result.ok === false) return this.handleFailure(result, '审核失败');
      wx.showToast({ title: '已处理', icon: 'success' });
      return this.loadVerify();
    } catch (error) {
      this.handleFailure(error, '审核失败');
    }
  },

  async loadReports() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callFunction('adminReportList', {});
      if (!result || result.ok === false) {
        this.handleFailure(result, '加载举报失败');
        return result;
      }
      const reports = (result.reports || []).map((report) => ({
        ...report,
        statusLabel: getReportStatusLabel(report.status)
      }));
      this.setData({ reports });
      return result;
    } catch (error) {
      this.handleFailure(error, '加载举报失败');
      return { ok: false, errors: [error.message] };
    } finally {
      this.setData({ loading: false });
    }
  },

  async resolveReport(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset : {};
    const reportId = String(dataset.id || '').trim();
    const status = String(dataset.status || '').trim();
    const hideTrip = dataset.hideTrip === true || dataset.hideTrip === 'true';
    if (!reportId || !status) return;

    let note = '';
    if (hideTrip || status === 'rejected') {
      const modal = await askModal({
        title: hideTrip ? '隐藏行程' : '驳回举报',
        content: hideTrip ? '确认处理举报并隐藏相关行程？' : '确认驳回该举报？',
        editable: true,
        placeholderText: '处理备注（选填）'
      });
      if (!modal.confirm) return;
      note = String(modal.content || '').trim();
    }

    const payload = { reportId, status, hideTrip, note };
    try {
      const result = await callFunction('adminReportResolve', payload);
      if (!result || result.ok === false) return this.handleFailure(result, '处理举报失败');
      wx.showToast({ title: '已处理', icon: 'success' });
      return this.loadReports();
    } catch (error) {
      this.handleFailure(error, '处理举报失败');
    }
  },

  async loadUsers() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callFunction('adminUserList', {});
      if (!result || result.ok === false) {
        this.handleFailure(result, '加载用户失败');
        return result;
      }
      const users = (result.users || []).map((user) => ({ ...user, ...formatAdminUser(user) }));
      this.setData({ users });
      return result;
    } catch (error) {
      this.handleFailure(error, '加载用户失败');
      return { ok: false, errors: [error.message] };
    } finally {
      this.setData({ loading: false });
    }
  },

  async blockUser(event) {
    const dataset = event && event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset : {};
    const userOpenid = String(dataset.openid || dataset.id || '').trim();
    const action = String(dataset.action || '').trim();
    if (!userOpenid || !action) return;

    const modal = await askModal({
      title: action === 'block' ? '拉黑用户' : '解除拉黑',
      content: action === 'block' ? '确认拉黑该用户？' : '确认解除该用户拉黑？',
      editable: action === 'block',
      placeholderText: '拉黑原因（选填）'
    });
    if (!modal.confirm) return;

    const payload = { userOpenid, action, reason: action === 'block' ? String(modal.content || '').trim() : '' };
    try {
      const result = await callFunction('adminUserBlock', payload);
      if (!result || result.ok === false) return this.handleFailure(result, '用户操作失败');
      wx.showToast({ title: '已处理', icon: 'success' });
      return this.loadUsers();
    } catch (error) {
      this.handleFailure(error, '用户操作失败');
    }
  }
});
