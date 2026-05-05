const cloud = require('wx-server-sdk');
const { normalizeReportListStatus } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
  const openid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, openid);
  if (!isAdmin) return { ok: false, errors: ['无管理员权限'] };

  const status = normalizeReportListStatus(event && event.status);
  const result = await db.collection('reports')
    .where({ status })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return { ok: true, reports: result.data };
};
