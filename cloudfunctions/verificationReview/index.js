const cloud = require('wx-server-sdk');
const { buildReviewUpdates } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function businessError(message) {
  const error = new Error(message);
  error.business = true;
  return error;
}

async function requireAdmin(db, openid) {
  const userResult = await db.collection('users').doc(openid).get().catch(() => null);
  const user = userResult && userResult.data;
  return !!(user && user.role === 'admin' && !user.blocked);
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const adminOpenid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, adminOpenid);
  if (!isAdmin) return { ok: false, errors: ['无管理员权限'] };

  const requestId = String((event && event.requestId) || '').trim();
  const action = String((event && event.action) || '').trim();
  const reason = event && event.reason;
  const now = Date.now();

  if (!requestId) return { ok: false, errors: ['认证申请ID不能为空'] };

  try {
    await db.runTransaction(async (transaction) => {
      const adminResult = await transaction.collection('users').doc(adminOpenid).get().catch(() => null);
      const admin = adminResult && adminResult.data;
      if (!admin || admin.role !== 'admin' || admin.blocked) throw businessError('无管理员权限');

      const requestResult = await transaction.collection('verificationRequests').doc(requestId).get().catch(() => null);
      if (!requestResult || !requestResult.data) throw businessError('认证申请不存在');
      if (requestResult.data.status !== 'pending') throw businessError('认证申请已处理');

      const updates = buildReviewUpdates(action, reason, adminOpenid, now);
      if (!updates) throw businessError('审核动作无效');
      if (updates.error) throw businessError(updates.error);

      await transaction.collection('verificationRequests').doc(requestId).update({ data: updates.requestUpdate });
      await transaction.collection('users').doc(requestResult.data.userOpenid).update({ data: updates.userUpdate });
    });

    return { ok: true };
  } catch (error) {
    if (error && error.business) return { ok: false, errors: [error.message] };
    throw error;
  }
};
