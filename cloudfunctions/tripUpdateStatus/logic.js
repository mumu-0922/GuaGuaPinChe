const OWNER_STATUSES = ['open', 'full', 'cancelled'];

function validateStatusTransition(status) {
  if (!OWNER_STATUSES.includes(status)) return { ok: false, error: '\u72b6\u6001\u4e0d\u5141\u8bb8\u4fee\u6539' };
  return { ok: true, error: '' };
}

function canOwnerUpdateTripStatus(user, targetStatus) {
  const safeUser = user || {};
  const verifyStatus = safeUser.verifyStatus || (safeUser.verified === true ? 'verified' : '');
  if (safeUser.blocked) return { ok: false, error: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u53d1\u5e03\u884c\u7a0b' };
  if (targetStatus === 'open' && verifyStatus === 'pending') return { ok: false, error: '\u8ba4\u8bc1\u5ba1\u6838\u4e2d\uff0c\u901a\u8fc7\u540e\u53ef\u53d1\u5e03\u884c\u7a0b' };
  if (targetStatus === 'open' && verifyStatus !== 'verified') return { ok: false, error: '\u5b8c\u6210\u897f\u5de5\u5927\u8ba4\u8bc1\u540e\u53ef\u53d1\u5e03\u884c\u7a0b' };
  return { ok: true, error: '' };
}

module.exports = {
  validateStatusTransition,
  canOwnerUpdateTripStatus
};
