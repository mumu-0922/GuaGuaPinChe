function buildReviewUpdates(action, reason, adminOpenid, now) {
  if (action === 'approve') {
    return {
      requestUpdate: {
        status: 'approved',
        rejectReason: '',
        reviewedBy: adminOpenid,
        reviewedAt: now,
        updatedAt: now
      },
      userUpdate: {
        verified: true,
        verifiedLabel: '西工大认证',
        verifyStatus: 'verified',
        verifyMethod: 'manual',
        rejectReason: '',
        updatedAt: now
      }
    };
  }

  if (action === 'reject') {
    const rejectReason = String(reason || '').trim() || '认证信息未通过审核';
    if (rejectReason.length > 120) return { error: '拒绝原因不能超过120个字' };
    return {
      requestUpdate: {
        status: 'rejected',
        rejectReason,
        reviewedBy: adminOpenid,
        reviewedAt: now,
        updatedAt: now
      },
      userUpdate: {
        verified: false,
        verifiedLabel: '认证失败',
        verifyStatus: 'rejected',
        verifyMethod: 'manual',
        rejectReason,
        updatedAt: now
      }
    };
  }

  return null;
}

module.exports = {
  buildReviewUpdates
};
