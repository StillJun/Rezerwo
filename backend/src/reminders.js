import cron from "node-cron";
import { Resend } from "resend";
import { q } from "./db.js";

let _resend = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.FROM_EMAIL || "Rezerwo <onboarding@resend.dev>";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function minToTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

async function sendReminderEmail({ to, clientName, businessName, serviceName, date, startMin }) {
  const r = getResend(); if (!r) return;
  const time = minToTime(startMin);
  await r.emails.send({
    from: FROM,
    to,
    subject: `Przypomnienie o wizycie — ${esc(businessName)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Przypomnienie o wizycie</h2>
        <p>Cześć <strong>${esc(clientName)}</strong>!</p>
        <p>Masz zaplanowaną wizytę:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#71717a">Salon</td><td style="padding:8px;font-weight:600">${esc(businessName)}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Usługa</td><td style="padding:8px;font-weight:600">${esc(serviceName || "—")}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Data</td><td style="padding:8px;font-weight:600">${esc(date)}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Godzina</td><td style="padding:8px;font-weight:600">${esc(time)}</td></tr>
        </table>
        <p style="color:#71717a;font-size:13px">Jeśli chcesz odwołać wizytę, skontaktuj się z salonem.</p>
        <hr style="border:none;border-top:1px solid #ece8f0;margin:20px 0"/>
        <p style="color:#a8a2b0;font-size:12px">Rezerwo · platforma rezerwacji online</p>
      </div>
    `,
  });
}

