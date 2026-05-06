function normalizeReportStatus(status) {
  const value = String(status || '').trim();
  return ['reviewed', 'rejected'].includes(value) ? value : '';
}

function validateResolutionNote(note) {
  const resolutionNote = String(note || '').trim();
  if (resolutionNote.length > 120) return { ok: false, error: '处理备注不能超过120个字' };
  return { ok: true, value: resolutionNote };
}

function buildReportResolution(status, note, hideTrip, adminOpenid, now) {
  const normalizedStatus = normalizeReportStatus(status);
  if (!normalizedStatus) return null;
  const noteResult = validateResolutionNote(note);
  return {
    reportUpdate: {
      status: normalizedStatus,
      resolutionNote: noteResult.value || String(note || '').trim(),
      resolvedBy: adminOpenid,
      resolvedAt: now,
      updatedAt: now
    },
    tripUpdate: hideTrip ? { status: 'hidden', updatedAt: now } : null
  };
}

module.exports = {
  normalizeReportStatus,
  validateResolutionNote,
  buildReportResolution
};
