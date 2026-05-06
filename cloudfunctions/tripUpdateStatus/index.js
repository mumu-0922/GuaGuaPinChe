const cloud = require('wx-server-sdk');
const { canOwnerUpdateTripStatus, validateStatusTransition } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const tripId = String((event && event.tripId) || '');
  const status = String((event && event.status) || '');
  const decision = validateStatusTransition(status);
  if (!decision.ok) return { ok: false, errors: [decision.error] };

  const tripResult = await db.collection('trips').doc(tripId).get().catch(() => null);
  if (!tripResult || !tripResult.data) return { ok: false, errors: ['\u884c\u7a0b\u4e0d\u5b58\u5728'] };
  if (tripResult.data.ownerOpenid !== openid) return { ok: false, errors: ['\u53ea\u6709\u53d1\u5e03\u8005\u53ef\u4ee5\u4fee\u6539'] };
  const userResult = await db.collection('users').doc(openid).get().catch(() => null);
  if (!userResult || !userResult.data) return { ok: false, errors: ['\u7528\u6237\u4e0d\u5b58\u5728'] };
  const permission = canOwnerUpdateTripStatus(userResult.data, status);
  if (!permission.ok) return { ok: false, errors: [permission.error] };

  await db.collection('trips').doc(tripId).update({ data: { status, updatedAt: Date.now() } });
  return { ok: true };
};
