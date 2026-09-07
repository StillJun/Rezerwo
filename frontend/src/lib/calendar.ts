/* "Add to calendar" helpers for the booking confirmation screen.
   Builds a Google Calendar URL and a downloadable .ics file entirely on the
   client — no dependency, no network. */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  /** local date, YYYY-MM-DD */
  date: string;
  /** minutes from 00:00 */
  startMin: number;
  /** minutes */
  durationMin: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYYMMDDTHHMMSS" in local wall-clock time (no Z — floating time, matches the salon's clock) */
function stamp(date: string, min: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(mm)}00`;
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const start = stamp(e.date, e.startMin);
  const end = stamp(e.date, e.startMin + e.durationMin);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${start}/${end}`,
    ctz: "Europe/Warsaw",
  });
  if (e.description) params.set("details", e.description);
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** data: URI so no blob lifecycle / revoke is needed for the <a download> link */
export function icsDataUri(e: CalendarEvent): string {
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@rezerwo`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rezerwo//Booking//PL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(e.date, e.startMin)}`,
    `DTSTART;TZID=Europe/Warsaw:${stamp(e.date, e.startMin)}`,
    `DTEND;TZID=Europe/Warsaw:${stamp(e.date, e.startMin + e.durationMin)}`,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.location ? `LOCATION:${esc(e.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
