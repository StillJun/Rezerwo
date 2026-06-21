import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Store, LogOut, Scissors, Plus, Trash2, Save, Check, Bell, Clock,
  MapPin, Phone, Instagram, Pencil, X, BadgeCheck, Image, Calendar,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, NotebookPen, User,
  ExternalLink, Star, BellRing, Flag, MessageSquarePlus,
} from "lucide-react";
import { api, getToken, setToken, clearToken } from "./api";
import { navigate } from "./App";
import type { Business, Service, Meta, Appointment, Review } from "./types";
import { useTranslation } from "./i18n";
import type { T } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";
import { Select } from "./components/Select";
import type { SelectOption } from "./components/Select";

const ACC = "#7c3aed";
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";
const BANNERS: Record<string, string> = {
  violet: "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  rose:   "linear-gradient(135deg,#ff9a9e,#fecfef)",
  peach:  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  ink:    "linear-gradient(135deg,#302b3a,#5b4b6e)",
  mint:   "linear-gradient(135deg,#a8edea,#fed6e3)",
  gold:   "linear-gradient(135deg,#f6d365,#fda085)",
};
const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"] as const;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:   { color: "#92400e", bg: "#fef3c7" },
  confirmed: { color: "#065f46", bg: "#d1fae5" },
  cancelled: { color: "#991b1b", bg: "#fee2e2" },
  done:      { color: "#374151", bg: "#f3f4f6" },
  no_show:   { color: "#7c2d12", bg: "#ffedd5" },
};

function statusLabels(t: T): Record<string, { label: string; color: string; bg: string }> {
  return {
    pending:   { label: t.p_statusPending,   ...STATUS_COLORS.pending },
    confirmed: { label: t.p_statusConfirmed, ...STATUS_COLORS.confirmed },
    cancelled: { label: t.p_statusCancelled, ...STATUS_COLORS.cancelled },
    done:      { label: t.p_statusDone,      ...STATUS_COLORS.done },
    no_show:   { label: t.p_statusNoShow,    ...STATUS_COLORS.no_show },
  };
}

function pwChecks(pw: string) {
  return {
    len:     pw.length >= 9,
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    digit:   /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function PasswordStrength({ pw }: { pw: string }) {
  const { t } = useTranslation();
  if (!pw) return null;
  const c = pwChecks(pw);
  const score = Object.values(c).filter(Boolean).length;
  const colors = ["#ef4444","#f97316","#eab308","#22c55e","#16a34a"];
  const color = colors[score - 1] ?? "#ef4444";
  const hints = [
    !c.len     && t.pwTooShort,
    !c.lower   && t.pwNeedLower,
    !c.upper   && t.pwNeedUpper,
    !c.digit   && t.pwNeedDigit,
    !c.special && t.pwNeedSpecial,
  ].filter(Boolean) as string[];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? color : "#f0ebf5", transition: "background .2s" }}/>
        ))}
      </div>
      {score === 5
        ? <div style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>{t.pwStrong}</div>
        : hints.length > 0 && <div style={{ fontSize: 11.5, color: "#71717a" }}>{hints[0]}</div>
      }
    </div>
  );
}

function minToTime(m: number) {
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function dateLabel(d: string, t: T): string {
  const today = todayStr();
  if (d === today) return t.p_apptToday;
  const tom = new Date(); tom.setDate(tom.getDate()+1);
  if (d === tom.toISOString().slice(0,10)) return t.p_apptTomorrow;
  return d.split("-").reverse().join(".");
}

/* ========== PANEL PAGE ========== */
export default function PanelPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false)).finally(() => setChecking(false));
  }, []);
  const logout = async () => {
    try { await api.logout(); } catch { /* */ }
    clearToken(); setAuthed(false);
  };
  if (checking) return <div style={S.center}>…</div>;
  return authed ? <Dashboard onLogout={logout} /> : <Auth onAuth={() => setAuthed(true)} />;
}