async function sendOwnerNotification({ to, businessName, clientName, clientPhone, serviceName, date, startMin }) {
  const r = getResend(); if (!r) return;
  const time = minToTime(startMin);
  await r.emails.send({
    from: FROM,
    to,
    subject: `Nowa rezerwacja — ${esc(clientName)} (${esc(date)} ${esc(time)})`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Nowa rezerwacja w ${esc(businessName)}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#71717a">Klient</td><td style="padding:8px;font-weight:600">${esc(clientName)}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Telefon</td><td style="padding:8px;font-weight:600">${esc(clientPhone)}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Usługa</td><td style="padding:8px;font-weight:600">${esc(serviceName || "—")}</td></tr>
          <tr style="background:#faf8fb"><td style="padding:8px;color:#71717a">Data</td><td style="padding:8px;font-weight:600">${esc(date)}</td></tr>
          <tr><td style="padding:8px;color:#71717a">Godzina</td><td style="padding:8px;font-weight:600">${esc(time)}</td></tr>
        </table>
        <p style="color:#a8a2b0;font-size:12px">Zaloguj się do panelu Rezerwo, aby zarządzać rezerwacją.</p>
      </div>
    `,
  });
}

async function runReminders() {
  if (!getResend()) { console.log("[reminders] email off (no RESEND_API_KEY)"); return; }

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

export async function sendVerificationEmail(toEmail, token) {
  const r = getResend();
  if (!r) { console.log("[email] verification email skipped (no RESEND_API_KEY)"); return; }
  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${token}`;
  await r.emails.send({
    from: FROM,
    to: toEmail,
    subject: "Potwierdź adres email — Rezerwo",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Witaj w Rezerwo!</h2>
        <p>Kliknij poniższy przycisk, aby potwierdzić swój adres email i opublikować profil w wyszukiwarce:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;margin:16px 0;font-size:15px">Potwierdź email</a>
        <p style="color:#71717a;font-size:13px">Jeśli nie rejestrowałeś się w Rezerwo, zignoruj tę wiadomość.</p>
        <hr style="border:none;border-top:1px solid #ece8f0;margin:20px 0"/>
        <p style="color:#a8a2b0;font-size:12px">Rezerwo · platforma rezerwacji online</p>
      </div>
    `,
  });
}

// notify owner immediately on new/confirmed appointment (called from booking route)
export async function notifyOwnerNewBooking(apptId) {
  if (!getResend()) return;
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

// notify client on booking lifecycle events: 'created' | 'confirmed' | 'cancelled'
export async function notifyClientBooking(apptId, event) {
  if (!getResend()) return;
  try {
    const [appt] = await q(`
      SELECT a.*, b.name AS business_name, b.address AS business_address, b.phone AS business_phone,
             s.name AS service_name
      FROM appointments a
      JOIN businesses b ON b.id = a.business_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.id = $1
    `, [apptId]);
    if (!appt || !appt.client_email) return;

    const date = String(appt.date).slice(0, 10);
    const startT = minToTime(appt.start_min);
    const endT   = minToTime(appt.start_min + appt.duration);
    const bizName  = appt.business_name;
    const bizAddr  = appt.business_address || "";
    const bizPhone = appt.business_phone   || "";

    const tableRows = [
      ["Salon", esc(bizName)],
      ["Usługa", esc(appt.service_name || "—")],
      ["Data", esc(date)],
      ["Godzina", esc(`${startT}–${endT}`)],
      ...(bizAddr  ? [["Adres", esc(bizAddr)]]           : []),
      ...(bizPhone ? [["Telefon salonu", esc(bizPhone)]]  : []),
    ];
    const tbl = `<table style="width:100%;border-collapse:collapse;margin:16px 0">${
      tableRows.map(([k, v], i) =>
        `<tr${i % 2 ? ' style="background:#faf8fb"' : ""}>`+
        `<td style="padding:8px;color:#71717a">${k}</td>`+
        `<td style="padding:8px;font-weight:600">${v}</td></tr>`
      ).join("")
    }</table>`;

    const wrap = body => `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      ${body}
      <hr style="border:none;border-top:1px solid #ece8f0;margin:20px 0"/>
      <p style="color:#a8a2b0;font-size:12px">Rezerwo · <a href="https://getrezerwo.pl" style="color:#7c3aed">getrezerwo.pl</a></p>
    </div>`;

    let subject, html;
    const hi = `<p>Cześć <strong>${esc(appt.client_name)}</strong>!</p>`;
    const contact = bizPhone ? `: ${esc(bizPhone)}` : "";

    if (event === "created") {
      const isPending = appt.status === "pending";
      subject = isPending ? `Rezerwacja przyjęta — ${esc(bizName)}` : `Rezerwacja potwierdzona — ${esc(bizName)}`;
      html = wrap(isPending
        ? `<h2 style="color:#7c3aed;margin-bottom:8px">Rezerwacja przyjęta ⏳</h2>${hi}
           <p>Twoja rezerwacja oczekuje na potwierdzenie przez salon.</p>${tbl}
           <p style="color:#71717a;font-size:13px">Salon skontaktuje się z Tobą wkrótce${contact ? ". Pytania? Zadzwoń"+contact : ""}.</p>`
        : `<h2 style="color:#7c3aed;margin-bottom:8px">Rezerwacja potwierdzona ✅</h2>${hi}
           <p>Twoja rezerwacja została przyjęta i potwierdzona!</p>${tbl}
           <p style="color:#71717a;font-size:13px">Do zobaczenia!</p>`
      );
    } else if (event === "confirmed") {
      subject = `Rezerwacja potwierdzona ✅ — ${esc(bizName)}`;
      html = wrap(`<h2 style="color:#7c3aed;margin-bottom:8px">Rezerwacja potwierdzona ✅</h2>${hi}
        <p>Salon potwierdził Twoją rezerwację.</p>${tbl}
        <p style="color:#71717a;font-size:13px">Do zobaczenia!</p>`);
    } else if (event === "cancelled") {
      subject = `Rezerwacja anulowana — ${esc(bizName)}`;
      html = wrap(`<h2 style="color:#7c3aed;margin-bottom:8px">Rezerwacja anulowana ❌</h2>${hi}
        <p>Niestety, Twoja rezerwacja w <strong>${esc(bizName)}</strong> została anulowana.</p>${tbl}
        <p style="color:#71717a;font-size:13px">Przepraszamy za niedogodności${contact ? ". Zadzwoń do salonu"+contact+" aby umówić nowy termin" : ""}.</p>`);
    } else {
      return;
    }

    const r = getResend();
    await r.emails.send({ from: FROM, to: appt.client_email, subject, html });
    console.log(`[email] client ${event} → ${appt.client_email} (appt ${apptId})`);
  } catch (err) {
    console.error(`[email] client notify (${event}) failed for appt ${apptId}:`, err.message);
  }
}

export function startReminderScheduler() {
  // every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    runReminders().catch(err => console.error("[reminders] scheduler error:", err.message));
  });
  console.log("[reminders] scheduler started (every 5 min)");
}
