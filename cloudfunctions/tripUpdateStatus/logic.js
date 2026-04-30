const OWNER_STATUSES = ['open', 'full', 'cancelled'];

function validateStatusTransition(status) {
  if (!OWNER_STATUSES.includes(status)) return { ok: false, error: '\u72b6\u6001\u4e0d\u5141\u8bb8\u4fee\u6539' };
  return { ok: true, error: '' };
}

module.exports = {
  validateStatusTransition
};
