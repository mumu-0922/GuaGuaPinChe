const cloud = require('wx-server-sdk');
const { buildVerificationRequest, canSubmitVerification, validateVerificationForm } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function businessError(message) {
  const error = new Error(message);
  error.business = true;
  return error;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const now = Date.now();
  const form = event && event.form ? event.form : {};

  const validation = validateVerificationForm(form);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const pendingUserUpdate = {
    verified: false,
    verifiedLabel: '审核中',
    verifyStatus: 'pending',
    verifyMethod: 'manual',
    rejectReason: '',
    updatedAt: now
  };

  try {
    const requestId = await db.runTransaction(async (transaction) => {
      const userResult = await transaction.collection('users').doc(openid).get().catch(() => null);
      if (!userResult || !userResult.data) throw businessError('用户不存在');

      const pendingResult = await transaction.collection('verificationRequests')
        .where({ userOpenid: openid, status: 'pending' })
        .limit(1)
        .get();
      const pendingRequest = pendingResult.data && pendingResult.data.length > 0 ? pendingResult.data[0] : null;
      const permission = canSubmitVerification(userResult.data, pendingRequest);
      if (!permission.ok) throw businessError(permission.error);

      const addResult = await transaction.collection('verificationRequests').add({
        data: buildVerificationRequest(openid, form, now)
      });
      await transaction.collection('users').doc(openid).update({ data: pendingUserUpdate });
      return addResult._id;
    });

    return { ok: true, requestId };
  } catch (error) {
    if (error && error.business) return { ok: false, errors: [error.message] };
    throw error;
  }
};
