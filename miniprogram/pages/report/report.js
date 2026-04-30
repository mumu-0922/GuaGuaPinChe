const { callFunction } = require('../../utils/cloud');
const { REASON_OPTIONS, buildReportPayload, validateReportForm } = require('./form');

Page({
  data: {
    tripId: '',
    reasonOptions: REASON_OPTIONS,
    reasonIndex: 0,
    form: { reason: REASON_OPTIONS[0].value, detail: '' },
    errors: [],
    submitting: false
  },

  onLoad(options) {
    const tripId = options && options.id ? String(options.id) : '';
    this.setData({ tripId });
    if (!tripId) this.setData({ errors: ['\u884c\u7a0bID\u4e0d\u80fd\u4e3a\u7a7a'] });
  },

  setReason(event) {
    const reasonIndex = Number(event.detail.value);
    this.setData({
      reasonIndex,
      'form.reason': REASON_OPTIONS[reasonIndex].value,
      errors: []
    });
  },

  setDetail(event) {
    this.setData({ 'form.detail': event.detail.value, errors: [] });
  },

  submitReport() {
    if (this.data.submitting) return;
    const validation = validateReportForm(this.data.form);
    if (!validation.ok) {
      this.setData({ errors: validation.errors });
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return;
    }
    this.setData({ submitting: true, errors: [] });
    callFunction('reportCreate', buildReportPayload(this.data.tripId, this.data.form))
      .then((result) => {
        if (!result || result.ok === false) {
          throw new Error((result && result.errors && result.errors[0]) || '\u63d0\u4ea4\u5931\u8d25');
        }
        wx.showToast({ title: '\u5df2\u63d0\u4ea4', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u63d0\u4ea4\u5931\u8d25';
        this.setData({ errors: [message] });
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
