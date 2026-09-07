import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  MapPin, Phone, Instagram, Clock, ChevronLeft,
  BadgeCheck, X, Check, MessageSquarePlus, ArrowLeft,
  Mail, Send, Globe, Navigation, Music, Link, Share2, CalendarPlus,
} from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { PublicBusiness, PublicMaster, PublicService, BookingResult, Review } from "./types";
import { useTranslation } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";
import { loadClient, saveClient } from "./lib/clientMemory";
import { pushRecent } from "./lib/marketMemory";
import { isEmail, isPhone } from "./lib/validate";
import { googleCalendarUrl, icsDataUri } from "./lib/calendar";
import { useModalA11y } from "./lib/useModalA11y";
import { showToast } from "./components/Toast";

const ACC  = "#7c3aed";
const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";
const font = "'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";
const MESH = [
  "radial-gradient(ellipse 900px 600px at 12% 35%, rgba(124,58,237,.045) 0%, transparent 65%)",
  "radial-gradient(ellipse 700px 500px at 88% 72%, rgba(224,57,158,.032) 0%, transparent 60%)",
  "#fbf7f4",
].join(",");
const BANNERS: Record<string, string> = {
  violet: "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  rose:   "linear-gradient(135deg,#ff9a9e,#fecfef)",
  peach:  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  ink:    "linear-gradient(135deg,#302b3a,#5b4b6e)",
  mint:   "linear-gradient(135deg,#a8edea,#fed6e3)",
  gold:   "linear-gradient(135deg,#f6d365,#fda085)",
};
const DAY_ORDER = ["mon","tue","wed","thu","fri","sat","sun"];

function minToTime(m: number) {
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
}
function isoToday() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }); }
/* ── Open/closed badge ── */
const DAY_IDX = ["sun","mon","tue","wed","thu","fri","sat"] as const;
function getOpenStatus(hours: Record<string, [string,string]>): { open: boolean; nextOpenTime?: string; closesAt?: string } {
  try {
    const warsawStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
    const w = new Date(warsawStr);
    const todayKey = DAY_IDX[w.getDay()];
    const curMin = w.getHours() * 60 + w.getMinutes();
    const todayH = hours[todayKey];
    if (todayH) {
      const [oh, om] = todayH[0].split(":").map(Number);
      const [ch, cm] = todayH[1].split(":").map(Number);
      const closeMin = ch * 60 + cm;
      if (curMin >= oh * 60 + om && curMin < closeMin)
        return { open: true, ...(closeMin - curMin <= 60 ? { closesAt: todayH[1] } : {}) };
      if (curMin < oh * 60 + om) return { open: false, nextOpenTime: todayH[0] };
    }
    for (let i = 1; i <= 7; i++) {
      const key = DAY_IDX[(w.getDay() + i) % 7];
      if (hours[key]) return { open: false, nextOpenTime: hours[key][0] };
    }
  } catch { /* ignore */ }
  return { open: false };
}

/* ── Contact URL normalizers ── */
function normContact(key: string, val: string): string {
  if (!val) return "";
  const v = val.trim();
  if (key === "email") return `mailto:${v}`;
  if (key === "whatsapp") return `https://wa.me/${v.replace(/[^0-9+]/g,"")}`;
  if (key === "telegram") return v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/,"")}`;
  if (key === "facebook") return v.startsWith("http") ? v : `https://facebook.com/${v}`;
  if (key === "tiktok") return v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/,"")}`;
  if (key === "website") return v.startsWith("http") ? v : `https://${v}`;
  return v; // googleMaps — use as-is
}

