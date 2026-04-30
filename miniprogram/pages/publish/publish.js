const { LOCATION_GROUPS } = require('../../utils/constants');
const { validateTripDraft } = require('../../utils/validation');
const { callFunction } = require('../../utils/cloud');
const { buildDefaultDraft, buildTripDraftFromForm } = require('./form');

const CONTACT_OPTIONS = [
  { label: 'QQ', value: 'qq' },
  { label: '\u5fae\u4fe1', value: 'wechat' },
  { label: '\u624b\u673a\u53f7', value: 'phone' }
];
const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6];

function findContactIndex(contactType) {
  const index = CONTACT_OPTIONS.findIndex((item) => item.value === contactType);
  return index >= 0 ? index : 0;
}

Page({
  data: {
    locationGroups: LOCATION_GROUPS,
    contactOptions: CONTACT_OPTIONS,
    peopleOptions: PEOPLE_OPTIONS,
    choosingField: 'from',
    draft: buildDefaultDraft(),
    contactTypeIndex: 0,
    peopleIndex: 0,
    errors: [],
    submitting: false
  },

  onShow() {
    if (!this.data.draft.date) this.resetDraft();
  },

  setField(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`draft.${field}`]: event.detail.value, errors: [] });
  },

  setChoosingField(event) {
    const field = event.currentTarget.dataset.field;
    if (field) this.setData({ choosingField: field });
  },

  chooseLocation(event) {
    const value = event.currentTarget.dataset.value || '';
    const field = event.currentTarget.dataset.field || this.data.choosingField || 'from';
    if (!value) return;
    this.setData({ [`draft.${field}`]: value, choosingField: field === 'from' ? 'to' : 'from', errors: [] });
  },

  swapRoute() {
    const { from, to } = this.data.draft;
    this.setData({
      'draft.from': to,
      'draft.to': from,
      errors: []
    });
  },

  setPeopleCount(event) {
    const peopleIndex = Number(event.detail.value);
    this.setData({
      peopleIndex,
      'draft.peopleCount': PEOPLE_OPTIONS[peopleIndex],
      errors: []
    });
  },

  setContactType(event) {
    const contactTypeIndex = Number(event.detail.value);
    this.setData({
      contactTypeIndex,
      'draft.contactType': CONTACT_OPTIONS[contactTypeIndex].value,
      errors: []
    });
  },

  resetDraft() {
    const draft = buildDefaultDraft();
    this.setData({
      draft,
      contactTypeIndex: findContactIndex(draft.contactType),
      peopleIndex: 0,
      choosingField: 'from',
      errors: []
    });
  },

  submitTrip() {
    if (this.data.submitting) return;
    const trip = buildTripDraftFromForm(this.data.draft);
    const validation = validateTripDraft(trip);
    if (!validation.ok) {
      this.setData({ errors: validation.errors });
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return;
    }

    this.setData({ submitting: true, errors: [] });
    callFunction('userEnsure', { profile: { nickname: '' } })
      .then((userResult) => {
        if (!userResult || userResult.ok === false) {
          throw new Error((userResult && userResult.errors && userResult.errors[0]) || '\u7528\u6237\u521d\u59cb\u5316\u5931\u8d25');
        }
        return callFunction('tripCreate', { trip });
      })
      .then((createResult) => {
        if (!createResult || createResult.ok === false) {
          throw new Error((createResult && createResult.errors && createResult.errors[0]) || '\u53d1\u5e03\u5931\u8d25');
        }
        const app = getApp();
        if (app && app.globalData) app.globalData.shouldRefreshTrips = true;
        wx.showToast({ title: '\u5df2\u53d1\u5e03', icon: 'success' });
        this.resetDraft();
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
      })
      .catch((error) => {
        const message = error && error.message ? error.message : '\u53d1\u5e03\u5931\u8d25';
        this.setData({ errors: [message] });
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
