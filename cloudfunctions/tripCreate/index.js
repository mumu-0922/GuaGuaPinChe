const cloud = require('wx-server-sdk');
const { buildTripDocument, validateServerTripDraft } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const draft = event && event.trip ? event.trip : {};
  const validation = validateServerTripDraft(draft);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const userResult = await db.collection('users').doc(openid).get().catch(() => null);
  if (!userResult || !userResult.data) return { ok: false, errors: ['\u7528\u6237\u4e0d\u5b58\u5728'] };

  const now = Date.now();
  const trip = buildTripDocument(draft, { ...userResult.data, openid }, now);
  const addResult = await db.collection('trips').add({ data: trip });
  return { ok: true, tripId: addResult._id };
};
