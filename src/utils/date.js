const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export function istanbulDateIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

export function addIsoDays(value, days) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function istanbulMonthStartEpoch(value = new Date()) {
  const iso = istanbulDateIso(value);
  const match = iso.match(/^(\d{4})-(\d{2})-/);
  if (!match) return 0;
  // Istanbul has been UTC+03:00 year-round since 2016.
  return Date.parse(`${match[1]}-${match[2]}-01T00:00:00+03:00`);
}

export { ISTANBUL_TIME_ZONE };
