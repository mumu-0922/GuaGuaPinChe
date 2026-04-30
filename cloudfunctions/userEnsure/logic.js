function cleanNickname(value) {
  const nickname = String(value || '').trim();
  return nickname || '\u540c\u5b66';
}

function buildUserDocument(openid, profile, now) {
  const safeProfile = profile || {};
  return {
    openid,
    nickname: cleanNickname(safeProfile.nickname),
    avatarUrl: String(safeProfile.avatarUrl || ''),
    verified: false,
    verifiedLabel: '\u672a\u8ba4\u8bc1',
    role: 'user',
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
  cleanNickname,
  buildUserDocument,
  buildUserUpdate
};
