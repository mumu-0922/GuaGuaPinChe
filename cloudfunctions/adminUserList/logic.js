const VALID_VERIFY_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];
const MAX_USER_SCAN = 500;
const USER_PAGE_SIZE = 100;
const USER_RESULT_LIMIT = 50;

function buildUserFilters(input) {
  const safeInput = input || {};
  const verifyStatus = String(safeInput.verifyStatus || '').trim();
  const rawBlocked = safeInput.blocked;
  let blocked = null;
  if (rawBlocked === true || rawBlocked === 'true') blocked = true;
  if (rawBlocked === false || rawBlocked === 'false') blocked = false;
  return {
    verifyStatus: VALID_VERIFY_STATUSES.includes(verifyStatus) ? verifyStatus : '',
    blocked,
    keyword: String(safeInput.keyword || '').trim()
  };
}

function getOpenid(user) {
  return String((user && (user.openid || user._id)) || '');
}

function getOpenidTail(user) {
  return getOpenid(user).slice(-6);
}

function matchesUserKeyword(user, keyword) {
  const normalizedKeyword = String(keyword || '').trim();
  if (!normalizedKeyword) return true;
  const nickname = String((user && user.nickname) || '');
  return nickname.includes(normalizedKeyword) || getOpenidTail(user).includes(normalizedKeyword);
}

function toAdminUserView(user) {
  const safeUser = user || {};
  return {
    _id: safeUser._id,
    openidTail: getOpenidTail(safeUser),
    nickname: safeUser.nickname || '同学',
    verified: Boolean(safeUser.verified),
    verifiedLabel: safeUser.verifiedLabel || (safeUser.verified ? '已认证' : '未认证'),
    verifyStatus: safeUser.verifyStatus || (safeUser.verified ? 'verified' : 'unverified'),
    role: safeUser.role || 'user',
    blocked: Boolean(safeUser.blocked),
    blockedReason: safeUser.blockedReason || ''
  };
}

module.exports = {
  MAX_USER_SCAN,
  USER_PAGE_SIZE,
  USER_RESULT_LIMIT,
  buildUserFilters,
  matchesUserKeyword,
  toAdminUserView
};
