function canRevealContact(trip) {
  if (!trip || trip.status === 'hidden' || trip.status === 'cancelled' || trip.status === 'expired') {
    return { ok: false, error: '\u884c\u7a0b\u4e0d\u53ef\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f' };
  }
  return { ok: true, error: '' };
}

function buildContactViewLog(tripId, viewerOpenid, ownerOpenid, now) {
  return { tripId, viewerOpenid, ownerOpenid, createdAt: now };
}

module.exports = {
  canRevealContact,
  buildContactViewLog
};
