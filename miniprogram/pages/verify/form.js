const REQUIRED_FIELDS = [
  ['studentId', '学号不能为空'],
  ['realName', '真实姓名不能为空'],
  ['college', '学院不能为空'],
  ['grade', '年级不能为空']
];

function cleanForm(form) {
  const source = form || {};
  return {
    studentId: String(source.studentId || '').trim(),
    realName: String(source.realName || '').trim(),
    college: String(source.college || '').trim(),
    grade: String(source.grade || '').trim(),
    note: String(source.note || '').trim()
  };
}

function validateVerifyForm(form) {
  const cleaned = cleanForm(form);
  const errors = REQUIRED_FIELDS
    .filter(([field]) => !cleaned[field])
    .map(([, message]) => message);

  if (cleaned.studentId && !/^\d{6,20}$/.test(cleaned.studentId)) errors.push('学号格式不正确');
  if (cleaned.realName.length > 20) errors.push('姓名不能超过20个字');
  if (cleaned.college.length > 40) errors.push('学院不能超过40个字');
  if (cleaned.grade.length > 20) errors.push('年级不能超过20个字');
  if (cleaned.note.length > 120) errors.push('备注不能超过120个字');

  if (errors.length) return { ok: false, errors };
  return { ok: true, form: cleaned };
}

function buildVerifyPayload(form) {
  return { form: cleanForm(form) };
}

function getVerifyStatusView(user) {
  const safeUser = user || {};
  if (safeUser.verifyStatus === 'pending') {
    return { label: '认证审核中', tone: 'warning', actionText: '等待管理员审核' };
  }
  if (safeUser.verifyStatus === 'verified' || safeUser.verified === true) {
    return { label: '西工大已认证', tone: 'positive', actionText: '无需重复提交' };
  }
  if (safeUser.verifyStatus === 'rejected') {
    const reason = String(safeUser.rejectReason || safeUser.verifyRejectReason || '').trim();
    return {
      label: reason ? `认证未通过：${reason}` : '认证未通过',
      tone: 'danger',
      actionText: '修改信息后重新提交'
    };
  }
  return { label: '未完成校园认证', tone: 'muted', actionText: '提交人工认证' };
}

module.exports = {
  validateVerifyForm,
  buildVerifyPayload,
  getVerifyStatusView
};
