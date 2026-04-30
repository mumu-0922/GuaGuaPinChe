const cloud = require('wx-server-sdk');
const { buildContactViewLog, canRevealContact } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const viewerOpenid = wxContext.OPENID;
  const tripId = String((event && event.tripId) || '');
  if (!tripId) return { ok: false, errors: ['\u884c\u7a0bID\u4e0d\u80fd\u4e3a\u7a7a'] };

  const tripResult = await db.collection('trips').doc(tripId).get().catch(() => null);
  const trip = tripResult && tripResult.data;
  const decision = canRevealContact(trip);
  if (!decision.ok) return { ok: false, errors: [decision.error] };

  await db.collection('contactViews').add({ data: buildContactViewLog(tripId, viewerOpenid, trip.ownerOpenid, Date.now()) });
  return { ok: true, contactType: trip.contactType, contactValue: trip.contactValue };
};
