const cloud = require('wx-server-sdk');
const { buildTripQuery, buildTripWhere, filterByKeyword, getNextCursorTime, toPublicTrip } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const query = buildTripQuery(event || {});
  const where = buildTripWhere(query, wxContext.OPENID, _);

  const result = await db.collection('trips')
    .where(where)
    .orderBy('earliestTime', 'asc')
    .limit(query.pageSize)
    .get();

  const publicTrips = result.data.map(toPublicTrip);
  const trips = filterByKeyword(publicTrips, query.keyword);
  return {
    ok: true,
    trips,
    nextCursorTime: getNextCursorTime(publicTrips),
    hasMore: result.data.length === query.pageSize
  };
};
