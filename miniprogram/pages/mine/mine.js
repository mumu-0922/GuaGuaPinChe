const { callFunction } = require('../../utils/cloud');
const { STATUS_OPTIONS, buildStatusUpdatePayload, formatMineTrip } = require('./view');

Page({
  data: {
    statusOptions: STATUS_OPTIONS,
    trips: [],
    loading: false,
    updatingId: '',
    error: ''
  },

  onShow() {
    this.loadMineTrips();
  },

  onPullDownRefresh() {
    this.loadMineTrips().finally(() => wx.stopPullDownRefresh());
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
  }
});
