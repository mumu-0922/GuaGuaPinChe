function safeText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function getVerifyRequestTitle(request) {
  const safeRequest = request || {};
  return [
    safeText(safeRequest.realName, '未知姓名'),
    safeText(safeRequest.studentId, '未知学号'),
    safeText(safeRequest.college, '未知学院')
  ].join(' · ');
}

function getReportStatusLabel(status) {
  const value = String(status || '').trim();
  const labels = {
    open: '待处理',
    reviewed: '已处理',
    rejected: '已驳回'
  };
  return labels[value] || value || '未知状态';
}

function formatAdminUser(user) {
  const safeUser = user || {};
  const nickname = safeText(safeUser.nickname, '同学');
  const openidTail = safeText(safeUser.openidTail, '未知用户');
  const verifiedLabel = safeText(safeUser.verifiedLabel, safeUser.verified ? '已认证' : '未认证');
  const blockedReason = safeText(safeUser.blockedReason, '违反社区规则');
  return {
    title: `${nickname} · ${openidTail}`,
    verifyText: verifiedLabel,
    blockText: safeUser.blocked ? `已拉黑：${blockedReason}` : '未拉黑'
  };
}

module.exports = {
  formatAdminUser,
  getReportStatusLabel,
  getVerifyRequestTitle
};
