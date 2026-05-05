const cloud = require('wx-server-sdk');
const { DEFAULT_USER_FIELDS, buildUserDocument, buildUserUpdate, mergeUserDefaults } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const now = Date.now();
  const profile = event && event.profile ? event.profile : {};

  const existing = await db.collection('users').doc(openid).get().catch(() => null);
  if (!existing || !existing.data) {
    const userDoc = buildUserDocument(openid, profile, now);
    await db.collection('users').doc(openid).set({ data: userDoc });
    return { ok: true, user: { ...userDoc, _id: openid } };
  }

  const defaultsBackfill = {};
  const mergedUser = mergeUserDefaults(existing.data);
  Object.keys(DEFAULT_USER_FIELDS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(existing.data, key)) {
      defaultsBackfill[key] = mergedUser[key];
    }
  });
  const updates = { ...buildUserUpdate(profile, now), ...defaultsBackfill };
  await db.collection('users').doc(openid).update({ data: updates });
  return { ok: true, user: { ...existing.data, ...updates, _id: openid } };
};
