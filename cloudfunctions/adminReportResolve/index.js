const cloud = require('wx-server-sdk');
const { buildReportResolution, validateResolutionNote } = require('./logic');

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

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const adminOpenid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, adminOpenid);
  if (!isAdmin) return { ok: false, errors: ['\u65e0\u7ba1\u7406\u5458\u6743\u9650'] };

  const reportId = String((event && event.reportId) || '').trim();
  if (!reportId) return { ok: false, errors: ['\u4e3e\u62a5ID\u4e0d\u80fd\u4e3a\u7a7a'] };

  const note = event && event.note;
  const noteValidation = validateResolutionNote(note);
  if (!noteValidation.ok) return { ok: false, errors: [noteValidation.error] };

  const now = Date.now();
  const hideTrip = Boolean(event && event.hideTrip);
  const status = event && event.status;

  try {
    await db.runTransaction(async (transaction) => {
      const adminResult = await getDocOrNull(transaction.collection('users').doc(adminOpenid));
      const admin = adminResult && adminResult.data;
      if (!admin || admin.role !== 'admin' || admin.blocked) throw businessError('\u65e0\u7ba1\u7406\u5458\u6743\u9650');

      const reportResult = await getDocOrNull(transaction.collection('reports').doc(reportId));
      const report = reportResult && reportResult.data;
      if (!report) throw businessError('\u4e3e\u62a5\u4e0d\u5b58\u5728');

      const resolution = buildReportResolution(status, note, hideTrip, adminOpenid, now);
      if (!resolution) throw businessError('\u5904\u7406\u52a8\u4f5c\u65e0\u6548');
      if (resolution.reportUpdate.error) throw businessError(resolution.reportUpdate.error);

      if (resolution.tripUpdate) {
        if (!report.tripId) throw businessError('\u884c\u7a0b\u4e0d\u5b58\u5728');
        const tripResult = await getDocOrNull(transaction.collection('trips').doc(report.tripId));
        if (!tripResult || !tripResult.data) throw businessError('\u884c\u7a0b\u4e0d\u5b58\u5728');
      }

      await transaction.collection('reports').doc(reportId).update({ data: resolution.reportUpdate });
      if (resolution.tripUpdate) {
        await transaction.collection('trips').doc(report.tripId).update({ data: resolution.tripUpdate });
      }
    });
    return { ok: true };
  } catch (error) {
    if (error && error.business) return { ok: false, errors: [error.message] };
    throw error;
  }
};
