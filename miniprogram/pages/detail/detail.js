const { callFunction } = require('../../utils/cloud');
const { buildShareMessage, formatContact, formatTripView } = require('./view');

Page({
  data: {
    tripId: '',
    trip: null,
    tripView: null,
    contactText: '',
    loading: false,
    revealing: false,
    error: ''
  },

  onLoad(options) {
    const tripId = options && options.id ? String(options.id) : '';
    this.setData({ tripId });
    if (tripId) this.loadDetail(tripId);
    else this.setData({ error: '\u884c\u7a0bID\u4e0d\u80fd\u4e3a\u7a7a' });
  },

  loadDetail(tripId = this.data.tripId) {
    if (!tripId) return Promise.resolve();
    this.setData({ loading: true, error: '', contactText: '' });
    return callFunction('tripDetail', { tripId })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u52a0\u8f7d\u5931\u8d25');
        }
        this.setData({ trip: result.trip, tripView: formatTripView(result.trip), error: '' });
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

  revealContact() {
    if (!this.data.tripId || this.data.revealing) return;
    this.setData({ revealing: true });
    callFunction('contactView', { tripId: this.data.tripId })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u83b7\u53d6\u8054\u7cfb\u65b9\u5f0f\u5931\u8d25');
        }
        this.setData({ contactText: formatContact(result) });
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u83b7\u53d6\u8054\u7cfb\u65b9\u5f0f\u5931\u8d25';
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ revealing: false });
      });
  },

  goReport() {
    if (!this.data.tripId) return;
    wx.navigateTo({ url: `/pages/report/report?id=${this.data.tripId}` });
  },

  onShareAppMessage() {
    return buildShareMessage(this.data.tripId, this.data.trip);
  }
});
