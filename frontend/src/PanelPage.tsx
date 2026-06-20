import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Store, LogOut, Scissors, Plus, Trash2, Save, Check, Bell, Clock,
  MapPin, Phone, Instagram, Pencil, X, BadgeCheck, Image, Calendar,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, NotebookPen, User,
  ExternalLink, Star, BellRing, Flag,
} from "lucide-react";
import { api, getToken, setToken, clearToken } from "./api";
import { navigate } from "./App";
import type { Business, Service, Meta, Appointment, Review } from "./types";

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
const DAYS: [string, string][] = [
  ["mon","Pon"],["tue","Wt"],["wed","Śr"],["thu","Czw"],["fri","Pt"],["sat","Sob"],["sun","Nd"],
];
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Oczekuje",   color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "Potwierdzona", color: "#065f46", bg: "#d1fae5" },
  cancelled: { label: "Anulowana",  color: "#991b1b", bg: "#fee2e2" },
  done:      { label: "Zakończona", color: "#374151", bg: "#f3f4f6" },
  no_show:   { label: "Nieobecność",color: "#7c2d12", bg: "#ffedd5" },
};

function minToTime(m: number) {
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function dateLabel(d: string) {
  const t = todayStr();
  if (d === t) return "Dzisiaj";
  const tom = new Date(); tom.setDate(tom.getDate()+1);
  if (d === tom.toISOString().slice(0,10)) return "Jutro";
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
      <button style={S.backLink} onClick={() => navigate("/")}>← Rezerwo</button>
      <div style={S.authCard} className="rise">
        <div style={S.logoRow}>
          <div style={S.logo}>R</div>
          <span style={{ fontSize:20, fontWeight:800 }}>Rezerwo</span>
          <span style={S.panelTag}>Panel</span>
        </div>
        <h1 style={S.h1}>{mode === "register" ? "Załóż konto firmy" : "Zaloguj się"}</h1>
        <p style={S.sub}>Zarządzaj rezerwacjami, usługami i profilem.</p>

        {mode === "register" && (
          <>
            <Field icon={<Store size={15}/>} value={biz} onChange={setBiz} placeholder="Nazwa firmy (np. Beseder Barbershop)"/>
            <label style={S.lbl}>Kategoria</label>
            <div style={S.catGrid}>
              {meta?.categories.map(c => (
                <button key={c.id} style={{...S.catBtn,...(cat===c.id?S.catBtnOn:{})}} onClick={()=>setCat(c.id)}>
                  <span style={{fontSize:18}}>{c.emoji}</span> {c.pl}
                </button>
              ))}
            </div>
          </>
        )}
        <Field icon={<User size={15}/>} value={email} onChange={setEmail} placeholder="email@firma.pl" type="email"/>
        <Field icon={<User size={15}/>} value={pw} onChange={setPw} placeholder="hasło (min. 6 znaków)" type="password"/>
        {err && <div style={S.err}>{err}</div>}
        <button style={S.primary} onClick={submit} disabled={busy}>{busy?"…":mode==="register"?"Załóż konto":"Zaloguj"}</button>
        <div style={S.switch}>{mode==="register"?"Masz już konto?":"Nie masz konta?"}{" "}
          <span style={S.link} onClick={()=>{setErr("");setMode(mode==="register"?"login":"register");}}>
            {mode==="register"?"Zaloguj się":"Załóż konto"}</span></div>
      </div>
    </div>
  );
}

