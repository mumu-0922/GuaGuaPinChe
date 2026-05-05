function validateBlockReason(reason) {
  const blockedReason = String(reason || '').trim();
  if (blockedReason.length > 120) return { ok: false, error: '拉黑原因不能超过120个字' };
  return { ok: true, value: blockedReason };
}

function buildUserBlockUpdate(action, reason, adminOpenid, now) {
  if (action === 'block') {
    const reasonResult = validateBlockReason(reason);
    return {
      blocked: true,
      blockedReason: reasonResult.value || '违反社区规则',
      blockedAt: now,
      blockedBy: adminOpenid,
      updatedAt: now
    };
  }
  if (action === 'unblock') {
    return {
      blocked: false,
      blockedReason: '',
      blockedAt: null,
      blockedBy: '',
      updatedAt: now
    };
  }
  return null;
}

module.exports = {
  validateBlockReason,
  buildUserBlockUpdate
};
