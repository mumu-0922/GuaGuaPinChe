App({
  globalData: { user: null },
  onLaunch() {
    if (!wx.cloud) {
      console.error('wx.cloud is unavailable');
      return;
    }
    wx.cloud.init({ traceUser: true });
  }
});