function fmtDur(min: number, durH: string, durM: string): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} ${durM}`;
  if (m === 0) return `${h} ${durH}`;
  return `${h} ${durH} ${m} ${durM}`;
}
function fmtPrice(price: number | null | undefined, onSite: string): string {
  if (!price) return onSite;
  return `${price} zł`;
}
function addDays(base: string, n: number) {
  // Use noon UTC to avoid DST/timezone boundary issues with date arithmetic
  const d = new Date(base + "T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}
function formatDate(d: string, months: string[]) {
  const [y,m,dd] = d.split("-");
  return `${dd} ${months[Number(m)]} ${y}`;
}

/* ========== BOOKING WIZARD ========== */
type WizardStep = "resolve"|"service"|"master"|"date"|"slots"|"details"|"done";

/* Remember the last service + master a client picked for this salon (per tab session),
   so reopening the wizard doesn't lose the most annoying choices. No PII here. */
interface WizardMemory { serviceId: number; masterId: number|null; masterName: string }
function loadWizMemory(slug: string): WizardMemory|null {
  try {
    const raw = sessionStorage.getItem(`rz_wiz_${slug}`);
    return raw ? JSON.parse(raw) as WizardMemory : null;
  } catch { return null; }
}
function saveWizMemory(slug: string, m: WizardMemory): void {
  try { sessionStorage.setItem(`rz_wiz_${slug}`, JSON.stringify(m)); } catch { /* ignore */ }
}

/** Split slot indices into morning / afternoon / evening buckets. */
function bucketSlots(mins: number[], times: string[]) {
  const b = { morning: [] as [number,string][], afternoon: [] as [number,string][], evening: [] as [number,string][] };
  mins.forEach((m, i) => {
    const entry: [number,string] = [m, times[i]];
    if (m < 12 * 60) b.morning.push(entry);
    else if (m < 17 * 60) b.afternoon.push(entry);
    else b.evening.push(entry);
  });
  return b;
}

interface WizardState {
  service: PublicService|null;
  masterId: number|null;
  masterName: string;
  date: string;
  slot: number|null;
  name: string;
  phone: string;
  email: string;
  comment: string;
}

function masterInitials(name: string): string {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
}

function BookingWizard({ biz, initService, onClose }: {
  biz: PublicBusiness;
  initService: PublicService|null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const a11yRef = useModalA11y(onClose);
  const remembered = useMemo(() => loadClient(), []);
  // Restore last service/master for this salon when the client didn't come in via a service button
  const restored = useMemo(() => {
    if (initService) return null;
    const mem = loadWizMemory(biz.slug);
    if (!mem) return null;
    const svc = (biz.services || []).find(s => s.id === mem.serviceId);
    return svc ? { svc, mem } : null;
  }, [biz.slug, biz.services, initService]);

  const [step, setStep] = useState<WizardStep>(
    initService ? "resolve" : restored ? "date" : "service"
  );
  const [state, setState] = useState<WizardState>({
    service: initService || restored?.svc || null,
    masterId: restored?.mem.masterId ?? null,
    masterName: restored?.mem.masterName ?? "",
    date: isoToday(), slot: null,
    name: remembered.name, phone: remembered.phone, email: remembered.email, comment: "",
  });
  const [slots, setSlots] = useState<{ mins: number[]; times: string[] }>({ mins:[], times:[] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [avail, setAvail] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<BookingResult|null>(null);
  const [bookingTerms, setBookingTerms] = useState(false);
  const [masters, setMasters] = useState<PublicMaster[]>([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);

  const set = (k: keyof WizardState, v: unknown) => setState(p=>({...p,[k]:v}));

  // Fetch all active masters once on open
  useEffect(() => {
    api.publicMasters(biz.slug)
      .then(setMasters).catch(() => {})
      .finally(() => setMastersLoaded(true));
  }, [biz.slug]);

  // Capable masters for the currently selected service
  const capableMasters = state.service
    ? masters.filter(m => m.serviceIds.includes(state.service!.id))
    : [];
  const hasMasterChoice = capableMasters.length >= 2;

  // "resolve" gate: entered via a service button — wait for masters, then route to
  // the master step (if there's a real choice) or straight to the date step.
  useEffect(() => {
    if (step === "resolve" && mastersLoaded) {
      setStep(capableMasters.length >= 2 ? "master" : "date");
    }
  }, [step, mastersLoaded, capableMasters.length]);

  // Load slots when date / service / master changes
  useEffect(() => {
    if (step !== "slots" || !state.service || !state.date) return;
    setSlotsLoading(true); setSlots({mins:[],times:[]});
    api.slots(biz.slug, state.date, state.service.id, state.masterId ?? undefined)
      .then(d => setSlots({mins:d.slots, times:d.slotTimes}))
      .catch(() => setSlots({mins:[],times:[]}))
      .finally(() => setSlotsLoading(false));
  }, [step, state.service, state.date, state.masterId, biz.slug]);

  // Load 14-day availability per service/master combo, for the date picker
  const svcId = state.service?.id;
  useEffect(() => {
    if (svcId == null) return;
    let cancelled = false;
    setAvail(null);
    api.availability(biz.slug, svcId, state.masterId ?? undefined, 14)
      .then(d => { if (!cancelled) setAvail(d.availability); })
      .catch(() => { if (!cancelled) setAvail(null); });
    return () => { cancelled = true; };
  }, [svcId, state.masterId, biz.slug]);

  const book = async () => {
    if (!state.service || state.slot == null || !state.name.trim() || !state.phone.trim()) {
      setErr(t.bookingErrRequired); return;
    }
    if (!isPhone(state.phone)) { setErr(t.errPhoneFormat); return; }
    if (state.email.trim() && !isEmail(state.email)) { setErr(t.errEmailFormat); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.book(biz.slug, {
        service_id: state.service.id,
        client_name: state.name.trim(),
        client_phone: state.phone.trim(),
        client_email: state.email.trim(),
        comment: state.comment.trim(),
        date: state.date,
        start_min: state.slot,
        master_id: state.masterId ?? undefined,
      });
      saveClient({ name: state.name.trim(), phone: state.phone.trim(), email: state.email.trim() });
      setResult(r); setStep("done");
    } catch(e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const calEvent = state.service && state.slot != null ? {
    title: `${state.service.name} — ${biz.name}`,
    description: [biz.phone && `Tel: ${biz.phone}`, state.comment.trim()].filter(Boolean).join("\n"),
    location: [biz.address, biz.city].filter(Boolean).join(", "),
    date: state.date,
    startMin: state.slot,
    durationMin: state.service.duration,
  } : null;

  const services = biz.services || [];
  const groups: Record<string,PublicService[]> = {};
  services.forEach(s => { (groups[s.grp||t.services] ||= []).push(s); });

  // Visible step sequence — service step is skipped when the client arrived via a
  // service button or a restored choice; master step appears only on a real choice.
  const skipService = !!initService || !!restored;
  const seq: WizardStep[] = [
    ...(skipService ? [] : ["service" as const]),
    ...(hasMasterChoice ? ["master" as const] : []),
    "date", "slots", "details",
  ];
  const stepNum = Math.max(1, seq.indexOf(step) + 1);
  const totalSteps = seq.length;
  const goBack = () => { const i = seq.indexOf(step); if (i > 0) setStep(seq[i - 1]); };

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div ref={a11yRef} role="dialog" aria-modal="true" tabIndex={-1}
        style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        {/* wizard header */}
        <div style={S.wizHead}>
          {step!=="done" && step!=="resolve" && stepNum>1 && (
            <button style={S.backBtn} onClick={goBack} aria-label={t.back}>
              <ChevronLeft size={16}/>
            </button>
          )}
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:ACC}}>{biz.name}</div>
            {step!=="done" && step!=="resolve" && (
              <div style={{fontSize:11.5,color:"#a8a2b0"}}>{t.step(stepNum, totalSteps)}</div>
            )}
          </div>
          <button style={S.closeBtn} onClick={onClose} aria-label={t.close}><X size={18}/></button>
        </div>

        {/* progress bar */}
        {step!=="done" && step!=="resolve" && (
          <div style={S.progress}>
            <div style={{...S.progressFill,width:`${(stepNum/totalSteps)*100}%`}}/>
          </div>
        )}

        {/* STEP: resolve (waiting for masters after entering via a service button) */}
        {step==="resolve" && (
          <div style={S.empty}>{t.checkingSlots}</div>
        )}

        {/* STEP: choose service */}
        {step==="service" && (
          <div>
            <h3 style={S.stepTitle}>{t.chooseService}</h3>
            {Object.entries(groups).map(([grp,items])=>(
              <div key={grp} style={{marginBottom:14}}>
                {grp && Object.keys(groups).length>1 && <div style={S.grpLabel}>{grp}</div>}
                <div style={S.svcList}>
                  {items.map(s=>(
                    <button key={s.id} className="svc-option" style={S.svcOption}
                      onClick={()=>{
                        const capable = masters.filter(m => m.serviceIds.includes(s.id));
                        const auto = capable.length === 1 ? capable[0] : null;
                        setState(p => ({
                          ...p, service: s, slot: null,
                          masterId: auto ? auto.id : null,
                          masterName: auto ? auto.name : "",
                        }));
                        saveWizMemory(biz.slug, { serviceId: s.id, masterId: auto?.id ?? null, masterName: auto?.name ?? "" });
                        setStep(capable.length >= 2 ? "master" : "date");
                      }}>
                      <div style={{flex:1,textAlign:"left"}}>
                        <div style={{fontSize:14,fontWeight:700}}>{s.name}</div>
                        {s.description&&<div style={{fontSize:12.5,color:"#71717a",marginTop:2}}>{s.description}</div>}
                        <div style={{fontSize:12,color:"#a8a2b0",marginTop:3,display:"flex",gap:8}}>
                          <span><Clock size={10}/> {fmtDur(s.duration, t.p_svcDurationHours, t.p_svcDurationMins)}</span>
                        </div>
                      </div>
                      <div style={{fontWeight:800,color:ACC,fontSize:15,flexShrink:0}}>{fmtPrice(s.price, t.p_priceOnSite)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!services.length && <div style={S.empty}>{t.noServices}</div>}
          </div>
        )}

        {/* STEP: choose master */}
        {step==="master" && state.service && (
          <div>
            <h3 style={S.stepTitle}>{t.chooseMaster}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {fmtDur(state.service.duration, t.p_svcDurationHours, t.p_svcDurationMins)} · {fmtPrice(state.service.price, t.p_priceOnSite)}</span>
            </div>

            {/* Any available option */}
            <button className="svc-option" style={S.masterCard}
              onClick={()=>{
                set("masterId", null); set("masterName", "");
                saveWizMemory(biz.slug, { serviceId: state.service!.id, masterId: null, masterName: "" });
                setStep("date");
              }}>
              <div style={S.masterAvatarAny}>✦</div>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:700}}>{t.anyMaster}</div>
                <div style={{fontSize:12,color:"#a8a2b0",marginTop:2}}>{t.anyMasterSub}</div>
              </div>
            </button>

            {capableMasters.map(master=>(
              <button key={master.id} className="svc-option" style={S.masterCard}
                onClick={()=>{
                  set("masterId", master.id); set("masterName", master.name);
                  saveWizMemory(biz.slug, { serviceId: state.service!.id, masterId: master.id, masterName: master.name });
                  setStep("date");
                }}>
                <div style={S.masterAvatar}>
                  {master.photo
                    ? <img src={master.photo} style={S.masterAvatarImg}
                        onError={e=>{ (e.currentTarget as HTMLImageElement).style.display="none"; }}/>
                    : <span style={S.masterInitialsStyle}>{masterInitials(master.name)}</span>
                  }
                </div>
                <div style={{flex:1,textAlign:"left"}}>
                  <div style={{fontSize:14,fontWeight:700}}>{master.name}</div>
                  {master.bio && (
                    <div style={{fontSize:12,color:"#71717a",marginTop:2,lineHeight:1.4}}>
                      {master.bio.length>70 ? master.bio.slice(0,70)+"…" : master.bio}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP: choose date */}
        {step==="date" && state.service && (() => {
          const dates = Array.from({length:14},(_,i)=>addDays(isoToday(),i));
          const firstFree = avail ? dates.find(d => (avail[d] ?? 1) > 0) : null;
          const goToDate = (d: string) => { set("date",d); set("slot",null); setStep("slots"); };
          return (
          <div>
            <h3 style={S.stepTitle}>{t.chooseDate}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {fmtDur(state.service.duration, t.p_svcDurationHours, t.p_svcDurationMins)} · {fmtPrice(state.service.price, t.p_priceOnSite)}</span>
              {state.masterName && <span style={{color:ACC}}> · {state.masterName}</span>}
            </div>

            {firstFree && (
              <button style={S.earliestBtn} onClick={()=>goToDate(firstFree)}>
                ⚡ {t.earliestSlot}: {formatDate(firstFree, t.months)}
              </button>
            )}

            <div style={S.datePicker} className="date-picker">
              {dates.map(d=>{
                const dt = new Date(d+"T00:00:00");
                const selected = state.date===d;
                const full = avail ? (avail[d] ?? 1) === 0 : false;
                return (
                  <button key={d} className="date-chip"
                    style={{...S.dateChip,...(selected?S.dateChipOn:{}),...(full&&!selected?S.dateChipFull:{})}}
                    onClick={()=>goToDate(d)}>
                    <span style={{fontSize:11,opacity:0.7}}>{t.dayNames[dt.getDay()]}</span>
                    <span style={{fontSize:17,fontWeight:800,lineHeight:1}}>{dt.getDate()}</span>
                    <span style={{fontSize:11,opacity:0.7}}>{t.months.slice(1)[dt.getMonth()]}</span>
                    {full && <span style={S.dateChipFullLbl}>{t.dayFull}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* STEP: choose slot */}
        {step==="slots" && state.service && (
          <div>
            <h3 style={S.stepTitle}>{t.chooseTime}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {formatDate(state.date, t.months)}</span>
              {state.masterName && <span style={{color:ACC}}> · {state.masterName}</span>}
            </div>

            {slotsLoading && <div style={S.empty}>{t.checkingSlots}</div>}
            {!slotsLoading && !slots.mins.length && (
              <div style={S.empty}>
                {t.noSlots}<br/>
                <span style={{color:ACC,cursor:"pointer",fontSize:13}} onClick={()=>setStep("date")}>
                  {t.changeDayLink}
                </span>
              </div>
            )}
            {!slotsLoading && slots.mins.length>0 && (() => {
              const b = bucketSlots(slots.mins, slots.times);
              const buckets: [string, [number,string][]][] = [
                [t.slotsMorning, b.morning], [t.slotsAfternoon, b.afternoon], [t.slotsEvening, b.evening],
              ];
              const filled = buckets.filter(([,arr]) => arr.length);
              const multi = filled.length > 1;
              return filled.map(([label, arr]) => (
                <div key={label} style={{marginBottom:10}}>
                  {multi && <div style={S.slotBucketLbl}>{label}</div>}
                  <div style={S.slotGrid} className="slot-grid">
                    {arr.map(([m, time])=>(
                      <button key={m} className="slot-btn" style={{...S.slotBtn,...(state.slot===m?S.slotBtnOn:{})}}
                        onClick={()=>{ set("slot",m); setStep("details"); }}>
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}
            <button style={S.textBtn} onClick={()=>setStep("date")}>
              <ChevronLeft size={14}/> {t.chooseDate}
            </button>
          </div>
        )}

        {/* STEP: fill details */}
        {step==="details" && state.service && state.slot!=null && (
          <div>
            <h3 style={S.stepTitle}>{t.yourData}</h3>
            <div style={S.summaryCard}>
              <div style={S.summaryRow}>
                <span style={S.summaryV}>{state.service.name}</span>
                <span style={{color:ACC,fontWeight:800}}>{fmtPrice(state.service.price, t.p_priceOnSite)}</span>
              </div>
              <div style={S.summaryRow}>
                <span style={{color:"#71717a"}}>{formatDate(state.date, t.months)}, {minToTime(state.slot)}</span>
                {state.masterName && <span style={{color:ACC}}>{state.masterName}</span>}
              </div>
              <div style={{fontSize:11.5,color:"#a8a2b0",marginTop:2}}>
                {fmtDur(state.service.duration, t.p_svcDurationHours, t.p_svcDurationMins)}
              </div>
            </div>
            {biz.confirmRequired && (
              <div style={S.confirmNotice}>{t.confirmRequiredNotice}</div>
            )}

            <label style={S.lbl} htmlFor="bk-name">{t.fullName}</label>
            <input id="bk-name" style={S.input} value={state.name} onChange={e=>set("name",e.target.value)}
              placeholder={t.namePlaceholder} autoComplete="name" autoFocus/>

            <label style={S.lbl} htmlFor="bk-phone">{t.phone}</label>
            <input id="bk-phone" style={S.input} value={state.phone} onChange={e=>set("phone",e.target.value)}
              placeholder="+48 500 600 700" type="tel" inputMode="tel" autoComplete="tel"/>

            <label style={S.lbl} htmlFor="bk-email">{t.email}</label>
            <input id="bk-email" style={S.input} value={state.email} onChange={e=>set("email",e.target.value)}
              placeholder="jan@example.com" type="email" inputMode="email" autoComplete="email"/>
            {!state.email.trim() && <p style={S.nudge}>{t.emailReminderHint}</p>}

            <label style={S.lbl} htmlFor="bk-comment">{t.commentSalon}</label>
            <textarea id="bk-comment" style={{...S.input,minHeight:64,resize:"vertical" as const,fontFamily:font}}
              value={state.comment} onChange={e=>set("comment",e.target.value)}
              placeholder={t.commentSalonPlaceholder}/>

            <label style={{display:"flex",alignItems:"flex-start",gap:10,margin:"12px 0 8px",cursor:"pointer"}}>
              <input
                type="checkbox"
                checked={bookingTerms}
                onChange={e=>setBookingTerms(e.target.checked)}
                style={{marginTop:3,accentColor:"#7c3aed",flexShrink:0,width:16,height:16}}
              />
              <span style={{fontSize:12.5,color:"#52525b",lineHeight:1.6}}>
                {t.bookingTermsAccept}{" "}
                <a href="/regulamin" target="_blank" rel="noopener noreferrer" style={{color:"#7c3aed",fontWeight:600}}>{t.terms}</a>
                {" "}{t.bookingTermsAnd}{" "}
                <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" style={{color:"#7c3aed",fontWeight:600}}>{t.privacy}</a>
                {t.bookingTermsData}
              </span>
            </label>

            {err && <div style={S.err}>{err}</div>}

            <button className="btn-primary" style={S.primary} onClick={book} disabled={busy || !bookingTerms}>
              {busy?"…":t.confirmBooking}
            </button>
            <p style={S.hint}>{t.bookingHint}</p>
          </div>
        )}

        {/* STEP: done */}
        {step==="done" && result && (
          <div style={{textAlign:"center" as const,padding:"20px 0"}}>
            <div style={S.successIcon}><Check size={30} color="#fff"/></div>
            <h3 style={{fontSize:20,fontWeight:800,margin:"16px 0 8px"}}>{t.done}</h3>
            {result.confirmRequired ? (
              <p style={{fontSize:14,color:"#71717a",lineHeight:1.6}}>
                {t.pendingMsg(result.businessName)}
              </p>
            ) : (
              <p style={{fontSize:14,color:"#71717a",lineHeight:1.6}}>
                {t.confirmedMsg(
                  result.businessName,
                  formatDate(state.date, t.months),
                  state.slot != null ? minToTime(state.slot) : ""
                )}
              </p>
            )}
            {calEvent && (
              <div style={S.calRow}>
                <div style={S.calLabel}><CalendarPlus size={13}/> {t.addToCalendar}</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  <a href={googleCalendarUrl(calEvent)} target="_blank" rel="noopener noreferrer" style={S.calBtn}>
                    {t.calGoogle}
                  </a>
                  <a href={icsDataUri(calEvent)} download="rezerwo.ics" style={S.calBtn}>
                    {t.calIcs}
                  </a>
                </div>
              </div>
            )}
            <button style={{...S.primary,marginTop:20}} onClick={onClose}>{t.backToProfile}</button>
            {result.manageToken && (
              <a href={`/wizyta/${result.manageToken}`} style={{display:"block",marginTop:12,fontSize:13,color:ACC,fontWeight:600}}>
                {t.mv_rescheduleBtn} · {t.mv_cancelBtn}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== SERVICE REQUEST MODAL ========== */
function ServiceRequestModal({ biz, onClose }: { biz: PublicBusiness; onClose: ()=>void }) {
  const { t } = useTranslation();
  const a11yRef = useModalA11y(onClose);
  const [phone, setPhone] = useState(() => loadClient().phone);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!phone.trim()||!text.trim()) { setErr(t.phoneField.replace(" *","") + " / " + t.whatLooking.replace(" *","")); return; }
    if (!isPhone(phone)) { setErr(t.errPhoneFormat); return; }
    setErr("");
    try {
      await api.serviceRequest(biz.slug, { client_phone: phone.trim(), text: text.trim() });
      saveClient({ phone: phone.trim() });
      setSent(true);
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div ref={a11yRef} role="dialog" aria-modal="true" tabIndex={-1}
        style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.wizHead}>
          <div style={{flex:1,fontWeight:800,fontSize:16}}>{t.askTitle}</div>
          <button style={S.closeBtn} onClick={onClose} aria-label={t.close}><X size={18}/></button>
        </div>
        {sent ? (
          <div style={{textAlign:"center" as const,padding:"20px 0"}}>
            <div style={S.successIcon}><Check size={28} color="#fff"/></div>
            <p style={{marginTop:14,fontSize:15,color:"#71717a"}}>{t.askSuccess}</p>
            <button style={{...S.primary,marginTop:16}} onClick={onClose}>{t.close}</button>
          </div>
        ) : (
          <>
            <p style={{fontSize:13.5,color:"#71717a",margin:"0 0 14px"}}>{t.askSub}</p>
            <label style={S.lbl}>{t.phoneField}</label>
            <input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+48 500 600 700" type="tel" inputMode="tel" autoComplete="tel" autoFocus/>
            <label style={S.lbl}>{t.whatLooking}</label>
            <textarea style={{...S.input,minHeight:80,resize:"vertical" as const,fontFamily:font}}
              value={text} onChange={e=>setText(e.target.value)} placeholder={t.askPlaceholder}/>
            {err && <div style={S.err}>{err}</div>}
            <button style={S.primary} onClick={send}>{t.sendAsk}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== REVIEWS SECTION ========== */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{display:"inline-flex",gap:1}}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{fontSize:size,color:i<=rating?"#f59e0b":"#e5e7eb"}}>★</span>
      ))}
    </span>
  );
}

function ReviewsSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<number|null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent"|"rating_desc"|"rating_asc">("recent");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(() => loadClient().name);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    api.reviews(slug, sort)
      .then(d => { setReviews(d.reviews); setAvg(d.avg); setTotal(d.total); })
      .catch(()=>{})
      .finally(() => setLoading(false));
  }, [slug, sort]);

  const submit = async () => {
    if (!name.trim()) { setErr(t.reviewErrName); return; }
    setErr("");
    try {
      await api.addReview(slug, { client_name: name.trim(), rating, text: text.trim() });
      setSent(true);
      api.reviews(slug, sort).then(d => { setReviews(d.reviews); setAvg(d.avg); setTotal(d.total); }).catch(()=>{});
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,gap:8,flexWrap:"wrap" as const}}>
        <div style={S.sectionTitle}>{t.reviews}</div>
        {avg !== null && (
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Stars rating={Math.round(avg)} size={15}/>
            <span style={{fontWeight:700,fontSize:14}}>{avg.toFixed(1)}</span>
            <span style={{fontSize:12,color:"#a8a2b0"}}>({total})</span>
          </div>
        )}
      </div>

      {total > 1 && (
        <select value={sort} onChange={e=>setSort(e.target.value as typeof sort)} style={S.reviewSort}>
          <option value="recent">{t.sortNewest}</option>
          <option value="rating_desc">{t.reviewSortHigh}</option>
          <option value="rating_asc">{t.reviewSortLow}</option>
        </select>
      )}

      {loading && (
        <div style={{display:"flex",flexDirection:"column" as const,gap:10,marginBottom:14}}>
          {[1,2].map(i => (
            <div key={i} style={{background:"#fff",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px #1b142008"}}>
              <div className="skeleton-line" style={{height:13,width:"38%",marginBottom:8}}/>
              <div className="skeleton-line" style={{height:11,width:"85%"}}/>
            </div>
          ))}
        </div>
      )}

      {!loading && !reviews.length && <div style={S.empty}>{t.noReviews}</div>}

      <div style={{display:"flex",flexDirection:"column" as const,gap:10,marginBottom:14}}>
        {reviews.map(r => (
          <div key={r.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px #1b142008"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,gap:8}}>
              <span style={{fontWeight:700,fontSize:14}}>
                {r.clientName}
                {r.verified && <span style={S.verifiedTag}><Check size={10}/> {t.reviewVerified}</span>}
              </span>
              <Stars rating={r.rating}/>
            </div>
            {r.text && <p style={{fontSize:13.5,color:"#52525b",margin:0,lineHeight:1.5}}>{r.text}</p>}
            <div style={{fontSize:11.5,color:"#c4bdd0",marginTop:6}}>{String(r.createdAt).slice(0,10).split("-").reverse().join(".")}</div>
            {r.ownerReply && (
              <div style={S.ownerReply}>
                <div style={{fontSize:11,fontWeight:700,color:ACC,marginBottom:2}}>{t.ownerReplyLabel}</div>
                <p style={{fontSize:13,color:"#52525b",margin:0,lineHeight:1.5}}>{r.ownerReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!sent && !showForm && (
        <button style={S.ctaSecondary} onClick={()=>setShowForm(true)}>
          {t.addReview}
        </button>
      )}

      {showForm && !sent && (
        <div style={{background:"#fff",borderRadius:16,padding:"16px",boxShadow:"0 2px 12px #1b142010"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>{t.yourReview}</div>
          <label style={S.lbl} id="rv-rating-lbl">{t.rating}</label>
          <div style={{display:"flex",gap:6,marginBottom:12}} role="radiogroup" aria-labelledby="rv-rating-lbl">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={()=>setRating(i)} aria-label={`${i} / 5`} aria-pressed={i<=rating}
                style={{fontSize:24,background:"none",border:"none",cursor:"pointer",
                  color:i<=rating?"#f59e0b":"#e5e7eb",padding:"0 2px"}}>★</button>
            ))}
          </div>
          <label style={S.lbl} htmlFor="rv-name">{t.firstName}</label>
          <input id="rv-name" style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder={t.nameShortPh} autoComplete="name"/>
          <label style={S.lbl} htmlFor="rv-text">{t.comment}</label>
          <textarea id="rv-text" style={{...S.input,minHeight:64,resize:"vertical" as const,fontFamily:font}}
            value={text} onChange={e=>setText(e.target.value)} placeholder={t.commentPlaceholder}/>
          {err && <div style={S.err}>{err}</div>}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button style={{...S.primary,flex:1}} onClick={submit}>{t.sendReview}</button>
            <button style={{padding:"14px 18px",borderRadius:13,border:"1.5px solid #ece8f0",background:"#fff",cursor:"pointer",fontFamily:font,fontWeight:600,color:"#52525b"}} onClick={()=>setShowForm(false)}>{t.cancel}</button>
          </div>
        </div>
      )}

      {sent && <div style={{textAlign:"center" as const,color:"#7c3aed",fontWeight:700,padding:"12px 0"}}>
        {t.thankReview}
      </div>}
    </div>
  );
}

/* ========== WAITLIST MODAL ========== */
function WaitlistModal({ biz, service, onClose }: { biz: PublicBusiness; service?: PublicService; onClose: ()=>void }) {
  const { t } = useTranslation();
  const a11yRef = useModalA11y(onClose);
  const remembered = useMemo(() => loadClient(), []);
  const [name, setName] = useState(remembered.name);
  const [phone, setPhone] = useState(remembered.phone);
  const [email, setEmail] = useState(remembered.email);
  const [date, setDate] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!name.trim() || !phone.trim()) { setErr(t.waitlistErrRequired); return; }
    if (!isPhone(phone)) { setErr(t.errPhoneFormat); return; }
    if (email.trim() && !isEmail(email)) { setErr(t.errEmailFormat); return; }
    setErr("");
    try {
      await api.joinWaitlist(biz.slug, {
        service_id: service?.id,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        preferred_date: date || undefined,
      });
      saveClient({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      setSent(true);
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div ref={a11yRef} role="dialog" aria-modal="true" tabIndex={-1}
        style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.wizHead}>
          <div style={{flex:1,fontWeight:800,fontSize:16}}>{t.waitlistTitle}</div>
          <button style={S.closeBtn} onClick={onClose} aria-label={t.close}><X size={18}/></button>
        </div>
        {sent ? (
          <div style={{textAlign:"center" as const,padding:"20px 0"}}>
            <div style={S.successIcon}><Check size={28} color="#fff"/></div>
            <p style={{marginTop:14,fontSize:15,color:"#71717a",lineHeight:1.6}}>{t.waitlistSuccess}</p>
            <button style={{...S.primary,marginTop:16}} onClick={onClose}>{t.close}</button>
          </div>
        ) : (
          <>
            <p style={{fontSize:13.5,color:"#71717a",margin:"0 0 14px"}}>{t.waitlistSub(service?.name)}</p>
            <label style={S.lbl}>{t.fullName}</label>
            <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="name" autoFocus/>
            <label style={S.lbl}>{t.phone}</label>
            <input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+48 500 600 700" type="tel" inputMode="tel" autoComplete="tel"/>
            <label style={S.lbl}>{t.email}</label>
            <input style={S.input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="jan@example.com" type="email" inputMode="email" autoComplete="email"/>
            <label style={S.lbl}>{t.preferredDate}</label>
            <input style={S.input} value={date} onChange={e=>setDate(e.target.value)} type="date"/>
            {err && <div style={S.err}>{err}</div>}
            <button style={S.primary} onClick={send}>{t.notifyBtn}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== PHOTO LIGHTBOX ========== */
function PhotoLightbox({ photos, index, onClose }: { photos: string[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const prev = () => setI(x => (x - 1 + photos.length) % photos.length);
  const next = () => setI(x => (x + 1) % photos.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, []);
  return (
    <div style={S.lbOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <button style={{...S.lbBtn, top:14, right:14}} onClick={onClose} aria-label="Close"><X size={22}/></button>
      {photos.length > 1 && (
        <>
          <button style={{...S.lbBtn, left:10, top:"50%", transform:"translateY(-50%)"}} onClick={e=>{e.stopPropagation();prev();}} aria-label="Previous"><ChevronLeft size={26}/></button>
          <button style={{...S.lbBtn, right:10, top:"50%", transform:"translateY(-50%)"}} onClick={e=>{e.stopPropagation();next();}} aria-label="Next"><ChevronLeft size={26} style={{transform:"rotate(180deg)"}}/></button>
        </>
      )}
      <img src={photos[i]} alt="" style={S.lbImg} onClick={e=>e.stopPropagation()}/>
      {photos.length > 1 && <div style={S.lbCount}>{i + 1} / {photos.length}</div>}
    </div>
  );
}

/* ========== LOADING SKELETON ========== */
function BizSkeleton() {
  return (
    <div style={S.page}>
      <div className="skeleton-line" style={{height:220,borderRadius:0}}/>
      <div style={S.content}>
        <div className="skeleton-line" style={{height:28,width:"55%",marginBottom:12}}/>
        <div className="skeleton-line" style={{height:14,width:"38%",marginBottom:22}}/>
        <div style={{display:"flex",gap:8,marginBottom:22}}>
          {[90,120,70].map((w,i)=><div key={i} className="skeleton-line" style={{height:32,width:w,borderRadius:999}}/>)}
        </div>
        <div className="skeleton-line" style={{height:16,width:"30%",marginBottom:12}}/>
        <div className="skeleton-line" style={{height:120,borderRadius:22,marginBottom:16}}/>
        <div className="skeleton-line" style={{height:120,borderRadius:22}}/>
      </div>
    </div>
  );
}

/* ========== BUSINESS PAGE ========== */
export default function BusinessPage({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [biz, setBiz] = useState<PublicBusiness|null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [booking, setBooking] = useState<PublicService|null|"open">(null);
  const [serviceReq, setServiceReq] = useState(false);
  const [waitlist, setWaitlist] = useState<PublicService|null|"open">(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number|null>(null);
  const [masters, setMasters] = useState<PublicMaster[]>([]);

  useEffect(() => {
    api.publicBusiness(slug)
      .then(d=>{
        setBiz(d); setLoading(false);
        document.title = `${d.name} — Rezerwo`;
        pushRecent({ slug: d.slug, name: d.name, city: d.city });
      })
      .catch(()=>{ setNotFound(true); setLoading(false); });
    api.publicMasters(slug).then(setMasters).catch(() => {});
  }, [slug]);

  if (loading) return <BizSkeleton/>;
  if (notFound || !biz) return (
    <div style={S.center}>
      <div style={{textAlign:"center" as const}}>
        <div style={{fontSize:40,marginBottom:12}}>🔍</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>{t.notFound}</div>
        <button className="btn-primary" style={S.backBtn2} onClick={()=>navigate("/")}>{t.backToSearch}</button>
      </div>
    </div>
  );

  const services = biz.services||[];
  const groups: Record<string,PublicService[]> = {};
  services.forEach(s=>{ (groups[s.grp||t.services]||=[]).push(s); });

  const workingDays = DAY_ORDER.filter(d=>biz.hours?.[d]);
  const DAY_PL = t.days;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: biz.name, url }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); showToast(t.linkCopied); } catch { /* ignore */ }
  };

  return (
    <div style={S.page}>
      {/* back nav */}
      <div style={S.navBar}>
        <button style={S.navBack} onClick={()=>navigate("/")}>
          <ArrowLeft size={16}/> {t.back}
        </button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button style={S.shareBtn} onClick={handleShare} aria-label={t.share} title={t.share}>
            <Share2 size={16}/>
          </button>
          <LangDropdown/>
        </div>
      </div>

      {/* banner */}
      <div className="biz-banner" style={{...S.banner,background:BANNERS[biz.banner]||BANNERS.violet}}>
        {biz.photos && biz.photos.length>0 && (
          <img src={biz.photos[photoIdx]} alt="" style={{...S.bannerPhoto,cursor:"zoom-in"}}
            onClick={()=>setLightbox(photoIdx)}
            onError={e=>(e.currentTarget.style.display="none")}/>
        )}
        {biz.photos && biz.photos.length>1 && (
          <div style={S.photoDots}>
            {biz.photos.map((_,i)=>(
              <button key={i} aria-label={`${t.portfolio} ${i+1}`} style={{...S.photoDot,...(i===photoIdx?S.photoDotOn:{})}} onClick={()=>setPhotoIdx(i)}/>
            ))}
          </div>
        )}
      </div>

      <div style={S.content}>
        {/* business header */}
        {(() => {
          const openStatus = biz.hours && Object.keys(biz.hours).length > 0 ? getOpenStatus(biz.hours) : null;
          return (
            <div style={S.bizHead}>
              <div style={{flex:1}}>
                <div style={S.bizName}>
                  {biz.name}
                  {biz.verified && <span style={S.verBadge}><BadgeCheck size={16}/></span>}
                  {biz.profileType === "master" && (
                    <span style={{ display:"inline-flex", alignItems:"center", fontSize:11, fontWeight:700,
                      padding:"3px 9px", borderRadius:999, background:"#f5f0fe", color:"#7c3aed",
                      marginLeft:8, verticalAlign:"middle", letterSpacing:".02em" }}>
                      {t.p_badgeSpecjalista}
                    </span>
                  )}
                  {openStatus && (
                    <span style={{
                      display:"inline-flex", alignItems:"center", gap:4,
                      fontSize:11.5, fontWeight:700, padding:"3px 9px", borderRadius:999,
                      background: openStatus.open ? "#dcfce7" : "#f3f4f6",
                      color: openStatus.open ? "#16a34a" : "#6b7280",
                      marginLeft:8, verticalAlign:"middle",
                    }}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:openStatus.open?"#16a34a":"#9ca3af",display:"inline-block"}}/>
                      {openStatus.open
                        ? (openStatus.closesAt ? t.closingSoon(openStatus.closesAt) : t.p_openNow)
                        : openStatus.nextOpenTime ? t.p_openFrom(openStatus.nextOpenTime) : t.p_closedNow}
                    </span>
                  )}
                </div>
                <div style={S.bizMeta}>
                  {(biz.categories && biz.categories.length > 0 ? biz.categories : [biz.category].filter(Boolean)).map((cid, i) => (
                    <span key={cid} style={i === 0 ? S.catPrimary : S.catExtra}>
                      {i === 0 && <CategoryIcon id={cid} size={13} color="#8b8194"/>}
                      {" "}{t.catLabels[cid] ?? cid}
                    </span>
                  ))}
                  {biz.city && <><span style={{color:"#d1c8d8"}}>·</span>{biz.city}{biz.district && `, ${biz.district}`}</>}
                </div>
                {/* service languages */}
                {biz.languages && biz.languages.length > 0 && (
                  <div style={{display:"flex",gap:4,flexWrap:"wrap" as const,marginTop:6}}>
                    {biz.languages.map(l => {
                      const ldef = [{key:"pl",label:"🇵🇱 PL"},{key:"en",label:"🇬🇧 EN"},{key:"ua",label:"🇺🇦 UA"},{key:"ru",label:"🇷🇺 RU"}].find(x=>x.key===l);
                      return ldef ? <span key={l} style={{fontSize:11,fontWeight:600,color:"#52525b",background:"#f3f4f6",borderRadius:6,padding:"2px 7px"}}>{ldef.label}</span> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* anchor nav */}
        {(() => {
          const links: [string, string][] = [
            [t.services, "biz-services"],
            ...(masters.filter(m=>m.isActive).length ? [[t.specialists, "biz-specialists"] as [string,string]] : []),
            ...((biz.photos?.length ?? 0) ? [[t.portfolio, "biz-portfolio"] as [string,string]] : []),
            [t.reviews, "biz-reviews"],
            [t.contactNav, "biz-contact"],
          ];
          return (
            <div style={S.anchorNav}>
              {links.map(([label, id]) => (
                <button key={id} style={S.anchorLink}
                  onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  {label}
                </button>
              ))}
            </div>
          );
        })()}

        {/* about */}
        {biz.about && <p style={S.about}>{biz.about}</p>}

        {/* contact info — existing + extended */}
        <div id="biz-contact" style={S.infoRow}>
          {biz.address && (
            <div style={S.infoChip}><MapPin size={13}/> {biz.address}</div>
          )}
          {biz.phone && (
            <a href={`tel:${biz.phone}`} style={{...S.infoChip,textDecoration:"none"}}>
              <Phone size={13}/> {biz.phone}
            </a>
          )}
          {biz.instagram && (
            <a href={`https://instagram.com/${biz.instagram.replace(/^@/,"")}`} target="_blank" rel="noopener noreferrer" style={{...S.infoChip,textDecoration:"none"}}>
              <Instagram size={13}/> {biz.instagram}
            </a>
          )}
          {/* extended contacts from JSONB */}
          {biz.contacts && ([
            { key:"email",      icon:<Mail size={13}/>,       label: biz.contacts.email },
            { key:"telegram",   icon:<Send size={13}/>,       label: "Telegram" },
            { key:"whatsapp",   icon:<Phone size={13}/>,      label: "WhatsApp" },
            { key:"facebook",   icon:<Globe size={13}/>,      label: "Facebook" },
            { key:"tiktok",     icon:<Music size={13}/>,      label: "TikTok" },
            { key:"website",    icon:<Link size={13}/>,       label: biz.contacts.website?.replace(/^https?:\/\//,"").split("/")[0] },
            { key:"googleMaps", icon:<Navigation size={13}/>, label: t.p_contactMap },
          ] as const).map(({ key, icon, label }) => {
            const val = biz.contacts![key as keyof typeof biz.contacts];
            if (!val) return null;
            const href = normContact(key, val);
            return (
              <a key={key} href={href} target={key === "email" ? undefined : "_blank"} rel="noopener noreferrer"
                style={{...S.infoChip, textDecoration:"none"}}>
                {icon} {label || val}
              </a>
            );
          })}
        </div>

        {/* amenities */}
        {biz.amenities && biz.amenities.length > 0 && (() => {
          const ADEF: Record<string,string> = {
            parking: "🅿️ " + t.p_amenParking,
            card:    "💳 " + t.p_amenCard,
            disabled:"♿ " + t.p_amenDisabled,
            waiting: "🛋️ " + t.p_amenWaiting,
            ac:      "❄️ " + t.p_amenAC,
            wifi:    "📶 " + t.p_amenWifi,
            blik:    "📱 " + t.p_amenBlik,
          };
          return (
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,marginBottom:16}}>
              {biz.amenities.map(a => ADEF[a] ? (
                <span key={a} style={{fontSize:12,fontWeight:500,color:"#52525b",background:"#f3f4f6",borderRadius:8,padding:"4px 10px"}}>
                  {ADEF[a]}
                </span>
              ) : null)}
            </div>
          );
        })()}

        {/* portfolio gallery */}
        {biz.photos && biz.photos.length > 0 && (
          <div id="biz-portfolio" style={{marginBottom:22}}>
            <div style={S.sectionTitle}>{t.portfolio}</div>
            <div style={S.galleryGrid}>
              {biz.photos.map((p,i)=>(
                <button key={i} style={S.galleryThumb} onClick={()=>setLightbox(i)} aria-label={`${t.portfolio} ${i+1}`}>
                  <img src={p} alt="" loading="lazy" style={S.galleryImg}
                    onError={e=>{ (e.currentTarget.parentElement as HTMLElement).style.display="none"; }}/>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* working hours — all 7 days, closed days shown explicitly */}
        {workingDays.length>0 && (
          <div style={S.hoursBox}>
            <div style={S.sectionTitle}>{t.hours}</div>
            <div style={S.hoursGrid}>
              {DAY_ORDER.map(d=>{
                const h = biz.hours?.[d] as [string,string] | undefined;
                return (
                  <div key={d} style={S.hoursRow}>
                    <span style={{fontWeight:600,minWidth:28}}>{DAY_PL[d as keyof typeof DAY_PL]}</span>
                    <span style={{color: h ? "#52525b" : "#a8a2b0"}}>{h ? `${h[0]} — ${h[1]}` : t.dayOff}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* services */}
        <div id="biz-services" style={S.sectionTitle}>{t.services}</div>
        {!services.length && (
          <div style={S.empty}>{t.noServices}</div>
        )}
        {Object.entries(groups).map(([grp,items])=>(
          <div key={grp} style={{marginBottom:16}}>
            {grp && Object.keys(groups).length>1 && <div style={S.grpLabel}>{grp}</div>}
            <div style={S.svcCard}>
              {items.map(s=>(
                <div key={s.id} style={S.svcRow}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14.5,fontWeight:700}}>{s.name}</div>
                    {s.description && <div style={{fontSize:13,color:"#71717a",marginTop:3,lineHeight:1.4}}>{s.description}</div>}
                    <div style={{fontSize:12,color:"#a8a2b0",marginTop:4,display:"flex",gap:10}}>
                      <span><Clock size={11}/> {fmtDur(s.duration, t.p_svcDurationHours, t.p_svcDurationMins)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column" as const,alignItems:"flex-end",gap:6}}>
                    <span style={{fontSize:15,fontWeight:800,color:ACC}}>{fmtPrice(s.price, t.p_priceOnSite)}</span>
                    <button style={S.bookBtn} onClick={()=>setBooking(s)}>{t.book}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* specialists */}
        {masters.filter(m=>m.isActive).length > 0 && (
          <div id="biz-specialists" style={{marginTop:8,marginBottom:8}}>
            <div style={S.sectionTitle}>{t.specialists}</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
              {masters.filter(m=>m.isActive).map(m=>(
                <div key={m.id} style={S.masterRow}>
                  <div style={S.masterRowAvatar}>
                    {m.photo
                      ? <img src={m.photo} alt="" style={S.masterAvatarImg} onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none";}}/>
                      : <span style={S.masterInitialsStyle}>{masterInitials(m.name)}</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700}}>{m.name}</div>
                    {m.bio && <div style={{fontSize:12.5,color:"#71717a",marginTop:2,lineHeight:1.45}}>{m.bio}</div>}
                  </div>
                  <button style={S.bookBtn} onClick={()=>setBooking("open")}>{t.bookWith}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA + service request + waitlist */}
        <div style={S.ctaBox}>
          <button className="btn-primary" style={S.ctaMain} onClick={()=>setBooking("open")}>
            {t.bookVisit}
          </button>
          <button style={S.ctaSecondary} onClick={()=>setWaitlist("open")}>
            🔔 {t.noSlot}
          </button>
          <button style={S.ctaSecondary} onClick={()=>setServiceReq(true)}>
            <MessageSquarePlus size={15}/> {t.askService}
          </button>
        </div>

        {/* reviews */}
        <div id="biz-reviews"><ReviewsSection slug={slug}/></div>
      </div>

      {/* modals */}
      {lightbox!==null && biz.photos && (
        <PhotoLightbox photos={biz.photos} index={lightbox} onClose={()=>setLightbox(null)}/>
      )}
      {booking!==null && (
        <BookingWizard
          biz={biz}
          initService={typeof booking==="object"?booking:null}
          onClose={()=>setBooking(null)}
        />
      )}
      {serviceReq && <ServiceRequestModal biz={biz} onClose={()=>setServiceReq(false)}/>}
      {waitlist!==null && (
        <WaitlistModal
          biz={biz}
          service={typeof waitlist==="object"&&waitlist!==null?waitlist:undefined}
          onClose={()=>setWaitlist(null)}
        />
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page:   { minHeight:"100vh", background:MESH, fontFamily:font },
  center: { minHeight:"100vh", display:"grid", placeItems:"center", fontFamily:font, background:MESH },

  navBar:  { position:"sticky" as const, top:0, background:"rgba(251,247,244,.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", zIndex:20, padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(239,233,238,.6)" },
  navBack: { display:"flex", alignItems:"center", gap:6, border:"none", background:"transparent", color:ACC, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:font },
  backBtn2:{ padding:"11px 22px", borderRadius:999, border:"none", background:GRAD, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", marginTop:8, fontFamily:font, boxShadow:"0 4px 16px rgba(124,58,237,.35)" },

  banner:     { height:220, position:"relative" as const, overflow:"hidden" },
  bannerPhoto:{ position:"absolute" as const, inset:0, width:"100%", height:"100%", objectFit:"cover" as const, opacity:0.88 },
  photoDots:  { position:"absolute" as const, bottom:12, left:0, right:0, display:"flex", justifyContent:"center", gap:6 },
  photoDot:   { width:7, height:7, borderRadius:999, border:"none", background:"rgba(255,255,255,.5)", cursor:"pointer", padding:0, transition:"background .2s" },
  photoDotOn: { background:"#fff", width:20 },

  content: { maxWidth:660, margin:"0 auto", padding:"22px 18px 80px" },

  bizHead: { marginBottom:14 },
  bizName: { fontSize:26, fontWeight:500, fontFamily:"'Fraunces',Georgia,serif", letterSpacing:"-0.03em", display:"flex", alignItems:"center", gap:10, color:"#1a1320", lineHeight:1.2 },
  bizMeta:   { fontSize:13.5, color:"#8b8194", marginTop:6, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" as const },
  catPrimary:{ display:"flex", alignItems:"center", gap:4 },
  catExtra:  { fontSize:11, padding:"2px 8px", borderRadius:999, background:"#f3eefe", color:"#7c3aed", fontWeight:600 },
  verBadge:  { color:ACC, display:"flex" },
  about:   { fontSize:14.5, color:"#52525b", lineHeight:1.75, margin:"12px 0 18px" },

  infoRow: { display:"flex", flexWrap:"wrap" as const, gap:8, marginBottom:20 },
  infoChip:{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1.5px solid #efe9ee", borderRadius:999, padding:"7px 14px", fontSize:13, fontWeight:500, color:"#52525b", textDecoration:"none" },

  hoursBox: { background:"#fff", borderRadius:20, padding:"16px 18px", marginBottom:22, boxShadow:"0 2px 8px rgba(26,19,32,.05)", border:"1px solid #efe9ee" },
  hoursGrid:{ display:"flex", flexDirection:"column" as const, gap:7, marginTop:10 },
  hoursRow: { display:"flex", gap:14, fontSize:13, color:"#52525b" },

  anchorNav:  { display:"flex", gap:6, overflowX:"auto" as const, position:"sticky" as const, top:52, zIndex:15, background:"rgba(251,247,244,.92)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", margin:"0 -18px 16px", padding:"8px 18px", borderBottom:"1px solid rgba(239,233,238,.6)" },
  anchorLink: { flexShrink:0, border:"none", background:"transparent", color:"#52525b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px 8px", borderRadius:8 },

  galleryGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(96px,1fr))", gap:8, marginTop:10 },
  galleryThumb:{ aspectRatio:"1 / 1", borderRadius:12, overflow:"hidden", border:"none", padding:0, cursor:"zoom-in", background:"#efe9ee" },
  galleryImg:  { width:"100%", height:"100%", objectFit:"cover" as const, display:"block" },

  masterRow:       { display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:16, padding:"12px 14px", border:"1px solid #efe9ee", boxShadow:"0 2px 8px rgba(26,19,32,.04)" },
  masterRowAvatar: { width:46, height:46, borderRadius:999, background:"#efe9ee", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" as const },

  lbOverlay: { position:"fixed" as const, inset:0, background:"rgba(10,7,14,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:80, padding:20 },
  lbImg:     { maxWidth:"94vw", maxHeight:"88vh", objectFit:"contain" as const, borderRadius:8 },
  lbBtn:     { position:"absolute" as const, width:42, height:42, borderRadius:999, border:"none", background:"rgba(255,255,255,.14)", color:"#fff", display:"grid", placeItems:"center", cursor:"pointer" },
  lbCount:   { position:"absolute" as const, bottom:20, left:0, right:0, textAlign:"center" as const, color:"#fff", fontSize:13, fontWeight:600 },

  sectionTitle:{ fontSize:11, fontWeight:700, color:ACC, textTransform:"uppercase" as const, letterSpacing:1, marginBottom:12 },
  grpLabel:    { fontSize:11, fontWeight:700, color:"#8b8194", textTransform:"uppercase" as const, letterSpacing:0.8, marginBottom:8 },
  svcCard:     { background:"#fff", borderRadius:22, overflow:"hidden", boxShadow:"0 2px 8px rgba(26,19,32,.05)", border:"1px solid #efe9ee" },
  svcRow:      { display:"flex", alignItems:"flex-start", gap:12, padding:"14px 18px", borderBottom:"1px solid #efe9ee" },
  bookBtn:     { padding:"7px 16px", borderRadius:999, border:"none", background:GRAD, color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:font, whiteSpace:"nowrap" as const, boxShadow:"0 2px 10px rgba(124,58,237,.30)" },
  empty:       { textAlign:"center" as const, color:"#8b8194", fontSize:14, padding:"32px 0" },

  ctaBox:      { marginTop:26, display:"flex", flexDirection:"column" as const, gap:10 },
  ctaMain:     { padding:"15px", borderRadius:999, border:"none", background:GRAD, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:font, boxShadow:"0 6px 24px rgba(124,58,237,.38)" },
  ctaSecondary:{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 20px", borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", color:"#52525b", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:font, transition:"box-shadow .2s,transform .2s" },

  overlay:  { position:"fixed" as const, inset:0, background:"rgba(26,19,32,.55)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto" as const, padding:"20px 16px", zIndex:60 },
  wizard:   { background:"#fff", borderRadius:24, width:"100%", maxWidth:460, padding:"20px 22px 26px", boxShadow:"0 24px 80px rgba(0,0,0,.25)", flexShrink:0 as const, margin:"auto 0" },
  wizHead:  { display:"flex", alignItems:"center", gap:10, marginBottom:14 },
  backBtn:  { width:34, height:34, borderRadius:10, border:"none", background:"#f4f0f8", color:"#52525b", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 },
  closeBtn: { width:34, height:34, borderRadius:10, border:"none", background:"#f4f0f8", color:"#52525b", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 },
  progress: { height:3, background:"#efe9ee", borderRadius:2, marginBottom:18, overflow:"hidden" },
  progressFill:{ height:"100%", background:GRAD, borderRadius:2, transition:"width .3s" },
  stepTitle:{ fontSize:17, fontWeight:700, margin:"0 0 14px", letterSpacing:"-0.02em", fontFamily:"'Fraunces',Georgia,serif" },

  svcList:    { display:"flex", flexDirection:"column" as const, gap:8 },
  svcOption:  { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", width:"100%", fontFamily:font, textAlign:"left" as const, transition:"border-color .15s,background .15s" },

  masterCard:          { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", width:"100%", fontFamily:font, textAlign:"left" as const, transition:"border-color .15s,background .15s", marginBottom:8 },
  masterAvatar:        { width:44, height:44, borderRadius:999, background:"#efe9ee", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" as const },
  masterAvatarAny:     { width:44, height:44, borderRadius:999, background:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18, color:"#fff" },
  masterAvatarImg:     { width:"100%", height:"100%", objectFit:"cover" as const, position:"absolute" as const, inset:0 },
  masterInitialsStyle: { fontSize:16, fontWeight:700, color:"#7c3aed" },
  svcSummary: { background:"#f4f0f8", borderRadius:12, padding:"9px 14px", fontSize:13, marginBottom:14, color:"#1a1320" },
  summaryCard:  { background:"#f4f0f8", borderRadius:14, padding:"12px 16px", marginBottom:12 },
  summaryRow:   { display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, fontSize:13.5, fontWeight:600, marginBottom:3 },
  summaryV:     { color:"#1a1320" },
  confirmNotice:{ background:"#fff7ed", color:"#9a3412", fontSize:12.5, lineHeight:1.5, padding:"10px 14px", borderRadius:12, marginBottom:6 },

  earliestBtn:  { display:"block", width:"100%", padding:"10px 14px", borderRadius:12, border:"1.5px solid #efe9ee", background:"#fff", color:ACC, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font, marginBottom:10, textAlign:"left" as const },

  datePicker: { display:"flex", gap:8, overflowX:"auto" as const, paddingBottom:8, marginBottom:4 },
  dateChip:   { display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3, padding:"10px 12px", borderRadius:14, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", minWidth:56, fontFamily:font, position:"relative" as const },
  dateChipOn: { background:ACC, color:"#fff", borderColor:ACC },
  dateChipFull:{ opacity:0.45 },
  dateChipFullLbl:{ fontSize:8.5, fontWeight:700, color:"#dc2626", textTransform:"uppercase" as const, letterSpacing:0.3 },

  slotBucketLbl:{ fontSize:11, fontWeight:700, color:"#8b8194", textTransform:"uppercase" as const, letterSpacing:0.6, margin:"4px 0 6px" },
  slotGrid:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 },
  slotBtn:    { padding:"11px 0", borderRadius:12, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:font, color:"#1a1320" },
  slotBtnOn:  { background:ACC, color:"#fff", borderColor:ACC },
  textBtn:    { display:"flex", alignItems:"center", gap:4, border:"none", background:"transparent", color:ACC, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px 0" },

  lbl:    { fontSize:12.5, fontWeight:600, color:"#52525b", display:"block", margin:"12px 0 6px" },
  input:  { width:"100%", padding:"12px 14px", borderRadius:14, border:"1.5px solid #efe9ee", fontSize:16, outline:"none", background:"#fbf7f4", marginBottom:4, boxSizing:"border-box" as const, fontFamily:font, color:"#1a1320" },
  err:    { background:"#fef2f2", color:"#dc2626", fontSize:13, padding:"10px 12px", borderRadius:10, marginBottom:8, textAlign:"center" as const },
  hint:   { fontSize:12, color:"#8b8194", textAlign:"center" as const, marginTop:8 },
  nudge:  { fontSize:12, color:"#8b8194", margin:"2px 0 0", lineHeight:1.5 },
  reviewSort:  { border:"1.5px solid #efe9ee", borderRadius:10, padding:"6px 10px", fontSize:12.5, fontWeight:600, color:"#52525b", background:"#fff", cursor:"pointer", fontFamily:font, marginBottom:12 },
  verifiedTag: { display:"inline-flex", alignItems:"center", gap:3, fontSize:10, fontWeight:700, color:"#16a34a", background:"#dcfce7", borderRadius:999, padding:"2px 7px", marginLeft:6, verticalAlign:"middle" },
  ownerReply:  { marginTop:8, padding:"8px 12px", background:"#faf7ff", borderRadius:10, borderLeft:`3px solid ${ACC}` },
  primary:{ width:"100%", marginTop:12, display:"flex", justifyContent:"center", alignItems:"center", gap:8, background:GRAD, color:"#fff", border:"none", borderRadius:999, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:font, boxShadow:"0 6px 20px rgba(124,58,237,.35)" },

  successIcon:{ width:60, height:60, borderRadius:999, background:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", boxShadow:"0 4px 20px rgba(124,58,237,.40)" },
  calRow:   { marginTop:18, padding:"14px 0 4px", borderTop:"1px solid #efe9ee" },
  calLabel: { display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, fontWeight:700, color:"#8b8194", textTransform:"uppercase" as const, letterSpacing:0.6, marginBottom:10 },
  calBtn:   { display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", color:"#52525b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font, textDecoration:"none" },
  shareBtn: { width:34, height:34, borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", color:ACC, cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 },
};