/* ========== AUTH ========== */
function Auth({ onAuth }: { onAuth: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"register"|"login">("register");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [biz, setBiz] = useState(""); const [cat, setCat] = useState("barber");
  const [meta, setMeta] = useState<Meta|null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api.meta().then(setMeta).catch(()=>{}); }, []);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const r = mode === "register"
        ? await api.register(email, pw, biz, cat)
        : await api.login(email, pw);
      setToken(r.token); onAuth();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div style={S.authWrap}>
      <button style={S.backLink} onClick={() => navigate("/")}>{t.p_authBack}</button>
      <div style={S.authCard} className="rise">
        <div style={S.logoRow}>
          <div style={S.logo}>R</div>
          <span style={{ fontSize:20, fontWeight:800 }}>Rezerwo</span>
          <span style={S.panelTag}>{t.p_panelTag}</span>
        </div>
        <h1 style={S.h1}>{mode === "register" ? t.p_authRegisterTitle : t.p_authLoginTitle}</h1>
        <p style={S.sub}>{t.p_authSub}</p>

        {mode === "register" && (
          <>
            <Field icon={<Store size={15}/>} value={biz} onChange={setBiz} placeholder={t.p_bizNamePh}/>
            <label style={S.lbl}>{t.p_fieldCategory}</label>
            <div style={S.catGrid}>
              {meta?.categories.map(c => (
                <button key={c.id} style={{...S.catBtn,...(cat===c.id?S.catBtnOn:{})}} onClick={()=>setCat(c.id)}>
                  <CategoryIcon id={c.id} size={16} color={cat===c.id?"#7c3aed":"#52525b"}/> {t.catLabels[c.id] ?? c.pl}
                </button>
              ))}
            </div>
          </>
        )}
        <Field icon={<User size={15}/>} value={email} onChange={setEmail} placeholder={t.p_emailPh} type="email"/>
        <Field icon={<User size={15}/>} value={pw} onChange={setPw} placeholder={t.p_passwordPh} type="password"/>
        {mode === "register" && <PasswordStrength pw={pw}/>}
        {err && <div style={S.err}>{err}</div>}
        <button style={S.primary} onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "register" ? t.p_authRegisterBtn : t.p_authLoginBtn}
        </button>
        <div style={S.switch}>
          {mode === "register" ? t.p_authHaveAccount : t.p_authNoAccount}{" "}
          <span style={S.link} onClick={()=>{setErr("");setMode(mode==="register"?"login":"register");}}>
            {mode === "register" ? t.p_authToLogin : t.p_authToRegister}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========== DASHBOARD ========== */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"appointments"|"services"|"profile"|"reviews"|"waitlist"|"requests">("appointments");
  const [biz, setBiz] = useState<Business|null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendDone, setResendDone] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => { api.business().then(setBiz).catch(console.error); }, []);
  useEffect(() => {
    api.me().then(r => setEmailVerified(r.user.emailVerified ?? true)).catch(() => {});
  }, []);

  const handleResend = async () => {
    setResendBusy(true);
    try { await api.resendVerification(); setResendDone(true); } catch { /* ignore */ } finally { setResendBusy(false); }
  };

  return (
    <div style={S.app} className="panel-app">
      <header style={S.top} className="panel-header">
        <div style={S.logoRow}>
          <div style={S.logo}>R</div>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>{biz?.name||"Rezerwo"}</div>
            <div style={{fontSize:11.5,color:"#a8a2b0"}}>{t.p_ownerPanel}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <LangDropdown/>
          {biz?.slug && (
            <a href={`/${biz.slug}`} target="_blank" rel="noreferrer"
               style={{...S.iconBtn, textDecoration:"none", color:"#52525b"}} title="Podgląd profilu">
              <ExternalLink size={16}/>
            </a>
          )}
          <button style={S.iconBtn} onClick={onLogout} title="Wyloguj"><LogOut size={17}/></button>
        </div>
      </header>

      {emailVerified === false && (
        <div style={{ background: "#fef3c7", borderBottom: "1px solid #fcd34d", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#92400e", flex: 1 }}>⚠️ {t.p_verifyBanner}</span>
          {resendDone ? (
            <span style={{ fontSize: 13, color: "#065f46", fontWeight: 600 }}>{t.p_verifySent}</span>
          ) : (
            <button
              style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 0 }}
              disabled={resendBusy} onClick={handleResend}
            >
              {resendBusy ? "…" : t.p_verifyResend}
            </button>
          )}
        </div>
      )}

      {biz && emailVerified !== false && <ProfileCompleteness biz={biz} onGo={() => setTab("profile")}/>}

      <div style={S.tabs} className="panel-tabs">
        <button className="panel-tab" style={{...S.tab,...(tab==="appointments"?S.tabOn:{})}} onClick={()=>setTab("appointments")}>
          <Calendar size={15}/> {t.p_tabAppointments}
        </button>
        <button className="panel-tab" style={{...S.tab,...(tab==="services"?S.tabOn:{})}} onClick={()=>setTab("services")}>
          <Scissors size={15}/> {t.p_tabServices}
        </button>
        <button className="panel-tab" style={{...S.tab,...(tab==="reviews"?S.tabOn:{})}} onClick={()=>setTab("reviews")}>
          <Star size={15}/> {t.p_tabReviews}
        </button>
        <button className="panel-tab" style={{...S.tab,...(tab==="waitlist"?S.tabOn:{})}} onClick={()=>setTab("waitlist")}>
          <BellRing size={15}/> {t.p_tabWaitlist}
        </button>
        <button className="panel-tab" style={{...S.tab,...(tab==="requests"?S.tabOn:{})}} onClick={()=>setTab("requests")}>
          <MessageSquarePlus size={15}/> {t.p_tabRequests}
        </button>
        <button className="panel-tab" style={{...S.tab,...(tab==="profile"?S.tabOn:{})}} onClick={()=>setTab("profile")}>
          <Store size={15}/> {t.p_tabProfile}
        </button>
      </div>

      <div style={S.body} className="panel-body">
        {tab==="appointments" && biz && <AppointmentsTab biz={biz}/>}
        {tab==="services"     && <ServicesTab/>}
        {tab==="reviews"      && <ReviewsTab/>}
        {tab==="waitlist"     && biz && <WaitlistTab/>}
        {tab==="requests"     && <ServiceRequestsTab/>}
        {tab==="profile"      && <ProfileTab biz={biz} setBiz={setBiz}/>}
      </div>
    </div>
  );
}

