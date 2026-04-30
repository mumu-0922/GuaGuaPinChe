const cloud = require('wx-server-sdk');
const { buildReportDocument, validateReport } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const tripId = String((event && event.tripId) || '');
  const report = event && event.report ? event.report : {};
  if (!tripId) return { ok: false, errors: ['\u884c\u7a0bID\u4e0d\u80fd\u4e3a\u7a7a'] };

  const validation = validateReport(report);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  await db.collection('reports').add({ data: buildReportDocument(tripId, wxContext.OPENID, report, Date.now()) });
  return { ok: true };
};
