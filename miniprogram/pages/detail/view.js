const { formatTripTime } = require('../../utils/date');

function formatTripView(trip) {
  const safeTrip = trip || {};
  const routeText = `${safeTrip.from || '\u672a\u586b\u5199'} \u2192 ${safeTrip.to || '\u672a\u586b\u5199'}`;
  return {
    routeText,
    timeText: safeTrip.earliestTime ? formatTripTime(safeTrip.earliestTime, safeTrip.latestTime) : '\u65f6\u95f4\u5f85\u5b9a',
    peopleText: `${safeTrip.peopleCount || 1}\u4eba\u540c\u884c`,
    ownerText: `${safeTrip.ownerNickname || '\u540c\u5b66'} \u00b7 ${safeTrip.ownerVerified ? '\u5df2\u8ba4\u8bc1' : '\u672a\u8ba4\u8bc1'}`,
    noteText: safeTrip.note || '\u65e0\u5907\u6ce8'
  };
}

function formatContact(contact) {
  if (!contact || !contact.contactValue) return '';
  return `${contact.contactType}: ${contact.contactValue}`;
}

function buildShareMessage(tripId, trip) {
  const safeTrip = trip || {};
  const title = safeTrip.from && safeTrip.to ? `${safeTrip.from} \u2192 ${safeTrip.to} \u62fc\u8f66` : '\u897f\u5de5\u5927\u62fc\u8f66';
  return {
    title,
    path: `/pages/detail/detail?id=${tripId || ''}`
  };
}

module.exports = {
  formatTripView,
  formatContact,
  buildShareMessage
};
