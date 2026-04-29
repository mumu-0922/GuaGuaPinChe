function pad2(value) { return String(value).padStart(2, '0'); }
function formatMonthDay(timestamp) {
  const date = new Date(timestamp);
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}
function formatClock(timestamp) {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function formatTripTime(earliestTime, latestTime) {
  const start = `${formatMonthDay(earliestTime)} ${formatClock(earliestTime)}`;
  if (!latestTime || latestTime === earliestTime) return start;
  return `${start} ~ ${formatClock(latestTime)}`;
}
module.exports = { pad2, formatMonthDay, formatClock, formatTripTime };
