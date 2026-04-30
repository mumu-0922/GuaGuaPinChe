const REASON_OPTIONS = [
  { label: '\u7591\u4f3c\u9ed1\u8f66\u98ce\u9669', value: 'black_car_risk' },
  { label: '\u865a\u5047\u884c\u7a0b', value: 'fake_trip' },
  { label: '\u9a9a\u6270\u6216\u4e0d\u5f53\u8054\u7cfb', value: 'harassment' },
  { label: '\u9690\u79c1\u6cc4\u9732', value: 'privacy' },
  { label: '\u5176\u4ed6', value: 'other' }
];

function validateReportForm(form) {
  const safeForm = form || {};
  const errors = [];
  const reason = String(safeForm.reason || '').trim();
  const detail = String(safeForm.detail || '').trim();
  if (!REASON_OPTIONS.some((item) => item.value === reason)) errors.push('\u4e3e\u62a5\u539f\u56e0\u65e0\u6548');
  if (detail.length > 200) errors.push('\u4e3e\u62a5\u8be6\u60c5\u4e0d\u80fd\u8d85\u8fc7200\u5b57');
  return { ok: errors.length === 0, errors };
}

function buildReportPayload(tripId, form) {
  const safeForm = form || {};
  return {
    tripId,
    report: {
      reason: String(safeForm.reason || '').trim(),
      detail: String(safeForm.detail || '').trim()
    }
  };
}

module.exports = {
  REASON_OPTIONS,
  validateReportForm,
  buildReportPayload
};
