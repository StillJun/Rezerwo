import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Calendar, Clock, MapPin, Phone, Check, X, ChevronLeft } from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { ManagedBooking } from "./types";
import { useTranslation } from "./i18n";
import { showToast } from "./components/Toast";

const ACC = "#7c3aed";
const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";
const font = "'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";
const MESH = "radial-gradient(ellipse 700px 500px at 50% 15%, rgba(124,58,237,.05) 0%, transparent 65%), #fbf7f4";

const minToTime = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
function isoToday() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }); }
function addDays(base: string, n: number) {
  const d = new Date(base + "T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}
function fmtDate(d: string, months: string[]) {
  const [y,m,dd] = d.split("-");
  return `${dd} ${months[Number(m)]} ${y}`;
}
function bucketSlots(mins: number[], times: string[]) {
  const b = { m: [] as [number,string][], a: [] as [number,string][], e: [] as [number,string][] };
  mins.forEach((x, i) => {
    const entry: [number,string] = [x, times[i]];
    if (x < 12*60) b.m.push(entry); else if (x < 17*60) b.a.push(entry); else b.e.push(entry);
  });
  return b;
}

const STATUS_KEY: Record<ManagedBooking["status"], string> = {
  pending: "p_statusPending", confirmed: "p_statusConfirmed", cancelled: "p_statusCancelled",
  done: "p_statusDone", no_show: "p_statusNoShow",
};

export default function ManageBookingPage({ token }: { token: string }) {
  const { t } = useTranslation();
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<"detail" | "reschedule" | "done">("detail");
  const [doneKind, setDoneKind] = useState<"cancelled" | "rescheduled">("cancelled");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  // reschedule picker state
  const [avail, setAvail] = useState<Record<string, number> | null>(null);
  const [rDate, setRDate] = useState("");
  const [slots, setSlots] = useState<{ mins: number[]; times: string[] }>({ mins: [], times: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.managedBooking(token)
      .then(setBooking)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  // load availability when the reschedule picker opens
  useEffect(() => {
    if (view !== "reschedule" || !booking?.serviceId) return;
    api.availability(booking.businessSlug, booking.serviceId, booking.masterId ?? undefined, 14)
      .then(d => setAvail(d.availability)).catch(() => setAvail(null));
  }, [view, booking]);

  // load slots for the chosen reschedule day
  useEffect(() => {
    if (view !== "reschedule" || !booking?.serviceId || !rDate) return;
    setSlotsLoading(true); setSlots({ mins: [], times: [] });
    api.slots(booking.businessSlug, rDate, booking.serviceId, booking.masterId ?? undefined)
      .then(d => setSlots({ mins: d.slots, times: d.slotTimes }))
      .catch(() => setSlots({ mins: [], times: [] }))
      .finally(() => setSlotsLoading(false));
  }, [view, booking, rDate]);

  const doCancel = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await api.cancelManagedBooking(token);
      setDoneKind("cancelled"); setView("done");
    } catch (e) { showToast((e as Error).message, "err"); }
    finally { setBusy(false); }
  };

  const doReschedule = async (startMin: number) => {
    if (!booking || !rDate) return;
    setBusy(true);
    try {
      await api.rescheduleManagedBooking(token, rDate, startMin);
      setDoneKind("rescheduled"); setView("done");
    } catch (e) { showToast((e as Error).message, "err"); }
    finally { setBusy(false); }
  };

  if (loading) return <Shell><p style={{ color: "#8b8194", fontSize: 15 }}>{t.loading}</p></Shell>;

  if (notFound || !booking) return (
    <Shell>
      <div style={{ fontSize: 46, marginBottom: 12 }}>🔍</div>
      <h1 style={S.h1}>{t.mv_notFound}</h1>
      <p style={S.sub}>{t.mv_notFoundSub}</p>
      <button style={S.primary} onClick={() => navigate("/")}>{t.backToSearch}</button>
    </Shell>
  );

  const statusLabel = t[STATUS_KEY[booking.status] as keyof typeof t] as string;
  const canModify = booking.canModify && !booking.isPast;

  if (view === "done") return (
    <Shell>
      <div style={S.successIcon}><Check size={30} color="#fff" /></div>
      <h1 style={{ ...S.h1, marginTop: 16 }}>{t.done}</h1>
      <p style={S.sub}>{doneKind === "cancelled" ? t.mv_cancelledMsg : t.mv_rescheduledMsg}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {doneKind === "cancelled" && (
          <button style={S.primary} onClick={() => navigate(`/${booking.businessSlug}`)}>{t.mv_bookAgain}</button>
        )}
        <button style={S.secondary} onClick={() => navigate(`/${booking.businessSlug}`)}>{t.mv_salonPage}</button>
      </div>
    </Shell>
  );

  if (view === "reschedule") {
    const dates = Array.from({ length: 14 }, (_, i) => addDays(isoToday(), i));
    const b = bucketSlots(slots.mins, slots.times);
    const buckets: [string, [number,string][]][] = [
      [t.slotsMorning, b.m], [t.slotsAfternoon, b.a], [t.slotsEvening, b.e],
    ];
    const filled = buckets.filter(([, arr]) => arr.length);
    return (
      <Shell wide>
        <button style={S.backLink} onClick={() => { setView("detail"); setRDate(""); }}>
          <ChevronLeft size={15} /> {t.back}
        </button>
        <h1 style={S.h1}>{t.mv_rescheduleTitle}</h1>
        <div style={S.datePicker}>
          {dates.map(d => {
            const dt = new Date(d + "T00:00:00");
            const sel = rDate === d;
            const full = avail ? (avail[d] ?? 1) === 0 : false;
            return (
              <button key={d} style={{ ...S.dateChip, ...(sel ? S.dateChipOn : {}), ...(full && !sel ? { opacity: .45 } : {}) }}
                onClick={() => setRDate(d)}>
                <span style={{ fontSize: 11, opacity: .7 }}>{t.dayNames[dt.getDay()]}</span>
                <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{dt.getDate()}</span>
                <span style={{ fontSize: 11, opacity: .7 }}>{t.months.slice(1)[dt.getMonth()]}</span>
              </button>
            );
          })}
        </div>
        {rDate && slotsLoading && <p style={S.sub}>{t.checkingSlots}</p>}
        {rDate && !slotsLoading && !slots.mins.length && <p style={S.sub}>{t.noSlots}</p>}
        {rDate && !slotsLoading && filled.map(([label, arr]) => (
          <div key={label} style={{ marginBottom: 10, width: "100%" }}>
            {filled.length > 1 && <div style={S.bucketLbl}>{label}</div>}
            <div style={S.slotGrid}>
              {arr.map(([m, time]) => (
                <button key={m} style={S.slotBtn} disabled={busy} onClick={() => doReschedule(m)}>{time}</button>
              ))}
            </div>
          </div>
        ))}
      </Shell>
    );
  }

  // ── detail view ──
  return (
    <Shell wide>
      <h1 style={S.h1}>{t.mv_title}</h1>
      <span style={{ ...S.badge, ...(booking.status === "confirmed" ? S.badgeOk : booking.status === "cancelled" ? S.badgeMuted : S.badgeWarn) }}>
        {statusLabel}
      </span>

      <div style={S.card}>
        <Row icon={<MapPin size={14} />} label={t.mv_salon} value={booking.businessName} />
        {booking.serviceName && <Row icon={<Check size={14} />} label={t.mv_service} value={booking.serviceName} />}
        {booking.masterName && <Row icon={<Check size={14} />} label={t.mv_specialist} value={booking.masterName} />}
        <Row icon={<Calendar size={14} />} label={t.mv_when} value={`${fmtDate(booking.date, t.months)}, ${minToTime(booking.startMin)}`} />
        {booking.address && <Row icon={<MapPin size={14} />} label="" value={booking.address} />}
        {booking.phone && <Row icon={<Phone size={14} />} label="" value={<a href={`tel:${booking.phone}`} style={{ color: ACC }}>{booking.phone}</a>} />}
      </div>

      {booking.isPast && <p style={S.sub}>{t.mv_past}</p>}

      {canModify && !confirmCancel && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button style={S.primary} onClick={() => setView("reschedule")}>
            <Clock size={15} /> {t.mv_rescheduleBtn}
          </button>
          <button style={S.danger} onClick={() => setConfirmCancel(true)}>
            <X size={15} /> {t.mv_cancelBtn}
          </button>
        </div>
      )}

      {canModify && confirmCancel && (
        <div style={{ marginTop: 4 }}>
          <p style={{ ...S.sub, fontWeight: 600, color: "#1a1320" }}>{t.mv_cancelConfirm}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.danger, flex: 1 }} disabled={busy} onClick={doCancel}>{t.mv_cancelBtn}</button>
            <button style={{ ...S.secondary, flex: 1 }} disabled={busy} onClick={() => setConfirmCancel(false)}>{t.mv_keepBtn}</button>
          </div>
        </div>
      )}

      {!canModify && (
        <button style={{ ...S.secondary, marginTop: 8 }} onClick={() => navigate(`/${booking.businessSlug}`)}>
          {booking.status === "cancelled" || booking.status === "done" ? t.mv_bookAgain : t.mv_salonPage}
        </button>
      )}
    </Shell>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div style={S.row}>
      <span style={{ color: "#a8a2b0", display: "flex", flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {label && <div style={{ fontSize: 11, color: "#a8a2b0", fontWeight: 600 }}>{label}</div>}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1320" }}>{value}</div>
      </div>
    </div>
  );
}

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: MESH, fontFamily: font, padding: "24px 16px" }}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: wide ? 460 : 420, padding: "28px 24px 30px", background: "#fff", borderRadius: 24, border: "1px solid #efe9ee", boxShadow: "0 8px 40px rgba(26,19,32,.08)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  h1: { fontSize: 22, fontWeight: 500, color: "#1a1320", margin: "0 0 8px", fontFamily: "'Fraunces',Georgia,serif", letterSpacing: "-0.02em" },
  sub: { fontSize: 14, color: "#71717a", lineHeight: 1.6, margin: "6px 0 16px" },
  badge: { fontSize: 11.5, fontWeight: 700, padding: "3px 12px", borderRadius: 999, marginBottom: 16 },
  badgeOk: { background: "#dcfce7", color: "#16a34a" },
  badgeWarn: { background: "#fef9c3", color: "#a16207" },
  badgeMuted: { background: "#f3f4f6", color: "#6b7280" },
  card: { background: "#faf8fb", borderRadius: 16, padding: "6px 14px", width: "100%", marginBottom: 16, border: "1px solid #efe9ee" },
  row: { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #efe9ee", textAlign: "left" },
  primary: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: GRAD, color: "#fff", border: "none", borderRadius: 999, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: font, boxShadow: "0 6px 20px rgba(124,58,237,.35)" },
  secondary: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "#fff", color: "#52525b", border: "1.5px solid #efe9ee", borderRadius: 999, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font },
  danger: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "#fff", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 999, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font },
  backLink: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", color: ACC, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font, marginBottom: 8, padding: 0 },
  successIcon: { width: 60, height: 60, borderRadius: 999, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(124,58,237,.40)" },
  datePicker: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 10, width: "100%" },
  dateChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 12px", borderRadius: 14, border: "1.5px solid #efe9ee", background: "#fbf7f4", cursor: "pointer", minWidth: 56, fontFamily: font, flexShrink: 0 },
  dateChipOn: { background: ACC, color: "#fff", borderColor: ACC },
  bucketLbl: { fontSize: 11, fontWeight: 700, color: "#8b8194", textTransform: "uppercase", letterSpacing: 0.6, margin: "4px 0 6px", textAlign: "left" },
  slotGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, width: "100%" },
  slotBtn: { padding: "11px 0", borderRadius: 12, border: "1.5px solid #efe9ee", background: "#fbf7f4", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: font, color: "#1a1320" },
};
