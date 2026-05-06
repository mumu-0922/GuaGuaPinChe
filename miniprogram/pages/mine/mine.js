const { callFunction } = require('../../utils/cloud');
const { STATUS_OPTIONS, buildStatusUpdatePayload, formatMineTrip } = require('./view');
const { getVerifyStatusView } = require('../verify/form');

Page({
  data: {
    statusOptions: STATUS_OPTIONS,
    user: null,
    statusView: getVerifyStatusView(null),
    trips: [],
    loading: false,
    updatingId: '',
    error: ''
  },

  onShow() {
    this.loadUser();
    this.loadMineTrips();
  },

  onPullDownRefresh() {
    Promise.all([this.loadUser(), this.loadMineTrips()]).finally(() => wx.stopPullDownRefresh());
  },

  loadUser() {
    return callFunction('userEnsure', { profile: { nickname: '' } })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u7528\u6237\u521d\u59cb\u5316\u5931\u8d25');
        }
        const user = result.user || null;
        this.setData({ user, statusView: getVerifyStatusView(user) });
        const app = getApp();
        if (app && app.globalData) app.globalData.user = user;
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u7528\u6237\u521d\u59cb\u5316\u5931\u8d25';
        this.setData({ user: null, statusView: getVerifyStatusView(null) });
        const app = getApp();
        if (app && app.globalData) app.globalData.user = null;
        wx.showToast({ title: message, icon: 'none' });
      });
  },

  loadMineTrips() {
    this.setData({ loading: true, error: '' });
    return callFunction('tripList', { mineOnly: true, pageSize: 50 })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u52a0\u8f7d\u5931\u8d25');
        }
        this.setData({ trips: (result.trips || []).map(formatMineTrip), error: '' });
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u52a0\u8f7d\u5931\u8d25';
        this.setData({ error: message });
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  updateStatus(event) {
    const tripId = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status;
    if (!tripId || !status || this.data.updatingId) return;
    this.setData({ updatingId: tripId });
    callFunction('tripUpdateStatus', buildStatusUpdatePayload(tripId, status))
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u66f4\u65b0\u5931\u8d25');
        }
        const app = getApp();
        if (app && app.globalData) app.globalData.shouldRefreshTrips = true;
        wx.showToast({ title: '\u5df2\u66f4\u65b0', icon: 'success' });
        return this.loadMineTrips();
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u66f4\u65b0\u5931\u8d25';
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ updatingId: '' });
      });
  },

  openTrip(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/verify' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  }
});
