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

function getEnsuredUser(userResult) {
  return userResult && userResult.user ? userResult.user : null;
}

function canPublishTrip(user) {
  if (!user || user.blocked) return false;
  const verifyStatus = user.verifyStatus || (user.verified === true ? 'verified' : '');
  return verifyStatus === 'verified';
}

function showPublishVerifyPrompt(user) {
  wx.showModal({
    title: '\u9700\u8981\u6821\u56ed\u8ba4\u8bc1',
    content: user && user.verifyStatus === 'pending' ? '\u8ba4\u8bc1\u5ba1\u6838\u4e2d\uff0c\u901a\u8fc7\u540e\u53ef\u53d1\u5e03\u884c\u7a0b' : '\u5b8c\u6210\u897f\u5de5\u5927\u8ba4\u8bc1\u540e\u53ef\u53d1\u5e03\u884c\u7a0b',
    confirmText: '\u53bb\u8ba4\u8bc1',
    success: (res) => {
      if (res.confirm) wx.navigateTo({ url: '/pages/verify/verify' });
    }
  });
}

function showPublishBlockedPrompt(user) {
  const reason = user && user.blockedReason ? `\uff1a${user.blockedReason}` : '';
  wx.showModal({
    title: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236',
    content: `\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u53d1\u5e03\u884c\u7a0b${reason}`,
    showCancel: false
  });
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
        const user = getEnsuredUser(userResult);
        if (!canPublishTrip(user)) {
          this.setData({ submitting: false });
          if (user && user.blocked === true) {
            showPublishBlockedPrompt(user);
          } else {
            showPublishVerifyPrompt(user);
          }
          return Promise.reject({ permissionPromptShown: true });
        }
        return callFunction('tripCreate', { trip });
      })
      .then((createResult) => {
        if (!createResult || createResult.ok === false) {
          throw new Error((createResult && createResult.errors && createResult.errors[0]) || '\u53d1\u5e03\u5931\u8d25');
        }
        const similarPayload = createResult.tripId ? { tripId: createResult.tripId } : { trip };
        return callFunction('tripSimilar', similarPayload).catch(() => null);
      })
      .then((similarResult) => {
        const app = getApp();
        if (app && app.globalData) app.globalData.shouldRefreshTrips = true;
        const count = similarResult && similarResult.ok !== false && Array.isArray(similarResult.trips) ? similarResult.trips.length : 0;
        this.resetDraft();
        if (count > 0) {
          wx.showModal({
            title: '\u53d1\u5e03\u6210\u529f',
            content: `\u53d1\u73b0 ${count} \u4e2a\u76f8\u4f3c\u884c\u7a0b\uff0c\u53ef\u4ee5\u53bb\u770b\u770b`,
            showCancel: false,
            complete: () => wx.switchTab({ url: '/pages/index/index' })
          });
          return;
        }
        wx.showToast({ title: '\u5df2\u53d1\u5e03', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
      })
      .catch((error) => {
        if (error && error.permissionPromptShown) return;
        const message = error && error.message ? error.message : '\u53d1\u5e03\u5931\u8d25';
        this.setData({ errors: [message] });
        wx.showToast({ title: message, icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
