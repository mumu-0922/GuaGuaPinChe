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

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildTripQuery(filters) {
  const safeFilters = filters || {};
  const rawPageSize = Number(safeFilters.pageSize || 20);
  const pageSize = Math.min(Math.max(Number.isFinite(rawPageSize) ? rawPageSize : 20, 1), 50);
  return {
    from: normalizeLocation(safeFilters.from),
    to: normalizeLocation(safeFilters.to),
    dateStart: toNumberOrNull(safeFilters.dateStart),
    dateEnd: toNumberOrNull(safeFilters.dateEnd),
    keyword: String(safeFilters.keyword || '').trim(),
    pageSize,
    cursorTime: toNumberOrNull(safeFilters.cursorTime),
    mineOnly: Boolean(safeFilters.mineOnly)
  };
}

function toPublicTrip(trip) {
  const { contactType, contactValue, ...publicTrip } = trip || {};
  return publicTrip;
}

function getNextCursorTime(trips) {
  return trips.length ? trips[trips.length - 1].earliestTime : null;
}

function filterByKeyword(trips, keyword) {
  if (!keyword) return trips;
  return trips.filter((trip) => `${trip.from || ''} ${trip.to || ''} ${trip.note || ''}`.includes(keyword));
}

module.exports = {
  normalizeLocation,
  buildTripQuery,
  toPublicTrip,
  getNextCursorTime,
  filterByKeyword
};
