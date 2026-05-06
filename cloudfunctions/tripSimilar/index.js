const cloud = require('wx-server-sdk');
const { buildSimilarWindow, filterSimilarTrips, mergeSimilarCandidatePages, toSimilarTripView } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function loadBaseTrip(tripId) {
  const result = await db.collection('trips').doc(tripId).get().catch(() => null);
  if (!result || !result.data || result.data.status === 'hidden') return null;
  return result.data;
}

function buildWhere(window, baseTime, side) {
  const where = {
    status: 'open',
    from: window.from,
    to: window.to
  };
  if (_ && typeof _.gte === 'function' && typeof _.lte === 'function') {
    const lowerTime = side === 'before' ? window.start : baseTime;
    const upperTime = side === 'before' ? baseTime : window.end;
    const lower = _.gte(lowerTime);
    where.earliestTime = lower && typeof lower.and === 'function' ? lower.and(_.lte(upperTime)) : _.gte(lowerTime);
  }
  return where;
}

function getBaseTimeFromWindow(window) {
  return (Number(window.start) + Number(window.end)) / 2;
}

exports.main = async (event) => {
  const safeEvent = event || {};
  let baseTrip = null;

  if (safeEvent.tripId) {
    baseTrip = await loadBaseTrip(String(safeEvent.tripId));
    if (!baseTrip) return { ok: false, errors: ['行程不存在'] };
  } else if (safeEvent.trip) {
    baseTrip = safeEvent.trip;
  } else {
    return { ok: false, errors: ['行程不存在'] };
  }

  const window = buildSimilarWindow(baseTrip);
  if (!window.from || !window.to || !Number.isFinite(window.start) || !Number.isFinite(window.end)) return { ok: true, trips: [] };
  const baseTime = getBaseTimeFromWindow(window);

  const [afterResult, beforeResult] = await Promise.all([
    db.collection('trips')
      .where(buildWhere(window, baseTime, 'after'))
      .orderBy('earliestTime', 'asc')
      .limit(50)
      .get(),
    db.collection('trips')
      .where(buildWhere(window, baseTime, 'before'))
      .orderBy('earliestTime', 'desc')
      .limit(50)
      .get()
  ]);

  const candidates = mergeSimilarCandidatePages([afterResult, beforeResult]);
  const trips = filterSimilarTrips(baseTrip, candidates).map(toSimilarTripView);
  return { ok: true, trips };
};
