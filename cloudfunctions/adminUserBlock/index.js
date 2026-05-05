const cloud = require('wx-server-sdk');
const { buildUserBlockUpdate, validateBlockReason } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function businessError(message) {
  const error = new Error(message);
  error.business = true;
  return error;
}

function isNotFoundError(error) {
  const message = String(error && (error.message || error.errMsg || ''));
  return message.includes('not found') || message.includes('not exist') || message.includes('\u4e0d\u5b58\u5728');
}

async function getDocOrNull(ref) {
  try {
    return await ref.get();
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function requireAdmin(db, openid) {
  const userResult = await getDocOrNull(db.collection('users').doc(openid));
  const user = userResult && userResult.data;
  return Boolean(user && user.role === 'admin' && !user.blocked);
}

async function hideOpenTrips(db, userOpenid, now) {
  // CloudBase transactions only support doc operations and have a 100-op cap;
  // this idempotent batch runs outside the transaction and is safe to retry.
  let hasMoreOpenTrips = true;
  while (hasMoreOpenTrips) {
    const openTripsResult = await db.collection('trips')
      .where({ ownerOpenid: userOpenid, status: 'open' })
      .get();
    const openTrips = openTripsResult.data || [];
    hasMoreOpenTrips = openTrips.length > 0;
    await Promise.all(openTrips.map((trip) => {
      const tripId = trip && trip._id;
      if (!tripId) return Promise.resolve();
      return db.collection('trips').doc(tripId).update({ data: { status: 'hidden', updatedAt: now } });
    }));
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const adminOpenid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, adminOpenid);
  if (!isAdmin) return { ok: false, errors: ['\u65e0\u7ba1\u7406\u5458\u6743\u9650'] };

  const userOpenid = String((event && event.userOpenid) || '').trim();
  if (!userOpenid) return { ok: false, errors: ['\u7528\u6237ID\u4e0d\u80fd\u4e3a\u7a7a'] };
  if (userOpenid === adminOpenid) return { ok: false, errors: ['\u4e0d\u80fd\u64cd\u4f5c\u81ea\u5df1'] };

  const action = String((event && event.action) || '').trim();
  const reason = event && event.reason;
  const reasonValidation = validateBlockReason(reason);
  if (!reasonValidation.ok) return { ok: false, errors: [reasonValidation.error] };

  const now = Date.now();
  const update = buildUserBlockUpdate(action, reason, adminOpenid, now);
  if (!update) return { ok: false, errors: ['\u64cd\u4f5c\u65e0\u6548'] };

  try {
    await db.runTransaction(async (transaction) => {
      const adminResult = await getDocOrNull(transaction.collection('users').doc(adminOpenid));
      const admin = adminResult && adminResult.data;
      if (!admin || admin.role !== 'admin' || admin.blocked) throw businessError('\u65e0\u7ba1\u7406\u5458\u6743\u9650');

      const targetResult = await getDocOrNull(transaction.collection('users').doc(userOpenid));
      if (!targetResult || !targetResult.data) throw businessError('\u7528\u6237\u4e0d\u5b58\u5728');

      await transaction.collection('users').doc(userOpenid).update({ data: update });
    });

    if (action === 'block') await hideOpenTrips(db, userOpenid, now);
    return { ok: true };
  } catch (error) {
    if (error && error.business) return { ok: false, errors: [error.message] };
    throw error;
  }
};
