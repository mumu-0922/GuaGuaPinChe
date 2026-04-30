function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatClockInput(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function buildDefaultDraft(now = new Date()) {
  return {
    from: '',
    to: '',
    date: formatDateInput(now),
    earliestClock: formatClockInput(addMinutes(now, 60)),
    latestClock: formatClockInput(addMinutes(now, 90)),
    peopleCount: 1,
    contactType: 'qq',
    contactValue: '',
    note: ''
  };
}

function combineDateTime(dateText, clockText) {
  const [year, month, day] = String(dateText || '').split('-').map(Number);
  const [hour, minute] = String(clockText || '').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function setDraftField(draft, field, value) {
  return { ...(draft || {}), [field]: value };
}

function buildTripDraftFromForm(form) {
  const safeForm = form || {};
  return {
    from: String(safeForm.from || '').trim(),
    to: String(safeForm.to || '').trim(),
    earliestTime: combineDateTime(safeForm.date, safeForm.earliestClock),
    latestTime: combineDateTime(safeForm.date, safeForm.latestClock),
    peopleCount: Number(safeForm.peopleCount),
    contactType: String(safeForm.contactType || '').trim(),
    contactValue: String(safeForm.contactValue || '').trim(),
    note: String(safeForm.note || '').trim()
  };
}

module.exports = {
  buildDefaultDraft,
  buildTripDraftFromForm,
  combineDateTime,
  setDraftField
};
