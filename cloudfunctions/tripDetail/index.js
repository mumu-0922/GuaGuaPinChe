const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function toPublicTrip(trip) {
  const { contactType, contactValue, ...publicTrip } = trip || {};
  return publicTrip;
}

exports.main = async (event) => {
  const tripId = String((event && event.tripId) || '');
  if (!tripId) return { ok: false, errors: ['\u884c\u7a0bID\u4e0d\u80fd\u4e3a\u7a7a'] };

  const result = await db.collection('trips').doc(tripId).get().catch(() => null);
  if (!result || !result.data || result.data.status === 'hidden') return { ok: false, errors: ['\u884c\u7a0b\u4e0d\u5b58\u5728'] };
  return { ok: true, trip: toPublicTrip(result.data) };
};
