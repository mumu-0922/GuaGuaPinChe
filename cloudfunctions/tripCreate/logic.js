const CONTACT_TYPES = ['qq', 'wechat', 'phone'];
const LOCATION_ALIASES = {
  '\u897f\u5317\u5de5\u4e1a\u5927\u5b66\u957f\u5b89\u6821\u533a': '\u957f\u5b89\u6821\u533a',
  '\u897f\u5de5\u5927\u957f\u5b89\u6821\u533a': '\u957f\u5b89\u6821\u533a',
  '\u897f\u5317\u5de5\u4e1a\u5927\u5b66\u53cb\u8c0a\u6821\u533a': '\u53cb\u8c0a\u6821\u533a',
  '\u897f\u5de5\u5927\u53cb\u8c0a\u6821\u533a': '\u53cb\u8c0a\u6821\u533a',
  '\u673a\u573a': '\u54b8\u9633\u673a\u573a',
  '\u897f\u5b89\u54b8\u9633\u56fd\u9645\u673a\u573a': '\u54b8\u9633\u673a\u573a',
  '\u5317\u5ba2\u7ad9': '\u897f\u5b89\u5317\u7ad9'
};

function normalizeLocation(input) {
  const raw = String(input || '').trim();
  return LOCATION_ALIASES[raw] || raw;
}

function maskNickname(name) {
  const raw = String(name || '').trim();
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(raw)) return `${raw.slice(0, 1)}${'*'.repeat(raw.length - 1)}`;
  return raw || '\u540c\u5b66';
}

function validateServerTripDraft(draft) {
  draft = draft || {};
  const errors = [];
  const from = normalizeLocation(draft.from);
  const to = normalizeLocation(draft.to);
  const earliestTime = Number(draft.earliestTime);
  const latestTime = Number(draft.latestTime);
  const peopleCount = Number(draft.peopleCount);
  const note = String(draft.note || '').trim();
  const contactType = String(draft.contactType || '').trim();
  const contactValue = String(draft.contactValue || '').trim();

  if (!from) errors.push('\u51fa\u53d1\u5730\u4e0d\u80fd\u4e3a\u7a7a');
  if (!to) errors.push('\u5230\u8fbe\u5730\u4e0d\u80fd\u4e3a\u7a7a');
  if (from && to && from === to) errors.push('\u51fa\u53d1\u5730\u548c\u5230\u8fbe\u5730\u4e0d\u80fd\u76f8\u540c');
  if (!Number.isFinite(earliestTime) || earliestTime <= 0) errors.push('\u6700\u65e9\u51fa\u53d1\u65f6\u95f4\u65e0\u6548');
  if (!Number.isFinite(latestTime) || latestTime <= 0) errors.push('\u6700\u665a\u51fa\u53d1\u65f6\u95f4\u65e0\u6548');
  if (earliestTime > latestTime) errors.push('\u6700\u65e9\u51fa\u53d1\u65f6\u95f4\u4e0d\u80fd\u665a\u4e8e\u6700\u665a\u51fa\u53d1\u65f6\u95f4');
  if (latestTime - earliestTime > 24 * 60 * 60 * 1000) errors.push('\u6700\u65e9\u548c\u6700\u665a\u51fa\u53d1\u65f6\u95f4\u8de8\u5ea6\u4e0d\u80fd\u8d85\u8fc724\u5c0f\u65f6');
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 6) errors.push('\u540c\u884c\u4eba\u6570\u5fc5\u987b\u662f1\u52306\u4e4b\u95f4\u7684\u6574\u6570');
  if (note.length > 120) errors.push('\u5907\u6ce8\u4e0d\u80fd\u8d85\u8fc7120\u4e2a\u5b57');
  if (!CONTACT_TYPES.includes(contactType)) errors.push('\u8054\u7cfb\u65b9\u5f0f\u7c7b\u578b\u5fc5\u987b\u662fQQ\u3001\u5fae\u4fe1\u6216\u624b\u673a\u53f7');
  if (!contactValue) errors.push('\u8054\u7cfb\u65b9\u5f0f\u4e0d\u80fd\u4e3a\u7a7a');
  if (contactValue.length > 40) errors.push('\u8054\u7cfb\u65b9\u5f0f\u4e0d\u80fd\u8d85\u8fc740\u4e2a\u5b57\u7b26');

  return { ok: errors.length === 0, errors };
}

function buildTripDocument(draft, owner, now) {
  const safeDraft = draft || {};
  const safeOwner = owner || {};
  return {
    ownerOpenid: safeOwner.openid,
    ownerNickname: maskNickname(safeOwner.nickname),
    ownerVerified: Boolean(safeOwner.verified),
    ownerVerifiedLabel: safeOwner.verifiedLabel || '\u672a\u8ba4\u8bc1',
    from: normalizeLocation(safeDraft.from),
    to: normalizeLocation(safeDraft.to),
    earliestTime: Number(safeDraft.earliestTime),
    latestTime: Number(safeDraft.latestTime),
    peopleCount: Number(safeDraft.peopleCount),
    status: 'open',
    note: String(safeDraft.note || '').trim(),
    contactType: String(safeDraft.contactType || '').trim(),
    contactValue: String(safeDraft.contactValue || '').trim(),
    createdAt: now,
    updatedAt: now
  };
}

function canCreateTrip(user) {
  const safeUser = user || {};
  if (safeUser.blocked) return { ok: false, error: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u53d1\u5e03\u884c\u7a0b' };
  if (safeUser.verifyStatus === 'pending') return { ok: false, error: '\u8ba4\u8bc1\u5ba1\u6838\u4e2d\uff0c\u901a\u8fc7\u540e\u53ef\u53d1\u5e03\u884c\u7a0b' };
  if (safeUser.verifyStatus !== 'verified') return { ok: false, error: '\u5b8c\u6210\u897f\u5de5\u5927\u8ba4\u8bc1\u540e\u53ef\u53d1\u5e03\u884c\u7a0b' };
  return { ok: true, error: '' };
}

module.exports = {
  normalizeLocation,
  maskNickname,
  validateServerTripDraft,
  buildTripDocument,
  canCreateTrip
};