/* ========== DASHBOARD ========== */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"appointments"|"services"|"profile"|"reviews"|"waitlist">("appointments");
  const [biz, setBiz] = useState<Business|null>(null);
  useEffect(() => { api.business().then(setBiz).catch(console.error); }, []);

  return (
    <div style={S.app}>
      <header style={S.top}>
        <div style={S.logoRow}>
          <div style={S.logo}>R</div>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>{biz?.name||"Rezerwo"}</div>
            <div style={{fontSize:11.5,color:"#a8a2b0"}}>Panel właściciela</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {biz?.slug && (
            <a href={`/${biz.slug}`} target="_blank" rel="noreferrer"
               style={{...S.iconBtn, textDecoration:"none", color:"#52525b"}} title="Podgląd profilu">
              <ExternalLink size={16}/>
            </a>
          )}
          <button style={S.iconBtn} onClick={onLogout} title="Wyloguj"><LogOut size={17}/></button>
        </div>
      </header>

      <div style={S.tabs}>
        <button style={{...S.tab,...(tab==="appointments"?S.tabOn:{})}} onClick={()=>setTab("appointments")}>
          <Calendar size={15}/> Terminy
        </button>
        <button style={{...S.tab,...(tab==="services"?S.tabOn:{})}} onClick={()=>setTab("services")}>
          <Scissors size={15}/> Usługi
        </button>
        <button style={{...S.tab,...(tab==="reviews"?S.tabOn:{})}} onClick={()=>setTab("reviews")}>
          <Star size={15}/> Opinie
        </button>
        <button style={{...S.tab,...(tab==="waitlist"?S.tabOn:{})}} onClick={()=>setTab("waitlist")}>
          <BellRing size={15}/> Lista
        </button>
        <button style={{...S.tab,...(tab==="profile"?S.tabOn:{})}} onClick={()=>setTab("profile")}>
          <Store size={15}/> Profil
        </button>
      </div>

      <div style={S.body}>
        {tab==="appointments" && biz && <AppointmentsTab biz={biz}/>}
        {tab==="services"     && <ServicesTab/>}
        {tab==="reviews"      && <ReviewsTab/>}
        {tab==="waitlist"     && biz && <WaitlistTab/>}
        {tab==="profile"      && <ProfileTab biz={biz} setBiz={setBiz}/>}
      </div>
    </div>
  );
}

