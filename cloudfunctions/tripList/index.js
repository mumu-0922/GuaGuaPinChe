const cloud = require('wx-server-sdk');
const { buildTripQuery, filterByKeyword, getNextCursorTime, toPublicTrip } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const query = buildTripQuery(event || {});
  const where = { status: 'open' };
  if (query.from) where.from = query.from;
  if (query.to) where.to = query.to;
  if (query.mineOnly) where.ownerOpenid = wxContext.OPENID;
  if (query.dateStart !== null && query.dateEnd !== null) where.earliestTime = _.gte(query.dateStart).and(_.lte(query.dateEnd));
  if (query.cursorTime !== null) where.earliestTime = where.earliestTime ? where.earliestTime.and(_.gt(query.cursorTime)) : _.gt(query.cursorTime);

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
