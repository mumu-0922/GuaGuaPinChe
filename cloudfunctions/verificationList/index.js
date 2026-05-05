const cloud = require('wx-server-sdk');
const { normalizeVerificationStatus } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function requireAdmin(db, openid) {
  const userResult = await db.collection('users').doc(openid).get().catch(() => null);
  const user = userResult && userResult.data;
  return !!(user && user.role === 'admin' && !user.blocked);
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, openid);
  if (!isAdmin) return { ok: false, errors: ['无管理员权限'] };

  const status = normalizeVerificationStatus(event && event.status);
  const result = await db.collection('verificationRequests')
    .where({ status })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return { ok: true, requests: result.data };
};
