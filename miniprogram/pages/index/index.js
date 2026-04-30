const { LOCATION_GROUPS } = require('../../utils/constants');
const { callFunction } = require('../../utils/cloud');

function getTodayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return {
    dateStart: start,
    dateEnd: start + 24 * 60 * 60 * 1000 - 1
  };
}

function buildDefaultFilters() {
  return {
    from: '',
    to: '',
    keyword: '',
    ...getTodayRange()
  };
}

Page({
  data: {
    locationGroups: LOCATION_GROUPS,
    choosingField: 'from',
    filters: buildDefaultFilters(),
    trips: [],
    loading: false,
    hasMore: false,
    nextCursorTime: null,
    error: ''
  },

  onLoad() {
    this.loadTrips(true);
  },

  onShow() {
    const app = getApp();
    if (app && app.globalData && app.globalData.shouldRefreshTrips) {
      app.globalData.shouldRefreshTrips = false;
      this.loadTrips(true);
    }
  },

  onPullDownRefresh() {
    this.loadTrips(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadTrips(false);
  },

  loadTrips(reset = true) {
    if (this.data.loading) return Promise.resolve();
    const requestData = {
      ...this.data.filters,
      cursorTime: reset ? null : this.data.nextCursorTime,
      pageSize: 20
    };

    this.setData({ loading: true, error: reset ? '' : this.data.error });
    return callFunction('tripList', requestData)
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u52a0\u8f7d\u5931\u8d25');
        }
        const nextTrips = reset ? result.trips || [] : this.data.trips.concat(result.trips || []);
        this.setData({
          trips: nextTrips,
          hasMore: Boolean(result.hasMore),
          nextCursorTime: result.nextCursorTime || null,
          error: ''
        });
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

  setFilter(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`filters.${field}`]: event.detail.value });
  },

  chooseLocation(event) {
    const field = event.currentTarget.dataset.field || this.data.choosingField || 'from';
    const value = event.currentTarget.dataset.value || '';
    if (!value) return;
    this.setData({ [`filters.${field}`]: value, choosingField: field === 'from' ? 'to' : 'from' });
  },

  setChoosingField(event) {
    const field = event.currentTarget.dataset.field;
    if (field) this.setData({ choosingField: field });
  },

  swapRoute() {
    const { from, to } = this.data.filters;
    this.setData({
      'filters.from': to,
      'filters.to': from
    });
  },

  resetFilters() {
    this.setData({
      filters: buildDefaultFilters(),
      choosingField: 'from',
      nextCursorTime: null,
      hasMore: false,
      error: ''
    });
    this.loadTrips(true);
  },

  openTrip(event) {
    const id = event.detail.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  }
});
