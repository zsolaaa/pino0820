// Online ordering window. The pizzeria is open 11:00–22:00 every day, but
// online orders stop at 21:30 so the kitchen can finish the last tickets.
// Ad-hoc closures (holidays, early close) are handled by the admin pause
// control in shopStatus.js rather than by editing these constants.

const OPENS_AT = "11:00";
const LAST_ORDER_AT = "21:30";

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

// Workers always run in UTC, so the local wall-clock time has to come from
// Intl with an explicit zone — this handles CET/CEST switchover on its own.
function budapestMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour").value);
  const minute = Number(parts.find((p) => p.type === "minute").value);
  return hour * 60 + minute;
}

export function getOrderingHours(now = new Date()) {
  const minutes = budapestMinutes(now);
  return {
    is_open: minutes >= toMinutes(OPENS_AT) && minutes <= toMinutes(LAST_ORDER_AT),
    opens_at: OPENS_AT,
    last_order_at: LAST_ORDER_AT,
  };
}
