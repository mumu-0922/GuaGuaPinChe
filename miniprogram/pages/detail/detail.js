const { callFunction } = require('../../utils/cloud');
const { buildShareMessage, formatContact, formatTripView } = require('./view');

const BLOCKED_CONTACT_ERROR = '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f';
const CERTIFICATION_CONTACT_ERRORS = [
  '\u8ba4\u8bc1\u5ba1\u6838\u4e2d\uff0c\u901a\u8fc7\u540e\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f',
  '\u5b8c\u6210\u897f\u5de5\u5927\u8ba4\u8bc1\u540e\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f'
];

function isBlockedContactError(message) {
  return message === BLOCKED_CONTACT_ERROR;
}

function isCertificationContactError(message) {
  return CERTIFICATION_CONTACT_ERRORS.includes(message);
}

function showContactBlockedPrompt(message) {
  wx.showModal({
    title: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236',
    content: message,
    showCancel: false
  });
}

function showContactVerifyPrompt(message) {
  wx.showModal({
    title: '\u9700\u8981\u6821\u56ed\u8ba4\u8bc1',
    content: message,
    confirmText: '\u53bb\u8ba4\u8bc1',
    success(res) {
      if (res.confirm) wx.navigateTo({ url: '/pages/verify/verify' });
    }
  });
}

Page({
  data: {
    tripId: '',
    trip: null,
    tripView: null,
    contactText: '',
    loading: false,
    revealing: false,
    similarTrips: [],
    similarLoading: false,
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
    this.setData({ loading: true, error: '', contactText: '', similarTrips: [] });
    return callFunction('tripDetail', { tripId })
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u52a0\u8f7d\u5931\u8d25');
        }
        this.setData({ trip: result.trip, tripView: formatTripView(result.trip), error: '' });
        this.loadSimilarTrips(tripId);
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

  loadSimilarTrips(tripId = this.data.tripId) {
    if (!tripId) return Promise.resolve();
    this.setData({ similarLoading: true });
    return callFunction('tripSimilar', { tripId })
      .then((result) => {
        if (!result || result.ok === false) return;
        const similarTrips = (result.trips || []).slice(0, 3).map((trip) => ({
          ...trip,
          view: formatTripView(trip)
        }));
        this.setData({ similarTrips });
      })
      .catch(() => {
        this.setData({ similarTrips: [] });
      })
      .finally(() => {
        this.setData({ similarLoading: false });
      });
  },

  openSimilarTrip(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
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
        if (isBlockedContactError(message)) {
          showContactBlockedPrompt(message);
          return;
        }
        if (isCertificationContactError(message)) {
          showContactVerifyPrompt(message);
          return;
        }
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
