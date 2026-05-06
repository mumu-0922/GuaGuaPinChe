const SIMILAR_WINDOW_MS = 90 * 60 * 1000;

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildSimilarWindow(trip) {
  const safeTrip = trip || {};
  const earliestTime = toNumber(safeTrip.earliestTime);
  return {
    from: safeTrip.from,
    to: safeTrip.to,
    start: earliestTime === null ? null : earliestTime - SIMILAR_WINDOW_MS,
    end: earliestTime === null ? null : earliestTime + SIMILAR_WINDOW_MS
  };
}

function getTripId(trip) {
  if (!trip) return '';
  return trip._id || trip.id || '';
}

function dedupeTrips(trips) {
  const seenIds = new Set();
  return (Array.isArray(trips) ? trips : []).filter((trip) => {
    const tripId = getTripId(trip);
    if (!tripId) return true;
    if (seenIds.has(tripId)) return false;
    seenIds.add(tripId);
    return true;
  });
}

function mergeSimilarCandidatePages(pages) {
  const merged = (Array.isArray(pages) ? pages : []).reduce((allTrips, page) => {
    if (Array.isArray(page)) return allTrips.concat(page);
    if (page && Array.isArray(page.data)) return allTrips.concat(page.data);
    return allTrips;
  }, []);
  return dedupeTrips(merged);
}

function filterSimilarTrips(baseTrip, trips) {
  const safeBase = baseTrip || {};
  const baseTime = toNumber(safeBase.earliestTime);
  if (!safeBase.from || !safeBase.to || baseTime === null) return [];

  return (Array.isArray(trips) ? trips : [])
    .filter((trip) => {
      const tripTime = toNumber(trip && trip.earliestTime);
      if (!trip || trip.status !== 'open') return false;
      if (safeBase._id && trip._id === safeBase._id) return false;
      if (trip.from !== safeBase.from || trip.to !== safeBase.to) return false;
      return tripTime !== null && Math.abs(tripTime - baseTime) <= SIMILAR_WINDOW_MS;
    })
    .sort((left, right) => Math.abs(Number(left.earliestTime) - baseTime) - Math.abs(Number(right.earliestTime) - baseTime))
    .slice(0, 3);
}

function toSimilarTripView(trip) {
  const { contactType, contactValue, ...publicTrip } = trip || {};
  return publicTrip;
}

module.exports = {
  SIMILAR_WINDOW_MS,
  buildSimilarWindow,
  dedupeTrips,
  filterSimilarTrips,
  getTripId,
  mergeSimilarCandidatePages,
  toSimilarTripView
};