/* ========== APPOINTMENTS TAB ========== */
function AppointmentsTab({ biz }: { biz: Business }) {
  const [filter, setFilter] = useState<"today"|"upcoming"|"all">("today");
  const [date, setDate] = useState(todayStr());
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<string|null>(null);

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

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, status: string) => {
    await api.updateAppointment(id, status);
    load();
  };

  const shiftDate = (d: number) => {
    const dt = new Date(date + "T00:00:00");
    dt.setDate(dt.getDate() + d);
    setDate(dt.toISOString().slice(0,10));
  };

  return (
    <div className="rise">
      <div style={S.sectionHead}>
        <div><h2 style={S.h2}>Terminy</h2>
          <p style={S.muted}>Rezerwacje Twoich klientów.</p></div>
      </div>

      {/* filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {(["today","upcoming","all"] as const).map(f => (
          <button key={f} style={{...S.filterBtn,...(filter===f?S.filterBtnOn:{})}} onClick={()=>setFilter(f)}>
            {f==="today"?"Dzisiaj":f==="upcoming"?"Nadchodzące":"Wszystkie"}
          </button>
        ))}
      </div>

      {/* date navigation for "today" view */}
      {filter==="today" && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button style={S.iconBtn} onClick={()=>shiftDate(-1)}><ChevronLeft size={16}/></button>
          <div style={{flex:1,textAlign:"center",fontWeight:700,fontSize:15}}>{dateLabel(date)}</div>
          <button style={S.iconBtn} onClick={()=>shiftDate(1)}><ChevronRight size={16}/></button>
        </div>
      )}

      {loading && <div style={S.empty}>…</div>}
      {!loading && !list.length && (
        <div style={S.empty}>
          {filter==="today" ? "Brak terminów na ten dzień." : "Brak terminów."}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div style={S.card}>
          {list.map(a => {
            const st = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
            return (
              <div key={a.id} style={S.apptRow}>
                <div style={{minWidth:52,textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:800,color:ACC}}>{minToTime(a.startMin)}</div>
                  <div style={{fontSize:11,color:"#a8a2b0"}}>{a.duration}min</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700}}>{a.clientName}</div>
                  <div style={{fontSize:12.5,color:"#71717a"}}>{a.serviceName||"—"}</div>
                  {filter !== "today" && <div style={{fontSize:12,color:"#a8a2b0"}}>{dateLabel(a.date)}</div>}
                  {a.comment && <div style={{fontSize:12,color:"#7c3aed",marginTop:2}}>💬 {a.comment}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <span style={{...S.statusBadge,color:st.color,background:st.bg}}>{st.label}</span>
                  <div style={{display:"flex",gap:4}}>
                    <button style={{...S.miniBtn,color:"#52525b"}}
                      onClick={()=>setClient(a.clientPhone)} title="Historia klienta">
                      <NotebookPen size={13}/>
                    </button>
                    {a.status==="pending" && <>
                      <button style={{...S.miniBtn,color:"#059669"}} onClick={()=>changeStatus(a.id,"confirmed")}>
                        <CheckCircle2 size={14}/>
                      </button>
                      <button style={{...S.miniBtn,color:"#dc2626"}} onClick={()=>changeStatus(a.id,"cancelled")}>
                        <XCircle size={14}/>
                      </button>
                    </>}
                    {a.status==="confirmed" && <>
                      <button style={{...S.miniBtn,color:"#059669"}} onClick={()=>changeStatus(a.id,"done")} title="Gotowe">
                        <Check size={14}/>
                      </button>
                      <button style={{...S.miniBtn,color:"#dc2626"}} onClick={()=>changeStatus(a.id,"cancelled")} title="Anuluj">
                        <XCircle size={14}/>
                      </button>
                    </>}
                    {a.status==="confirmed" && (
                      <button style={{...S.miniBtn,color:"#f59e0b"}} onClick={()=>changeStatus(a.id,"no_show")} title="Nieobecność">
                        <User size={14}/>
                      </button>
                    )}
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
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} className="rise" onClick={e=>e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <div style={{fontWeight:800,fontSize:16}}>Klient</div>
            <div style={{fontSize:13,color:"#7c3aed",fontWeight:600}}>{phone}</div>
          </div>
          <button style={S.iconBtn} onClick={onClose}><X size={18}/></button>
        </div>

        <label style={S.lbl}>Prywatna notatka (widzi tylko właściciel)</label>
        <textarea style={{...S.input,minHeight:80,resize:"vertical",fontFamily:font}}
          value={note} onChange={e=>setNote(e.target.value)} placeholder="Alergie, preferencje, szczegóły…"/>
        <button style={{...S.primary,marginTop:8}} onClick={saveNote}>
          {saved?<><Check size={15}/> Zapisano</>:<><Save size={15}/> Zapisz notatkę</>}
        </button>

        {history.length > 0 && (
          <>
            <div style={{...S.lbl,marginTop:16}}>Historia wizyt ({history.length})</div>
            <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {history.map(a => {
                const st = STATUS_LABELS[a.status]||STATUS_LABELS.pending;
                return (
                  <div key={a.id} style={{background:"#faf8fb",borderRadius:10,padding:"10px 12px",display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{a.serviceName||"—"}</div>
                      <div style={{fontSize:12,color:"#a8a2b0"}}>{dateLabel(a.date)} {minToTime(a.startMin)}</div>
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reportId, setReportId] = useState<number|null>(null);
  const [reason, setReason] = useState("");
  const [reportErr, setReportErr] = useState("");
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    api.ownerReviews().then(setReviews).catch(()=>{});
  }, []);

  const sendReport = async () => {
    if (!reportId || !reason.trim()) { setReportErr("Podaj powód zgłoszenia."); return; }
    setReportErr("");
    try {
      await api.reportReview(reportId, reason.trim());
      setReportSent(true);
    } catch(e) { setReportErr((e as Error).message); }
  };

  const avg = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="rise">
      <div style={S.sectionHead}>
        <div>
          <h2 style={S.h2}>Opinie klientów</h2>
          <p style={S.muted}>{avg ? `Średnia ocena: ${avg} / 5.0 (${reviews.length} opinii)` : "Brak opinii."}</p>
        </div>
      </div>

      {!reviews.length && <div style={S.empty}>Brak opinii. Pojawią się tutaj po pierwszych wizytach.</div>}

      <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
        {reviews.map(r => (
          <div key={r.id} style={{...S.card,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14}}>{r.clientName}</span>
                <span style={{display:"inline-flex",gap:1}}>
                  {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:13,color:i<=r.rating?"#f59e0b":"#e5e7eb"}}>★</span>)}
                </span>
                {r.hidden && <span style={{fontSize:11,fontWeight:700,color:"#dc2626",background:"#fee2e2",padding:"2px 7px",borderRadius:999}}>Ukryta</span>}
              </div>
              {r.text && <p style={{fontSize:13.5,color:"#52525b",margin:"4px 0 0",lineHeight:1.5}}>{r.text}</p>}
              <div style={{fontSize:11.5,color:"#c4bdd0",marginTop:6}}>{String(r.createdAt).slice(0,10)}</div>
            </div>
            {!r.hidden && (
              <button style={{...S.miniBtn,color:"#dc2626"}} title="Zgłoś opinię" onClick={()=>{ setReportId(r.id); setReportSent(false); setReason(""); }}>
                <Flag size={14}/>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* report modal */}
      {reportId !== null && (
        <div style={S.overlay} onClick={()=>setReportId(null)}>
          <div style={S.modal} className="rise" onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={{fontWeight:800,fontSize:16}}>Zgłoś opinię</span>
              <button style={S.iconBtn} onClick={()=>setReportId(null)}><X size={18}/></button>
            </div>
            {reportSent ? (
              <div style={{textAlign:"center" as const,padding:"12px 0",color:"#7c3aed",fontWeight:700}}>
                ✓ Zgłoszenie zostało wysłane do moderacji.
              </div>
            ) : (
              <>
                <p style={{fontSize:13.5,color:"#71717a",margin:"0 0 12px"}}>
                  Opisz, dlaczego uważasz tę opinię za nieuczciwą lub naruszającą regulamin.
                </p>
                <textarea style={{...S.input,minHeight:80,resize:"vertical",fontFamily:font}}
                  value={reason} onChange={e=>setReason(e.target.value)} placeholder="np. Opinia nie dotyczy mojego salonu, zawiera wulgaryzmy…"/>
                {reportErr && <div style={S.err}>{reportErr}</div>}
                <button style={{...S.primary,marginTop:8}} onClick={sendReport}>Wyślij zgłoszenie</button>
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
  const [list, setList] = useState<{id:number;clientName:string;clientPhone:string;clientEmail:string;serviceName:string|null;preferredDate:string|null;createdAt:string}[]>([]);

  const load = useCallback(() => {
    api.waitlist().then(setList).catch(()=>{});
  }, []);
  useEffect(() => { load(); }, [load]);

  const notify = async (id: number) => {
    await api.notifyWaitlist(id);
    load();
  };

  return (
    <div className="rise">
      <div style={S.sectionHead}>
        <div>
          <h2 style={S.h2}>Lista oczekujących</h2>
          <p style={S.muted}>Klienci, którzy chcą być powiadomieni o wolnym terminie.</p>
        </div>
      </div>

      {!list.length && <div style={S.empty}>Lista jest pusta. Klienci trafią tu, gdy nie znajdą wolnego terminu.</div>}

      <div style={S.card}>
        {list.map(w => (
          <div key={w.id} style={S.apptRow}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700}}>{w.clientName}</div>
              <div style={{fontSize:12.5,color:"#71717a"}}>{w.clientPhone}{w.clientEmail ? ` · ${w.clientEmail}` : ""}</div>
              {w.serviceName && <div style={{fontSize:12.5,color:ACC,marginTop:2}}>{w.serviceName}</div>}
              {w.preferredDate && <div style={{fontSize:12,color:"#a8a2b0"}}>Preferowana data: {w.preferredDate}</div>}
            </div>
            <button style={{...S.miniBtn,color:"#059669"}} title="Oznacz jako powiadomiony" onClick={()=>notify(w.id)}>
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
  list.forEach(s => { (groups[s.grp||"Usługi"] ||= []).push(s); });

  return (
    <div className="rise">
      <div style={S.sectionHead}>
        <div><h2 style={S.h2}>Twoje usługi</h2>
          <p style={S.muted}>Klient widzi je w Twoim profilu i wybiera, na co się umówić.</p></div>
        <button style={S.addBtn}
          onClick={()=>setEditing({grp:"",name:"",description:"",duration:30,price:0})}>
          <Plus size={16}/> Dodaj usługę
        </button>
      </div>

      {!list.length && <div style={S.empty}>Brak usług. Dodaj pierwszą — opis, czas trwania i cenę.</div>}

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
  const [s, setS] = useState<Partial<Service>>(init);
  const set = (k: keyof Service, v: string|number) => setS(p => ({...p,[k]:v}));
  const valid = (s.name||"").trim();
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} className="rise" onClick={e=>e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={{fontWeight:800,fontSize:17}}>{s.id?"Edytuj usługę":"Nowa usługa"}</span>
          <button style={S.iconBtn} onClick={onClose}><X size={18}/></button>
        </div>
        <label style={S.lbl}>Grupa (kolumna) — opcjonalnie</label>
        <input style={S.input} value={s.grp||""} onChange={e=>set("grp",e.target.value)} placeholder="np. Strzyżenie / Broda / Manicure"/>
        <label style={S.lbl}>Nazwa usługi</label>
        <input style={S.input} value={s.name||""} onChange={e=>set("name",e.target.value)} placeholder="np. Strzyżenie męskie" autoFocus/>
        <label style={S.lbl}>Opis</label>
        <textarea style={{...S.input,minHeight:64,resize:"vertical",fontFamily:font}}
          value={s.description||""} onChange={e=>set("description",e.target.value)} placeholder="Krótki opis dla klienta…"/>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={S.lbl}>Czas (min)</label>
            <input style={S.input} type="number" value={s.duration??30} onChange={e=>set("duration",Number(e.target.value))}/></div>
          <div style={{flex:1}}><label style={S.lbl}>Cena (zł)</label>
            <input style={S.input} type="number" value={s.price??0} onChange={e=>set("price",Number(e.target.value))}/></div>
        </div>
        <button style={{...S.primary,marginTop:18,opacity:valid?1:0.5}} disabled={!valid} onClick={()=>onSave(s)}>
          <Save size={16}/> Zapisz
        </button>
      </div>
    </div>
  );
}

/* ========== PROFILE TAB ========== */
function ProfileTab({ biz, setBiz }: { biz: Business|null; setBiz: (b: Business)=>void }) {
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

  return (
    <div className="rise">
      <h2 style={S.h2}>Profil firmy</h2>
      <p style={S.muted}>To widzą klienci. Wszystko możesz zmienić.</p>

      <div style={{...S.bannerPrev,background:BANNERS[form.banner]||BANNERS.violet}}>
        {form.verified && <span style={S.verTag}><BadgeCheck size={13}/> Zweryfikowany</span>}
      </div>
      <div style={S.bannerPick}>
        {Object.keys(BANNERS).map(k => (
          <button key={k} style={{...S.bannerSwatch,background:BANNERS[k],outline:form.banner===k?`3px solid ${ACC}`:"none"}}
            onClick={()=>set("banner",k)}/>
        ))}
      </div>

      <label style={S.lbl}>Nazwa</label>
      <input style={S.input} value={form.name} onChange={e=>set("name",e.target.value)}/>

      <label style={S.lbl}>Kategoria</label>
      <select style={S.input} value={form.category} onChange={e=>set("category",e.target.value)}>
        {meta.categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.pl}</option>)}
      </select>

      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><label style={S.lbl}>Miasto</label>
          <select style={S.input} value={form.city} onChange={e=>{set("city",e.target.value);set("district","");}}>
            <option value="">— wybierz —</option>
            {Object.keys(meta.cities).map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>
        <div style={{flex:1}}><label style={S.lbl}>Dzielnica</label>
          <select style={S.input} value={form.district} onChange={e=>set("district",e.target.value)} disabled={!districts.length}>
            <option value="">— wybierz —</option>
            {districts.map(d=><option key={d} value={d}>{d}</option>)}
          </select></div>
      </div>

      <label style={S.lbl}>Adres</label>
      <Field icon={<MapPin size={15}/>} value={form.address} onChange={v=>set("address",v)} placeholder="ul. Przykładowa 1"/>
      <label style={S.lbl}>Telefon</label>
      <Field icon={<Phone size={15}/>} value={form.phone} onChange={v=>set("phone",v)} placeholder="500 600 700"/>
      <label style={S.lbl}>Instagram</label>
      <Field icon={<Instagram size={15}/>} value={form.instagram} onChange={v=>set("instagram",v)} placeholder="@twojprofil"/>

      <label style={S.lbl}>O nas</label>
      <textarea style={{...S.input,minHeight:70,resize:"vertical",fontFamily:font}}
        value={form.about} onChange={e=>set("about",e.target.value)} placeholder="Opisz swój salon…"/>

      {/* hours editor */}
      <label style={S.lbl}>Godziny pracy</label>
      <div style={S.hoursGrid}>
        {DAYS.map(([key,pl]) => {
          const on = !!(form.hours?.[key]);
          const vals = (form.hours?.[key] || ["09:00","18:00"]) as [string,string];
          return (
            <div key={key} style={S.hoursRow}>
              <button style={{...S.toggle,...(on?S.toggleOn:{})}} onClick={()=>toggleDay(key)}>
                <span style={{...S.knob,...(on?S.knobOn:{})}}/>
              </button>
              <span style={{width:28,fontSize:13,fontWeight:600,color:on?"#1b1420":"#a8a2b0"}}>{pl}</span>
              {on ? (
                <>
                  <input style={S.timeInput} type="time" value={vals[0]} onChange={e=>setHour(key,0,e.target.value)}/>
                  <span style={{color:"#a8a2b0",fontSize:13}}>—</span>
                  <input style={S.timeInput} type="time" value={vals[1]} onChange={e=>setHour(key,1,e.target.value)}/>
                </>
              ) : <span style={{fontSize:12,color:"#c4bece"}}>nieczynne</span>}
            </div>
          );
        })}
      </div>

      {/* portfolio */}
      <label style={S.lbl}>Portfolio (zdjęcia)</label>
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
        <input style={{...S.input,marginBottom:0}} value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} placeholder="Wklej URL zdjęcia…"/>
        <button style={S.addBtn} onClick={()=>{if(photoUrl.trim()){set("photos",[...form.photos,photoUrl.trim()]);setPhotoUrl("");}}}>
          <Plus size={16}/>
        </button>
      </div>
      <p style={S.hint}>Na start — przez URL. W kolejnym etapie dodamy upload plików (Cloudinary).</p>

      {/* booking settings */}
      <div style={S.settingsBox}>
        <div style={S.setRow}>
          <div><div style={S.setName}>Potwierdzanie rezerwacji</div>
            <div style={S.setSub}>Ty ręcznie potwierdzasz każdą wizytę</div></div>
          <button style={{...S.toggle,...(form.confirmRequired?S.toggleOn:{})}} onClick={()=>set("confirmRequired",!form.confirmRequired)}>
            <span style={{...S.knob,...(form.confirmRequired?S.knobOn:{})}}/>
          </button>
        </div>
        <div style={{...S.setRow,borderTop:"1px solid #f0ebf5"}}>
          <div><div style={S.setName}><Bell size={13}/> Przypomnienia (godz. przed wizytą)</div>
            <div style={S.setSub}>Klient dostanie email/SMS</div></div>
          <div style={{display:"flex",gap:6}}>
            {[24,4,2,1].map(h => (
              <button key={h} style={{...S.remChip,...(form.reminderHours.includes(h)?S.remChipOn:{})}}
                onClick={()=>toggleReminder(h)}>{h}h</button>
            ))}
          </div>
        </div>
      </div>

      <button style={{...S.primary,marginTop:20}} onClick={save}>
        {saved?<><Check size={16}/> Zapisano</>:<><Save size={16}/> Zapisz profil</>}
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
