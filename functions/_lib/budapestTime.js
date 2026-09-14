// Period boundaries for the admin stats, expressed as UTC instants.
// created_at is stored as UTC ("YYYY-MM-DD HH:MM:SS"), but "today" / "this
// week" / "this month" only make sense on the Budapest calendar — and Workers
// run in UTC with no tzdata in SQLite, so the boundaries are computed here.

function budapestParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// How far Budapest is ahead of UTC at this instant (+60 in winter, +120 in summer).
function offsetMinutes(date) {
  const p = budapestParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - date.getTime()) / 60000;
}

// The UTC instant of Budapest-local midnight on the given local calendar date.
// `reference` seeds the offset guess; on the two DST-transition days a day's
// midnight offset differs from the reference instant's, so one correction pass
// re-resolves it against the candidate instant itself.
function localMidnightUtc(year, month, day, reference) {
  const localMidnight = Date.UTC(year, month - 1, day);
  const firstGuess = new Date(localMidnight - offsetMinutes(reference) * 60000);
  const corrected = offsetMinutes(firstGuess);
  return new Date(localMidnight - corrected * 60000);
}

export function startOfBudapestDay(date = new Date()) {
  const p = budapestParts(date);
  return localMidnightUtc(p.year, p.month, p.day, date);
}

export function startOfBudapestWeek(date = new Date()) {
  const p = budapestParts(date);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return localMidnightUtc(p.year, p.month, p.day - daysSinceMonday, date);
}

export function startOfBudapestMonth(date = new Date()) {
  const p = budapestParts(date);
  return localMidnightUtc(p.year, p.month, 1, date);
}

// Matches the format SQLite's datetime('now') writes into created_at, so the
// boundary can be compared as a plain string.
export function toSqlUtc(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// The Budapest calendar date ("YYYY-MM-DD") an instant falls on.
export function budapestDateStr(date = new Date()) {
  const p = budapestParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// The UTC half-open range [since, until) covering one Budapest calendar date,
// ready to compare against created_at.
export function budapestDayRange(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Midday keeps the offset seed clear of both DST transition hours;
  // localMidnightUtc re-resolves the offset against the candidate anyway.
  const reference = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    since: toSqlUtc(localMidnightUtc(year, month, day, reference)),
    until: toSqlUtc(localMidnightUtc(year, month, day + 1, reference)),
  };
}
