function canRevealContact(trip) {
  if (!trip || trip.status === 'hidden' || trip.status === 'cancelled' || trip.status === 'expired') {
    return { ok: false, error: '\u884c\u7a0b\u4e0d\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' };
  }
  return { ok: true, error: '' };
}

function canViewerRevealContact(viewer, trip) {
  const tripDecision = canRevealContact(trip);
  if (!tripDecision.ok) return tripDecision;

  const safeViewer = viewer || {};
  if (safeViewer.blocked) return { ok: false, error: '\u8d26\u53f7\u5df2\u88ab\u9650\u5236\uff0c\u4e0d\u80fd\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' };
  if (safeViewer.verifyStatus === 'pending') return { ok: false, error: '\u8ba4\u8bc1\u5ba1\u6838\u4e2d\uff0c\u901a\u8fc7\u540e\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' };
  if (safeViewer.verifyStatus !== 'verified') return { ok: false, error: '\u5b8c\u6210\u897f\u5de5\u5927\u8ba4\u8bc1\u540e\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' };
  return { ok: true, error: '' };
}

function buildContactViewLog(tripId, viewerOpenid, ownerOpenid, now) {
  return { tripId, viewerOpenid, ownerOpenid, createdAt: now };
}

module.exports = {
  canRevealContact,
  canViewerRevealContact,
  buildContactViewLog
};
