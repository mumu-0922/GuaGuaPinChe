App({
  globalData: { user: null },
  onLaunch() {
    if (!wx.cloud) {
      console.error('wx.cloud is unavailable');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d7gbsu1cnf8cf44b5',
      traceUser: true
    });
  }
});
