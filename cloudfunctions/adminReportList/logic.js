function normalizeReportListStatus(status) {
  const value = String(status || 'open').trim();
  return ['open', 'reviewed', 'rejected'].includes(value) ? value : 'open';
}

module.exports = {
  normalizeReportListStatus
};
