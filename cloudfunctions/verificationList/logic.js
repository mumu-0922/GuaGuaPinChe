function normalizeVerificationStatus(status) {
  const value = String(status || 'pending').trim();
  return ['pending', 'approved', 'rejected'].includes(value) ? value : 'pending';
}

module.exports = {
  normalizeVerificationStatus
};
