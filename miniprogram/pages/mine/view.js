const { formatTripTime } = require('../../utils/date');

const STATUS_OPTIONS = [
  { label: '\u53ef\u62fc', value: 'open' },
  { label: '\u5df2\u6ee1\u5458', value: 'full' },
  { label: '\u5df2\u53d6\u6d88', value: 'cancelled' }
];

function getStatusLabel(status) {
  const option = STATUS_OPTIONS.find((item) => item.value === status);
  return option ? option.label : status;
}

function formatMineTrip(trip) {
  const safeTrip = trip || {};
  return {
    ...safeTrip,
    routeText: `${safeTrip.from || '\u672a\u586b\u5199'} \u2192 ${safeTrip.to || '\u672a\u586b\u5199'}`,
    timeText: safeTrip.earliestTime ? formatTripTime(safeTrip.earliestTime, safeTrip.latestTime) : '\u65f6\u95f4\u5f85\u5b9a',
    statusLabel: getStatusLabel(safeTrip.status)
  };
}

function buildStatusUpdatePayload(tripId, status) {
  return { tripId, status };
}

module.exports = {
  STATUS_OPTIONS,
  getStatusLabel,
  formatMineTrip,
  buildStatusUpdatePayload
};
