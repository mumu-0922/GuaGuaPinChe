function cleanNickname(value) {
  const nickname = String(value || '').trim();
  return nickname || '\u540c\u5b66';
}

const DEFAULT_USER_FIELDS = {
  verified: false,
  verifiedLabel: '\u672a\u8ba4\u8bc1',
  verifyStatus: 'unverified',
  verifyMethod: '',
  rejectReason: '',
  blocked: false,
  blockedReason: '',
  blockedAt: null,
  blockedBy: '',
  role: 'user'
};

function mergeUserDefaults(user) {
  const source = user || {};
  const merged = { ...source };
  Object.keys(DEFAULT_USER_FIELDS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(merged, key)) {
      merged[key] = DEFAULT_USER_FIELDS[key];
    }
  });
  if (!Object.prototype.hasOwnProperty.call(source, 'verifyStatus') && source.verified === true) {
    merged.verifyStatus = 'verified';
  }
  return merged;
}

function buildUserDocument(openid, profile, now) {
  const safeProfile = profile || {};
  return {
    openid,
    nickname: cleanNickname(safeProfile.nickname),
    avatarUrl: String(safeProfile.avatarUrl || ''),
    ...DEFAULT_USER_FIELDS,
    createdAt: now,
    updatedAt: now
  };
}

function buildUserUpdate(profile, now) {
  const safeProfile = profile || {};
  return {
    nickname: cleanNickname(safeProfile.nickname),
    avatarUrl: String(safeProfile.avatarUrl || ''),
    updatedAt: now
  };
}

module.exports = {
  DEFAULT_USER_FIELDS,
  cleanNickname,
  mergeUserDefaults,
  buildUserDocument,
  buildUserUpdate
};

