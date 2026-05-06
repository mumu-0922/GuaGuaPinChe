function cleanField(value) {
  return String(value || '').trim();
}

function validateVerificationForm(form) {
  const safeForm = form || {};
  const errors = [];
  const studentId = cleanField(safeForm.studentId);
  const realName = cleanField(safeForm.realName);
  const college = cleanField(safeForm.college);
  const grade = cleanField(safeForm.grade);
  const note = cleanField(safeForm.note);

  if (!studentId) errors.push('学号不能为空');
  if (!realName) errors.push('姓名不能为空');
  if (!college) errors.push('学院不能为空');
  if (!grade) errors.push('年级不能为空');

  if (studentId && !/^\d{6,20}$/.test(studentId)) errors.push('学号格式不正确');
  if (realName.length > 20) errors.push('姓名不能超过20个字');
  if (college.length > 40) errors.push('学院不能超过40个字');
  if (grade.length > 20) errors.push('年级不能超过20个字');
  if (note.length > 120) errors.push('备注不能超过120个字');

  return { ok: errors.length === 0, errors };
}

function canSubmitVerification(user, pendingRequest) {
  if (user && user.blocked) return { ok: false, error: '账号已被限制，不能提交认证' };
  if (pendingRequest) return { ok: false, error: '已有认证申请正在审核中' };
  return { ok: true, error: '' };
}

function buildVerificationRequest(userOpenid, form, now) {
  const safeForm = form || {};
  return {
    userOpenid,
    studentId: cleanField(safeForm.studentId),
    realName: cleanField(safeForm.realName),
    college: cleanField(safeForm.college),
    grade: cleanField(safeForm.grade),
    note: cleanField(safeForm.note),
    status: 'pending',
    rejectReason: '',
    reviewedBy: '',
    reviewedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

module.exports = {
  validateVerificationForm,
  canSubmitVerification,
  buildVerificationRequest
};
