const { CONTACT_TYPES, LOCATION_ALIASES } = require('./constants');

function normalizeLocation(input) {
  const raw = String(input || '').trim();
  return LOCATION_ALIASES[raw] || raw;
}

function maskNickname(name) {
  const raw = String(name || '').trim();
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(raw)) return `${raw.slice(0, 1)}${'*'.repeat(raw.length - 1)}`;
  return raw || '同学';
}

function validateTripDraft(draft) {
  const errors = [];
  const from = normalizeLocation(draft.from);
  const to = normalizeLocation(draft.to);
  const earliestTime = Number(draft.earliestTime);
  const latestTime = Number(draft.latestTime);
  const peopleCount = Number(draft.peopleCount);
  const note = String(draft.note || '').trim();
  const contactType = String(draft.contactType || '').trim();
  const contactValue = String(draft.contactValue || '').trim();
  if (!from) errors.push('出发地不能为空');
  if (!to) errors.push('到达地不能为空');
  if (from && to && from === to) errors.push('出发地和到达地不能相同');
  if (!Number.isFinite(earliestTime) || earliestTime <= 0) errors.push('最早出发时间无效');
  if (!Number.isFinite(latestTime) || latestTime <= 0) errors.push('最晚出发时间无效');
  if (earliestTime > latestTime) errors.push('最早出发时间不能晚于最晚出发时间');
  if (latestTime - earliestTime > 24 * 60 * 60 * 1000) errors.push('最早和最晚出发时间跨度不能超过24小时');
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 6) errors.push('同行人数必须是1到6之间的整数');
  if (note.length > 120) errors.push('备注不能超过120个字');
  if (!CONTACT_TYPES.includes(contactType)) errors.push('联系方式类型必须是QQ、微信或手机号');
  if (!contactValue) errors.push('联系方式不能为空');
  if (contactValue.length > 40) errors.push('联系方式不能超过40个字符');
  return { ok: errors.length === 0, errors };
}

module.exports = { normalizeLocation, maskNickname, validateTripDraft };
