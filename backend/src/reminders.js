import cron from "node-cron";
import { Resend } from "resend";
import { q } from "./db.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || "Rezerwo <noreply@rezerwo.app>";

function minToTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

async function sendReminderEmail({ to, clientName, businessName, serviceName, date, startMin }) {
  const time = minToTime(startMin);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Przypomnienie o wizycie — ${businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Przypomnienie o wizycie</h2>
        <p>Cześć <strong>${clientName}</strong>!</p>
        <p>Masz zaplanowaną wizytę:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#71717a">Salon</td><td style="padding:8px;font-weight:600">${businessName}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Usługa</td><td style="padding:8px;font-weight:600">${serviceName || "—"}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Data</td><td style="padding:8px;font-weight:600">${date}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Godzina</td><td style="padding:8px;font-weight:600">${time}</td></tr>
        </table>
        <p style="color:#71717a;font-size:13px">Jeśli chcesz odwołać wizytę, skontaktuj się z salonem.</p>
        <hr style="border:none;border-top:1px solid #ece8f0;margin:20px 0"/>
        <p style="color:#a8a2b0;font-size:12px">Rezerwo · platforma rezerwacji online</p>
      </div>
    `,
  });
}

async function sendOwnerNotification({ to, businessName, clientName, clientPhone, serviceName, date, startMin }) {
  const time = minToTime(startMin);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nowa rezerwacja — ${clientName} (${date} ${time})`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Nowa rezerwacja w ${businessName}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#71717a">Klient</td><td style="padding:8px;font-weight:600">${clientName}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Telefon</td><td style="padding:8px;font-weight:600">${clientPhone}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Usługa</td><td style="padding:8px;font-weight:600">${serviceName || "—"}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Data</td><td style="padding:8px;font-weight:600">${date}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Godzina</td><td style="padding:8px;font-weight:600">${time}</td></tr>
        </table>
        <p style="color:#a8a2b0;font-size:12px">Zaloguj się do panelu Rezerwo, aby zarządzać rezerwacją.</p>
      </div>
    `,
  });
}

async function runReminders() {
  if (!process.env.RESEND_API_KEY) return; // skip if not configured

  const now = new Date();
  // find active appointments in the next 25 hours that have an email
  const upcoming = await q(`
    SELECT a.*, b.name AS business_name, b.owner_id, b.reminder_hours, b.phone AS biz_phone,
           s.name AS service_name, o.email AS owner_email
    FROM appointments a
    JOIN businesses b ON b.id = a.business_id
    JOIN owners o ON o.id = b.owner_id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.status IN ('pending','confirmed')
      AND a.client_email != ''
      AND (a.date::date + (a.start_min || ' minutes')::interval) > now()
      AND (a.date::date + (a.start_min || ' minutes')::interval) < now() + interval '25 hours'
  `);

  for (const appt of upcoming) {
    const apptTime = new Date(`${String(appt.date).slice(0,10)}T00:00:00`);
    apptTime.setMinutes(apptTime.getMinutes() + appt.start_min);
    const diffMs = apptTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    const reminderHours = Array.isArray(appt.reminder_hours) ? appt.reminder_hours : [24, 4];

    for (const h of reminderHours) {
      // within ±10 minutes of the reminder threshold
      if (Math.abs(diffHours - h) > 10 / 60) continue;

      // check if already sent
      const [already] = await q(
        "SELECT id FROM reminders_sent WHERE appointment_id=$1 AND hours_before=$2",
        [appt.id, h]
      );
      if (already) continue;

      try {
        await sendReminderEmail({
          to: appt.client_email,
          clientName: appt.client_name,
          businessName: appt.business_name,
          serviceName: appt.service_name,
          date: String(appt.date).slice(0, 10),
          startMin: appt.start_min,
        });
        await q(
          "INSERT INTO reminders_sent (appointment_id, hours_before) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [appt.id, h]
        );
        console.log(`[reminders] sent ${h}h reminder to ${appt.client_email} for appt ${appt.id}`);
      } catch (err) {
        console.error(`[reminders] failed to send for appt ${appt.id}:`, err.message);
      }
    }
  }
}

// notify owner immediately on new/confirmed appointment (called from booking route)
export async function notifyOwnerNewBooking(apptId) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const [appt] = await q(`
      SELECT a.*, b.name AS business_name, s.name AS service_name, o.email AS owner_email
      FROM appointments a
      JOIN businesses b ON b.id = a.business_id
      JOIN owners o ON o.id = b.owner_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.id = $1
    `, [apptId]);
    if (!appt) return;
    await sendOwnerNotification({
      to: appt.owner_email,
      businessName: appt.business_name,
      clientName: appt.client_name,
      clientPhone: appt.client_phone,
      serviceName: appt.service_name,
      date: String(appt.date).slice(0, 10),
      startMin: appt.start_min,
    });
  } catch (err) {
    console.error("[reminders] owner notify failed:", err.message);
  }
}

export function startReminderScheduler() {
  // every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    runReminders().catch(err => console.error("[reminders] scheduler error:", err.message));
  });
  console.log("[reminders] scheduler started (every 5 min)");
}
