const REASONS = ['black_car_risk', 'fake_trip', 'harassment', 'privacy', 'other'];

function validateReport(input) {
  const safeInput = input || {};
  const errors = [];
  const reason = String(safeInput.reason || '').trim();
  const detail = String(safeInput.detail || '').trim();
  if (!REASONS.includes(reason)) errors.push('\u4e3e\u62a5\u539f\u56e0\u65e0\u6548');
  if (detail.length > 200) errors.push('\u4e3e\u62a5\u8be6\u60c5\u4e0d\u80fd\u8d85\u8fc7200\u5b57');
  return { ok: errors.length === 0, errors };
}

function buildReportDocument(tripId, reporterOpenid, input, now) {
  const safeInput = input || {};
  return {
    tripId,
    reporterOpenid,
    reason: String(safeInput.reason || '').trim(),
    detail: String(safeInput.detail || '').trim(),
    status: 'open',
    createdAt: now,
    updatedAt: now
  };
}

module.exports = {
  validateReport,
  buildReportDocument
};