/* ========== PROFILE COMPLETENESS ========== */
function ProfileCompleteness({ biz, onGo }: { biz: Business; onGo: () => void }) {
  if (biz.status === "rejected") {
    return (
      <div style={{ background: "#fee2e2", borderBottom: "1px solid #fca5a5", padding: "10px 16px", fontSize: 13, color: "#dc2626" }}>
        ❌ Twój profil został odrzucony przez administratora. Skontaktuj się z pomocą techniczną.
      </div>
    );
  }
  if (biz.status === "pending") {
    return (
      <div style={{ background: "#fef3c7", borderBottom: "1px solid #fcd34d", padding: "10px 16px", fontSize: 13, color: "#92400e" }}>
        ⏳ Twój profil oczekuje na zatwierdzenie przez administratora — nie jest jeszcze widoczny w wyszukiwarce.
      </div>
    );
  }

  const missing: string[] = [];
  if (!biz.city)    missing.push("miasto");
  if (!biz.address) missing.push("adres");
  if (!biz.phone)   missing.push("telefon");
  if (!biz.about)   missing.push("opis");
  if (!biz.hours || !Object.keys(biz.hours).length) missing.push("godziny pracy");

  if (!missing.length) return null;

  return (
    <div style={{ background: "#ede9fe", borderBottom: "1px solid #ddd6fe", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
      <span style={{ fontSize: 13, color: "#5b21b6", flex: 1 }}>
        📋 Uzupełnij profil, aby być widocznym: <strong>{missing.join(", ")}</strong>
      </span>
      <button
        onClick={onGo}
        style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Uzupełnij →
      </button>
    </div>
  );
}

/* ========== APPOINTMENTS TAB ========== */
function AppointmentsTab({ biz }: { biz: Business }) {
  const { t } = useTranslation();
  const ST = statusLabels(t);
  const [filter, setFilter] = useState<"today"|"upcoming"|"all">("today");
  const [date, setDate] = useState(todayStr());
  const [list, setList] = useState<Appointment[]>([]);
  const [pendingList, setPendingList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<string|null>(null);

  const loadPending = useCallback(async () => {
    const data = await api.appointments({ status: "pending" });
    setPendingList(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { date?: string; status?: string } = {};
      if (filter === "today") params.date = date;
      const data = await api.appointments(params);
      if (filter === "upcoming") {
        const today = todayStr();
        setList(data.filter(a => a.date >= today && a.status !== "cancelled" && a.status !== "done" && a.status !== "no_show"));
      } else {
        setList(data);
      }
    } catch { /**/ } finally { setLoading(false); }
  }, [filter, date]);

  useEffect(() => { load(); loadPending(); }, [load, loadPending]);

  const changeStatus = async (id: number, status: string) => {
    await api.updateAppointment(id, status);
    await Promise.all([load(), loadPending()]);
  };

  const shiftDate = (d: number) => {
    const dt = new Date(date + "T00:00:00");
    dt.setDate(dt.getDate() + d);
    setDate(dt.toISOString().slice(0,10));
  };

  const filterLabels: Record<string, string> = {
    today: t.p_apptToday,
    upcoming: t.p_apptUpcoming,
    all: t.p_apptAll,
  };

  return (
    <div className="rise">
      <div style={S.sectionHead} className="section-head">
        <div><h2 style={S.h2}>{t.p_apptTitle}</h2>
          <p style={S.muted}>{t.p_apptSub}</p></div>
      </div>

      {/* ── Oczekujące section ── */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          <BellRing size={14}/> {t.p_pendingSection}
          {pendingList.length > 0 && (
            <span style={{background:"#f59e0b",color:"#fff",borderRadius:999,fontSize:11,fontWeight:800,padding:"1px 7px",marginLeft:2}}>
              {pendingList.length}
            </span>
          )}
        </div>
        {pendingList.length === 0 ? (
          <div style={{fontSize:13,color:"#a8a2b0",padding:"10px 0"}}>{t.p_pendingEmpty}</div>
        ) : (
          <div style={{...S.card,border:"1.5px solid #fde68a"}}>
            {pendingList.map(a => (
              <div key={a.id} className="appt-row" style={{...S.apptRow,background:"#fffbeb"}}>
                <div className="appt-time" style={{minWidth:52,textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#d97706"}}>{minToTime(a.startMin)}</div>
                  <div style={{fontSize:11,color:"#a8a2b0"}}>{a.duration}min</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700}}>{a.clientName}</div>
                  <div style={{fontSize:12.5,color:"#7c3aed",fontWeight:600}}>{a.clientPhone}</div>
                  <div style={{fontSize:12.5,color:"#71717a"}}>{a.serviceName||"—"}</div>
                  <div style={{fontSize:12,color:"#92400e"}}>{dateLabel(a.date, t)} {minToTime(a.startMin)}</div>
                  {a.comment && <div style={{fontSize:12,color:"#7c3aed",marginTop:2}}>💬 {a.comment}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                  <button style={{...S.miniBtn,background:"#059669",color:"#fff",borderColor:"#059669",fontWeight:700,padding:"6px 12px",fontSize:12,borderRadius:8,gap:4}}
                    onClick={()=>changeStatus(a.id,"confirmed")}>
                    <Check size={13}/> {t.p_btnConfirm}
                  </button>
                  <button style={{...S.miniBtn,background:"#fff",color:"#dc2626",borderColor:"#dc2626",fontWeight:700,padding:"6px 12px",fontSize:12,borderRadius:8,gap:4}}
                    onClick={()=>changeStatus(a.id,"cancelled")}>
                    <X size={13}/> {t.p_btnReject}
                  </button>
                  <button style={{...S.miniBtn,color:"#52525b"}}
                    onClick={()=>setClient(a.clientPhone)} title={t.p_apptClientHistory}>
                    <NotebookPen size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {(["today","upcoming","all"] as const).map(f => (
          <button key={f} style={{...S.filterBtn,...(filter===f?S.filterBtnOn:{})}} onClick={()=>setFilter(f)}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filter==="today" && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button style={S.iconBtn} onClick={()=>shiftDate(-1)}><ChevronLeft size={16}/></button>
          <div style={{flex:1,textAlign:"center",fontWeight:700,fontSize:15}}>{dateLabel(date, t)}</div>
          <button style={S.iconBtn} onClick={()=>shiftDate(1)}><ChevronRight size={16}/></button>
        </div>
      )}

      {loading && <div style={S.empty}>…</div>}
      {!loading && !list.length && (
        <div style={S.empty}>{filter==="today" ? t.p_apptEmpty : t.p_apptEmptyAll}</div>
      )}

      {!loading && list.length > 0 && (
        <div style={S.card}>
          {list.map(a => {
            const st = ST[a.status] || ST.pending;
            return (
              <div key={a.id} className="appt-row" style={S.apptRow}>
                <div className="appt-time" style={{minWidth:52,textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:800,color:ACC}}>{minToTime(a.startMin)}</div>
                  <div style={{fontSize:11,color:"#a8a2b0"}}>{a.duration}min</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700}}>{a.clientName}</div>
                  <div style={{fontSize:12.5,color:"#71717a"}}>{a.serviceName||"—"}</div>
                  {filter !== "today" && <div style={{fontSize:12,color:"#a8a2b0"}}>{dateLabel(a.date, t)}</div>}
                  {a.comment && <div style={{fontSize:12,color:"#7c3aed",marginTop:2}}>💬 {a.comment}</div>}
                </div>
                <div className="appt-actions" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span>
                  <div style={{display:"flex",gap:4}}>
                    <button style={{...S.miniBtn,color:"#52525b"}}
                      onClick={()=>setClient(a.clientPhone)} title={t.p_apptClientHistory}>
                      <NotebookPen size={13}/>
                    </button>
                    {a.status==="confirmed" && <>
                      <button style={{...S.miniBtn,color:"#059669"}} onClick={()=>changeStatus(a.id,"done")} title={t.p_apptDoneTitle}>
                        <Check size={14}/>
                      </button>
                      <button style={{...S.miniBtn,color:"#dc2626"}} onClick={()=>changeStatus(a.id,"cancelled")} title={t.p_apptCancelTitle}>
                        <XCircle size={14}/>
                      </button>
                      <button style={{...S.miniBtn,color:"#f59e0b"}} onClick={()=>changeStatus(a.id,"no_show")} title={t.p_apptNoShowTitle}>
                        <User size={14}/>
                      </button>
                    </>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {client && <ClientModal phone={client} bizId={biz.id} onClose={()=>setClient(null)}/>}
    </div>
  );
}

/* ========== CLIENT MODAL (CRM) ========== */
function ClientModal({ phone, bizId, onClose }: { phone: string; bizId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const ST = statusLabels(t);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.clientHistory(phone).then(d => { setHistory(d.history); setNote(d.note); }).catch(()=>{});
  }, [phone]);
  const saveNote = async () => {
    await api.saveClientNote(phone, note);
    setSaved(true); setTimeout(()=>setSaved(false),1500);
  };
  void bizId;
  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div style={S.modal} className="rise modal-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <div style={{fontWeight:800,fontSize:16}}>{t.p_client}</div>
            <div style={{fontSize:13,color:"#7c3aed",fontWeight:600}}>{phone}</div>
          </div>
          <button style={S.iconBtn} onClick={onClose}><X size={18}/></button>
        </div>

        <label style={S.lbl}>{t.p_clientNote}</label>
        <textarea style={{...S.input,minHeight:80,resize:"vertical",fontFamily:font}}
          value={note} onChange={e=>setNote(e.target.value)} placeholder={t.p_clientNotePh}/>
        <button style={{...S.primary,marginTop:8}} onClick={saveNote}>
          {saved?<><Check size={15}/> {t.p_clientSaved}</>:<><Save size={15}/> {t.p_clientSaveNote}</>}
        </button>

        {history.length > 0 && (
          <>
            <div style={{...S.lbl,marginTop:16}}>{t.p_clientHistory(history.length)}</div>
            <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {history.map(a => {
                const st = ST[a.status]||ST.pending;
                return (
                  <div key={a.id} style={{background:"#faf8fb",borderRadius:10,padding:"10px 12px",display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{a.serviceName||"—"}</div>
                      <div style={{fontSize:12,color:"#a8a2b0"}}>{dateLabel(a.date, t)} {minToTime(a.startMin)}</div>
                    </div>
                    <span style={{...S.statusBadge,color:st.color,background:st.bg,fontSize:11}}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== REVIEWS TAB ========== */
function ReviewsTab() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reportId, setReportId] = useState<number|null>(null);
  const [reason, setReason] = useState("");
  const [reportErr, setReportErr] = useState("");
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => { api.ownerReviews().then(setReviews).catch(()=>{}); }, []);

  const sendReport = async () => {
    if (!reportId || !reason.trim()) { setReportErr(t.p_reportEmpty); return; }
    setReportErr("");
    try {
      await api.reportReview(reportId, reason.trim());
      setReportSent(true);
    } catch(e) { setReportErr((e as Error).message); }
  };

  const avg = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="rise">
      <div style={S.sectionHead} className="section-head">
        <div>
          <h2 style={S.h2}>{t.p_reviewsTitle}</h2>
          <p style={S.muted}>{avg ? t.p_reviewsAvg(avg, reviews.length) : t.p_reviewsNone}</p>
        </div>
      </div>

      {!reviews.length && <div style={S.empty}>{t.p_reviewsEmpty}</div>}

      <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
        {reviews.map(r => (
          <div key={r.id} style={{...S.card,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14}}>{r.clientName}</span>
                <span style={{display:"inline-flex",gap:1}}>
                  {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:13,color:i<=r.rating?"#f59e0b":"#e5e7eb"}}>★</span>)}
                </span>
                {r.hidden && <span style={{fontSize:11,fontWeight:700,color:"#dc2626",background:"#fee2e2",padding:"2px 7px",borderRadius:999}}>{t.p_reviewHidden}</span>}
              </div>
              {r.text && <p style={{fontSize:13.5,color:"#52525b",margin:"4px 0 0",lineHeight:1.5}}>{r.text}</p>}
              <div style={{fontSize:11.5,color:"#c4bdd0",marginTop:6}}>{String(r.createdAt).slice(0,10)}</div>
            </div>
            {!r.hidden && (
              <button style={{...S.miniBtn,color:"#dc2626"}} title={t.p_reportTitle} onClick={()=>{ setReportId(r.id); setReportSent(false); setReason(""); }}>
                <Flag size={14}/>
              </button>
            )}
          </div>
        ))}
      </div>

      {reportId !== null && (
        <div style={S.overlay} onClick={()=>setReportId(null)}>
          <div style={S.modal} className="rise" onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={{fontWeight:800,fontSize:16}}>{t.p_reportTitle}</span>
              <button style={S.iconBtn} onClick={()=>setReportId(null)}><X size={18}/></button>
            </div>
            {reportSent ? (
              <div style={{textAlign:"center" as const,padding:"12px 0",color:"#7c3aed",fontWeight:700}}>
                {t.p_reportSent}
              </div>
            ) : (
              <>
                <p style={{fontSize:13.5,color:"#71717a",margin:"0 0 12px"}}>{t.p_reportDesc}</p>
                <textarea style={{...S.input,minHeight:80,resize:"vertical",fontFamily:font}}
                  value={reason} onChange={e=>setReason(e.target.value)} placeholder={t.p_reportPh}/>
                {reportErr && <div style={S.err}>{reportErr}</div>}
                <button style={{...S.primary,marginTop:8}} onClick={sendReport}>{t.p_reportSend}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== WAITLIST TAB ========== */
function WaitlistTab() {
  const { t } = useTranslation();
  const [list, setList] = useState<{id:number;clientName:string;clientPhone:string;clientEmail:string;serviceName:string|null;preferredDate:string|null;createdAt:string}[]>([]);

  const load = useCallback(() => { api.waitlist().then(setList).catch(()=>{}); }, []);
  useEffect(() => { load(); }, [load]);

  const notify = async (id: number) => { await api.notifyWaitlist(id); load(); };

  return (
    <div className="rise">
      <div style={S.sectionHead} className="section-head">
        <div>
          <h2 style={S.h2}>{t.p_waitTitle}</h2>
          <p style={S.muted}>{t.p_waitSub}</p>
        </div>
      </div>

      {!list.length && <div style={S.empty}>{t.p_waitEmpty}</div>}

      <div style={S.card}>
        {list.map(w => (
          <div key={w.id} style={S.apptRow}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700}}>{w.clientName}</div>
              <div style={{fontSize:12.5,color:"#71717a"}}>{w.clientPhone}{w.clientEmail ? ` · ${w.clientEmail}` : ""}</div>
              {w.serviceName && <div style={{fontSize:12.5,color:ACC,marginTop:2}}>{w.serviceName}</div>}
              {w.preferredDate && <div style={{fontSize:12,color:"#a8a2b0"}}>{t.p_waitPreferred(w.preferredDate)}</div>}
            </div>
            <button style={{...S.miniBtn,color:"#059669"}} title={t.p_waitNotify} onClick={()=>notify(w.id)}>
              <Check size={14}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== SERVICES TAB ========== */
function ServicesTab() {
  const { t } = useTranslation();
  const [list, setList] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Partial<Service>|null>(null);
  const reload = useCallback(() => { api.services().then(setList).catch(console.error); }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = async (s: Partial<Service>) => {
    if (s.id) await api.updateService(s.id, s); else await api.addService(s);
    setEditing(null); reload();
  };
  const del = async (id: number) => { await api.deleteService(id); reload(); };

  const groups: Record<string, Service[]> = {};
  list.forEach(s => { (groups[s.grp||t.p_tabServices] ||= []).push(s); });

  return (
    <div className="rise">
      <div style={S.sectionHead} className="section-head">
        <div><h2 style={S.h2}>{t.p_svcTitle}</h2>
          <p style={S.muted}>{t.p_svcSub}</p></div>
        <button className="add-btn" style={S.addBtn}
          onClick={()=>setEditing({grp:"",name:"",description:"",duration:30,price:0})}>
          <Plus size={16}/> {t.p_svcAdd}
        </button>
      </div>

      {!list.length && <div style={S.empty}>{t.p_svcEmpty}</div>}

      {Object.entries(groups).map(([grp, items]) => (
        <div key={grp} style={{marginBottom:18}}>
          {grp && <div style={S.grpLabel}>{grp}</div>}
          <div style={S.card}>
            {items.map(s => (
              <div key={s.id} style={S.svcRow}>
                <div style={{flex:1}}>
                  <div style={S.svcName}>{s.name}</div>
                  {s.description && <div style={S.svcDesc}>{s.description}</div>}
                  <div style={S.svcMeta}><Clock size={11}/> {s.duration} min</div>
                </div>
                <div style={S.svcPrice}>{s.price} zł</div>
                <button style={S.miniBtn} onClick={()=>setEditing(s)}><Pencil size={14}/></button>
                <button style={{...S.miniBtn,color:"#ef4444"}} onClick={()=>del(s.id)}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editing && <ServiceModal init={editing} onClose={()=>setEditing(null)} onSave={save}/>}
    </div>
  );
}

function ServiceModal({ init, onClose, onSave }:
  { init: Partial<Service>; onClose: ()=>void; onSave: (s: Partial<Service>)=>void }) {
  const { t } = useTranslation();
  const [s, setS] = useState<Partial<Service>>(init);
  const set = (k: keyof Service, v: string|number) => setS(p => ({...p,[k]:v}));
  const valid = (s.name||"").trim();
  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div style={S.modal} className="rise modal-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={{fontWeight:800,fontSize:17}}>{s.id ? t.p_svcEditTitle : t.p_svcNewTitle}</span>
          <button style={S.iconBtn} onClick={onClose}><X size={18}/></button>
        </div>
        <label style={S.lbl}>{t.p_svcGroup}</label>
        <input style={S.input} value={s.grp||""} onChange={e=>set("grp",e.target.value)} placeholder={t.p_svcGroupPh}/>
        <label style={S.lbl}>{t.p_svcNameLabel}</label>
        <input style={S.input} value={s.name||""} onChange={e=>set("name",e.target.value)} placeholder={t.p_svcNamePh} autoFocus/>
        <label style={S.lbl}>{t.p_svcDescLabel}</label>
        <textarea style={{...S.input,minHeight:64,resize:"vertical",fontFamily:font}}
          value={s.description||""} onChange={e=>set("description",e.target.value)} placeholder={t.p_svcDescPh}/>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={S.lbl}>{t.p_svcDuration}</label>
            <input style={S.input} type="number" value={s.duration??30} onChange={e=>set("duration",Number(e.target.value))}/></div>
          <div style={{flex:1}}><label style={S.lbl}>{t.p_svcPrice}</label>
            <input style={S.input} type="number" value={s.price??0} onChange={e=>set("price",Number(e.target.value))}/></div>
        </div>
        <button style={{...S.primary,marginTop:18,opacity:valid?1:0.5}} disabled={!valid} onClick={()=>onSave(s)}>
          <Save size={16}/> {t.p_save}
        </button>
      </div>
    </div>
  );
}

/* ========== SERVICE REQUESTS TAB ========== */
function ServiceRequestsTab() {
  const { t } = useTranslation();
  type SvcReq = { id: number; clientPhone: string; text: string; handled: boolean; createdAt: string };
  const [list, setList] = useState<SvcReq[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await api.serviceRequests()); } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markHandled = async (id: number) => {
    await api.resolveServiceRequest(id);
    load();
  };

  return (
    <div className="rise">
      <h2 style={S.h2}>{t.p_reqTitle}</h2>
      <p style={S.muted}>{t.p_reqSub}</p>

      {loading && <div style={S.empty}>…</div>}
      {!loading && list.length === 0 && <div style={S.empty}>{t.p_reqEmpty}</div>}

      {!loading && list.length > 0 && (
        <div style={S.card}>
          {list.map(r => (
            <div key={r.id} style={{...S.apptRow,opacity:r.handled?.6:1}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:700,color:ACC}}>{r.clientPhone}</div>
                <div style={{fontSize:13.5,marginTop:3,lineHeight:1.5}}>{r.text}</div>
                <div style={{fontSize:11.5,color:"#a8a2b0",marginTop:4}}>{new Date(r.createdAt).toLocaleDateString("pl-PL")}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                {r.handled ? (
                  <span style={{...S.statusBadge,color:"#059669",background:"#d1fae5"}}>{t.p_reqHandled}</span>
                ) : (
                  <button style={{...S.miniBtn,color:"#059669",borderColor:"#059669",padding:"5px 10px",fontSize:12,fontWeight:600}}
                    onClick={()=>markHandled(r.id)}>
                    <Check size={13}/> {t.p_reqMarkHandled}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== PROFILE TAB ========== */
function ProfileTab({ biz, setBiz }: { biz: Business|null; setBiz: (b: Business)=>void }) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<Meta|null>(null);
  const [form, setForm] = useState<Business|null>(biz);
  const [saved, setSaved] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  useEffect(() => { api.meta().then(setMeta).catch(()=>{}); }, []);
  useEffect(() => { setForm(biz); }, [biz]);
  if (!form||!meta) return <div style={S.empty}>…</div>;

  const set = (k: keyof Business, v: unknown) => setForm(p => p?{...p,[k]:v}:p);
  const save = async () => {
    const b = await api.saveBusiness(form);
    setBiz(b); setSaved(true); setTimeout(()=>setSaved(false),1800);
  };
  const districts = meta.cities[form.city]||[];
  const toggleReminder = (h: number) =>
    set("reminderHours", form.reminderHours.includes(h)
      ? form.reminderHours.filter(x=>x!==h)
      : [...form.reminderHours,h].sort((a,b)=>b-a));

  const setHour = (day: string, idx: 0|1, val: string) => {
    const hours = {...(form.hours||{})};
    if (!hours[day]) hours[day] = ["09:00","18:00"] as [string,string];
    (hours[day] as [string,string])[idx] = val;
    set("hours", hours);
  };
  const toggleDay = (day: string) => {
    const hours = {...(form.hours||{})};
    if (hours[day]) { delete hours[day]; } else { hours[day] = ["09:00","18:00"]; }
    set("hours", hours);
  };

  // Build Select options
  const catOptions: SelectOption[] = meta.categories.map(c => ({
    value: c.id,
    label: t.catLabels[c.id] ?? c.pl,
    icon: <CategoryIcon id={c.id} size={15} color={form.category === c.id ? ACC : "#71717a"}/>,
  }));
  const cityOptions: SelectOption[] = [
    { value: "", label: t.p_pickSelect },
    ...Object.keys(meta.cities).map(c => ({ value: c, label: c })),
  ];
  const districtOptions: SelectOption[] = [
    { value: "", label: t.p_pickSelect },
    ...districts.map(d => ({ value: d, label: d })),
  ];

  return (
    <div className="rise">
      <h2 style={S.h2}>{t.p_profileTitle}</h2>
      <p style={S.muted}>{t.p_profileSub}</p>

      <div style={{...S.bannerPrev,background:BANNERS[form.banner]||BANNERS.violet}}>
        {form.verified && <span style={S.verTag}><BadgeCheck size={13}/> {t.p_verified}</span>}
      </div>
      <div style={S.bannerPick}>
        {Object.keys(BANNERS).map(k => (
          <button key={k} style={{...S.bannerSwatch,background:BANNERS[k],outline:form.banner===k?`3px solid ${ACC}`:"none"}}
            onClick={()=>set("banner",k)}/>
        ))}
      </div>

      <label style={S.lbl}>{t.p_fieldName}</label>
      <input style={S.input} value={form.name} onChange={e=>set("name",e.target.value)}/>

      <label style={S.lbl}>{t.p_fieldCategory}</label>
      <Select
        value={form.category}
        onChange={v => set("category", v)}
        options={catOptions}
        placeholder={t.p_pickSelect}
      />

      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}>
          <label style={S.lbl}>{t.p_fieldCity}</label>
          <Select
            value={form.city}
            onChange={v => { set("city", v); set("district", ""); }}
            options={cityOptions}
            placeholder={t.p_pickSelect}
            searchable
          />
        </div>
        <div style={{flex:1}}>
          <label style={S.lbl}>{t.p_fieldDistrict}</label>
          <Select
            value={form.district}
            onChange={v => set("district", v)}
            options={districtOptions}
            placeholder={t.p_pickSelect}
            disabled={!districts.length}
          />
        </div>
      </div>

      <label style={S.lbl}>{t.p_fieldAddress}</label>
      <Field icon={<MapPin size={15}/>} value={form.address} onChange={v=>set("address",v)} placeholder="ul. Przykładowa 1"/>
      <label style={S.lbl}>{t.p_fieldPhone}</label>
      <Field icon={<Phone size={15}/>} value={form.phone} onChange={v=>set("phone",v)} placeholder="500 600 700"/>
      <label style={S.lbl}>{t.p_fieldInstagram}</label>
      <Field icon={<Instagram size={15}/>} value={form.instagram} onChange={v=>set("instagram",v)} placeholder="@twojprofil"/>

      <label style={S.lbl}>{t.p_fieldAbout}</label>
      <textarea style={{...S.input,minHeight:70,resize:"vertical",fontFamily:font}}
        value={form.about} onChange={e=>set("about",e.target.value)} placeholder={t.p_aboutPh}/>

      <label style={S.lbl}>{t.p_workHours}</label>
      <div style={S.hoursGrid}>
        {DAY_KEYS.map(key => {
          const on = !!(form.hours?.[key]);
          const vals = (form.hours?.[key] || ["09:00","18:00"]) as [string,string];
          const dayLabel = (t.days as Record<string, string>)[key] || key;
          return (
            <div key={key} style={S.hoursRow}>
              <button style={{...S.toggle,...(on?S.toggleOn:{})}} onClick={()=>toggleDay(key)}>
                <span style={{...S.knob,...(on?S.knobOn:{})}}/>
              </button>
              <span style={{width:28,fontSize:13,fontWeight:600,color:on?"#1b1420":"#a8a2b0"}}>{dayLabel}</span>
              {on ? (
                <>
                  <input style={S.timeInput} type="time" value={vals[0]} onChange={e=>setHour(key,0,e.target.value)}/>
                  <span style={{color:"#a8a2b0",fontSize:13}}>—</span>
                  <input style={S.timeInput} type="time" value={vals[1]} onChange={e=>setHour(key,1,e.target.value)}/>
                </>
              ) : <span style={{fontSize:12,color:"#c4bece"}}>{t.p_closed}</span>}
            </div>
          );
        })}
      </div>

      <label style={S.lbl}>{t.p_portfolio}</label>
      <div style={S.photoRow}>
        {form.photos.map((p,i) => (
          <div key={i} style={S.photoTile}>
            <img src={p} alt="" style={S.photoImg} onError={e=>((e.target as HTMLImageElement).style.opacity="0.2")}/>
            <button style={S.photoDel} onClick={()=>set("photos",form.photos.filter((_,j)=>j!==i))}><X size={12}/></button>
          </div>
        ))}
        <div style={S.photoAdd}><Image size={18} color="#a8a2b0"/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input style={{...S.input,marginBottom:0}} value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} placeholder={t.p_photoUrlPh}/>
        <button className="add-btn" style={S.addBtn} onClick={()=>{if(photoUrl.trim()){set("photos",[...form.photos,photoUrl.trim()]);setPhotoUrl("");}}}>
          <Plus size={16}/>
        </button>
      </div>
      <p style={S.hint}>{t.p_photoHint}</p>

      <div style={S.settingsBox}>
        <div style={S.setRow}>
          <div><div style={S.setName}>{t.p_confirmSetting}</div>
            <div style={S.setSub}>{t.p_confirmSettingSub}</div></div>
          <button style={{...S.toggle,...(form.confirmRequired?S.toggleOn:{})}} onClick={()=>set("confirmRequired",!form.confirmRequired)}>
            <span style={{...S.knob,...(form.confirmRequired?S.knobOn:{})}}/>
          </button>
        </div>
        <div style={{...S.setRow,borderTop:"1px solid #f0ebf5"}}>
          <div><div style={S.setName}><Bell size={13}/> {t.p_remindersSetting}</div>
            <div style={S.setSub}>{t.p_remindersSettingSub}</div></div>
          <div style={{display:"flex",gap:6}}>
            {[24,4,2,1].map(h => (
              <button key={h} style={{...S.remChip,...(form.reminderHours.includes(h)?S.remChipOn:{})}}
                onClick={()=>toggleReminder(h)}>{h}h</button>
            ))}
          </div>
        </div>
      </div>

      <button style={{...S.primary,marginTop:20}} onClick={save}>
        {saved?<><Check size={16}/> {t.p_profileSaved}</>:<><Save size={16}/> {t.p_profileSave}</>}
      </button>
    </div>
  );
}

/* ========== small components ========== */
function Field({ icon, value, onChange, placeholder, type="text" }:
  { icon: React.ReactNode; value: string; onChange: (v:string)=>void; placeholder: string; type?: string }) {
  return (
    <div style={S.fieldWrap}>
      <span style={{color:"#a8a2b0",display:"flex"}}>{icon}</span>
      <input style={S.fieldInput} value={value} type={type} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    </div>
  );
}

/* ========== styles ========== */
const S: Record<string, CSSProperties> = {
  center: {minHeight:"100vh",display:"grid",placeItems:"center",color:"#a8a2b0",fontSize:24},
  app:    {maxWidth:720,margin:"0 auto",minHeight:"100vh"},
  top:    {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",position:"sticky",top:0,background:"#faf8fb",zIndex:10},
  logoRow:{display:"flex",alignItems:"center",gap:10},
  logo:   {width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#7c3aed,#ec4899)",color:"#fff",fontWeight:800,fontSize:18,display:"grid",placeItems:"center",boxShadow:"0 3px 12px #7c3aed55"},
  panelTag:{fontSize:11,fontWeight:700,color:ACC,background:"#7c3aed12",padding:"3px 8px",borderRadius:6},
  iconBtn:{width:38,height:38,borderRadius:10,border:"none",background:"#fff",color:"#52525b",cursor:"pointer",display:"grid",placeItems:"center",boxShadow:"0 1px 4px #0000000a"},
  tabs:   {display:"flex",gap:8,padding:"0 20px 8px"},
  tab:    {display:"flex",alignItems:"center",gap:7,border:"none",background:"transparent",color:"#71717a",padding:"10px 16px",borderRadius:11,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:font},
  tabOn:  {background:"#1b1420",color:"#fff"},
  body:   {padding:"10px 20px 40px"},

  sectionHead:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16},
  h2:     {fontSize:20,fontWeight:800,margin:0,letterSpacing:-0.4},
  muted:  {fontSize:13.5,color:"#a8a2b0",margin:"4px 0 0"},
  hint:   {fontSize:12,color:"#b8b2c0",margin:"6px 0 0"},
  addBtn: {display:"flex",alignItems:"center",gap:6,background:"#1b1420",color:"#fff",border:"none",borderRadius:11,padding:"11px 16px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:font,flexShrink:0},
  empty:  {textAlign:"center",color:"#a8a2b0",fontSize:14,padding:"34px 0",background:"#fff",borderRadius:16},

  filterBtn:  {padding:"8px 14px",borderRadius:10,border:"1.5px solid #ece8f0",background:"#fff",color:"#71717a",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:font},
  filterBtnOn:{background:"#1b1420",color:"#fff",borderColor:"#1b1420"},

  card:   {background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 14px #1b142010"},
  apptRow:{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderBottom:"1px solid #f4f1f7"},
  statusBadge:{fontSize:12,fontWeight:700,padding:"3px 9px",borderRadius:999},

  grpLabel:{fontSize:13,fontWeight:700,color:ACC,margin:"0 0 8px 2px",textTransform:"uppercase" as const,letterSpacing:0.5},
  svcRow:  {display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:"1px solid #f4f1f7"},
  svcName: {fontSize:14.5,fontWeight:600},
  svcDesc: {fontSize:12.5,color:"#71717a",marginTop:3,lineHeight:1.4},
  svcMeta: {display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"#a8a2b0",marginTop:5},
  svcPrice:{fontSize:15,fontWeight:700,color:ACC,flexShrink:0},
  miniBtn: {width:32,height:32,borderRadius:8,border:"none",background:"#f4f1f7",color:"#71717a",cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0},

  overlay:{position:"fixed",inset:0,background:"rgba(27,20,32,.5)",backdropFilter:"blur(3px)",display:"grid",placeItems:"center",padding:18,zIndex:60},
  modal:  {background:"#fff",borderRadius:20,width:"100%",maxWidth:440,padding:"20px 22px 24px",boxShadow:"0 24px 70px #00000038",maxHeight:"92vh",overflowY:"auto"},
  modalHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},

  bannerPrev:{height:110,borderRadius:16,position:"relative",marginBottom:10},
  verTag: {position:"absolute",left:12,top:12,display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.9)",color:ACC,fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:999},
  bannerPick:{display:"flex",gap:8,marginBottom:8},
  bannerSwatch:{width:44,height:30,borderRadius:8,border:"none",cursor:"pointer",outlineOffset:2},

  hoursGrid:{background:"#fff",borderRadius:14,padding:"10px 14px",marginBottom:10,boxShadow:"0 2px 8px #1b142008"},
  hoursRow: {display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f4f1f7"},
  timeInput:{border:"1.5px solid #ece8f0",borderRadius:8,padding:"5px 8px",fontSize:13,fontFamily:font,background:"#faf8fb",width:84},

  photoRow:{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:8},
  photoTile:{position:"relative",width:70,height:70,borderRadius:12,overflow:"hidden",background:"#f4f1f7"},
  photoImg: {width:"100%",height:"100%",objectFit:"cover" as const},
  photoDel: {position:"absolute",right:3,top:3,width:20,height:20,borderRadius:999,border:"none",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",display:"grid",placeItems:"center"},
  photoAdd: {width:70,height:70,borderRadius:12,border:"2px dashed #e4e0ea",display:"grid",placeItems:"center"},

  settingsBox:{background:"#fff",borderRadius:16,marginTop:18,boxShadow:"0 2px 14px #1b142010"},
  setRow:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 17px",gap:12},
  setName: {fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6},
  setSub:  {fontSize:12,color:"#a8a2b0",marginTop:3},
  toggle:  {width:46,height:27,borderRadius:999,border:"none",background:"#e4e0ea",cursor:"pointer",position:"relative",flexShrink:0},
  toggleOn:{background:ACC},
  knob:    {position:"absolute",left:3,top:3,width:21,height:21,borderRadius:999,background:"#fff",transition:"left .15s",boxShadow:"0 1px 3px #00000033"},
  knobOn:  {left:22},
  remChip: {padding:"7px 11px",borderRadius:9,border:"1.5px solid #ece8f0",background:"#fff",color:"#71717a",fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:font},
  remChipOn:{background:ACC,color:"#fff",borderColor:ACC},

  authWrap:{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"radial-gradient(1000px 500px at 50% -10%,#efe4ff,#faf8fb 60%)"},
  authCard:{background:"#fff",borderRadius:22,padding:"30px 28px",width:"100%",maxWidth:420,boxShadow:"0 24px 70px #0000001a"},
  backLink:{position:"fixed",top:18,left:18,background:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",color:ACC,boxShadow:"0 2px 8px #0000000f"},
  h1:      {fontSize:23,fontWeight:800,margin:"20px 0 0",letterSpacing:-0.5},
  sub:     {fontSize:14,color:"#71717a",margin:"6px 0 18px"},
  catGrid: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6},
  catBtn:  {display:"flex",alignItems:"center",gap:8,padding:"11px 12px",borderRadius:11,border:"1.5px solid #ece8f0",background:"#fff",fontSize:13.5,fontWeight:600,color:"#52525b",cursor:"pointer",fontFamily:font},
  catBtnOn:{borderColor:ACC,background:"#7c3aed10",color:ACC},
  fieldWrap:{display:"flex",alignItems:"center",gap:9,background:"#faf8fb",border:"1.5px solid #ece8f0",borderRadius:12,padding:"0 13px",marginBottom:10},
  fieldInput:{border:"none",outline:"none",background:"transparent",fontSize:14.5,padding:"12px 0",flex:1,fontFamily:font},
  lbl:     {fontSize:12.5,fontWeight:600,color:"#52525b",display:"block",margin:"12px 0 6px"},
  input:   {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #ece8f0",fontSize:14.5,outline:"none",background:"#faf8fb",marginBottom:10,boxSizing:"border-box" as const,fontFamily:font},
  err:     {background:"#fef2f2",color:"#dc2626",fontSize:13,padding:"11px 13px",borderRadius:10,marginTop:12,textAlign:"center" as const},
  primary: {width:"100%",marginTop:14,display:"flex",justifyContent:"center",alignItems:"center",gap:8,background:"linear-gradient(135deg,#7c3aed,#ec4899)",color:"#fff",border:"none",borderRadius:13,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:font,boxShadow:"0 8px 22px #7c3aed44"},
  switch:  {textAlign:"center" as const,fontSize:13,color:"#71717a",marginTop:16},
  link:    {color:ACC,fontWeight:700,cursor:"pointer"},
};
