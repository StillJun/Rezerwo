import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  MapPin, Phone, Instagram, Clock, ChevronLeft,
  BadgeCheck, X, Check, MessageSquarePlus, ArrowLeft,
} from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { PublicBusiness, PublicService, BookingResult, Review } from "./types";
import { useTranslation } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";

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
function isoToday() { return new Date().toISOString().slice(0,10); }
function addDays(base: string, n: number) {
  const d = new Date(base + "T00:00:00"); d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function formatDate(d: string, months: string[]) {
  const [y,m,dd] = d.split("-");
  return `${dd} ${months[Number(m)]} ${y}`;
}

/* ========== BOOKING WIZARD ========== */
type WizardStep = "service"|"date"|"slots"|"details"|"done";

interface WizardState {
  service: PublicService|null;
  date: string;
  slot: number|null;
  name: string;
  phone: string;
  email: string;
  comment: string;
}

function BookingWizard({ biz, initService, onClose }: {
  biz: PublicBusiness;
  initService: PublicService|null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>(initService?"date":"service");
  const [state, setState] = useState<WizardState>({
    service: initService, date: isoToday(), slot: null,
    name:"",phone:"",email:"",comment:"",
  });
  const [slots, setSlots] = useState<{ mins: number[]; times: string[] }>({ mins:[], times:[] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<BookingResult|null>(null);
  const [bookingTerms, setBookingTerms] = useState(false);

  const set = (k: keyof WizardState, v: unknown) => setState(p=>({...p,[k]:v}));

  // Load slots when date/service changes
  useEffect(() => {
    if (step!=="slots"||!state.service||!state.date) return;
    setSlotsLoading(true); setSlots({mins:[],times:[]});
    api.slots(biz.slug, state.date, state.service.id)
      .then(d=>setSlots({mins:d.slots,times:d.slotTimes}))
      .catch(()=>setSlots({mins:[],times:[]}))
      .finally(()=>setSlotsLoading(false));
  }, [step, state.service, state.date, biz.slug]);

  const book = async () => {
    if (!state.service||state.slot==null||!state.name.trim()||!state.phone.trim()) {
      setErr("Wypełnij wszystkie wymagane pola."); return;
    }
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
      });
      setResult(r); setStep("done");
    } catch(e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const services = biz.services||[];
  const groups: Record<string,PublicService[]> = {};
  services.forEach(s=>{ (groups[s.grp||"Usługi"]||=[]).push(s); });

  const stepNum = {service:1,date:2,slots:3,details:4,done:5}[step]||1;
  const totalSteps = 4;

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        {/* wizard header */}
        <div style={S.wizHead}>
          {step!=="done" && stepNum>1 && (
            <button style={S.backBtn} onClick={()=>{
              const prev: Record<WizardStep,WizardStep> = {service:"service",date:"service",slots:"date",details:"slots",done:"done"};
              setStep(prev[step]);
            }}>
              <ChevronLeft size={16}/>
            </button>
          )}
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:ACC}}>{biz.name}</div>
            {step!=="done" && (
              <div style={{fontSize:11.5,color:"#a8a2b0"}}>{t.step(stepNum, totalSteps)}</div>
            )}
          </div>
          <button style={S.closeBtn} onClick={onClose}><X size={18}/></button>
        </div>

        {/* progress bar */}
        {step!=="done" && (
          <div style={S.progress}>
            <div style={{...S.progressFill,width:`${(stepNum/totalSteps)*100}%`}}/>
          </div>
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
                      onClick={()=>{ set("service",s); set("slot",null); setStep("date"); }}>
                      <div style={{flex:1,textAlign:"left"}}>
                        <div style={{fontSize:14,fontWeight:700}}>{s.name}</div>
                        {s.description&&<div style={{fontSize:12.5,color:"#71717a",marginTop:2}}>{s.description}</div>}
                        <div style={{fontSize:12,color:"#a8a2b0",marginTop:3,display:"flex",gap:8}}>
                          <span><Clock size={10}/> {s.duration} min</span>
                        </div>
                      </div>
                      <div style={{fontWeight:800,color:ACC,fontSize:15,flexShrink:0}}>{s.price} zł</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!services.length && (
              <div style={S.empty}>{t.noServices}</div>
            )}
          </div>
        )}

        {/* STEP: choose date */}
        {step==="date" && state.service && (
          <div>
            <h3 style={S.stepTitle}>{t.chooseDate}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {state.service.duration} min · {state.service.price} zł</span>
            </div>

            <div style={S.datePicker} className="date-picker">
              {Array.from({length:14},(_,i)=>{
                const d = addDays(isoToday(),i);
                const dt = new Date(d+"T00:00:00");
                const dayNames = t.dayNames;
                const months  = t.months.slice(1);
                const selected = state.date===d;
                return (
                  <button key={d} className="date-chip" style={{...S.dateChip,...(selected?S.dateChipOn:{})}}
                    onClick={()=>{ set("date",d); set("slot",null); setStep("slots"); }}>
                    <span style={{fontSize:11,opacity:0.7}}>{dayNames[dt.getDay()]}</span>
                    <span style={{fontSize:17,fontWeight:800,lineHeight:1}}>{dt.getDate()}</span>
                    <span style={{fontSize:11,opacity:0.7}}>{months[dt.getMonth()]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP: choose slot */}
        {step==="slots" && state.service && (
          <div>
            <h3 style={S.stepTitle}>{t.chooseTime}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {formatDate(state.date, t.months)}</span>
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
            {!slotsLoading && slots.mins.length>0 && (
              <div style={S.slotGrid} className="slot-grid">
                {slots.mins.map((m,i)=>(
                  <button key={m} className="slot-btn" style={{...S.slotBtn,...(state.slot===m?S.slotBtnOn:{})}}
                    onClick={()=>{ set("slot",m); setStep("details"); }}>
                    {slots.times[i]}
                  </button>
                ))}
              </div>
            )}
            <button style={S.textBtn} onClick={()=>setStep("date")}>
              <ChevronLeft size={14}/> {t.chooseDate}
            </button>
          </div>
        )}

        {/* STEP: fill details */}
        {step==="details" && state.service && state.slot!=null && (
          <div>
            <h3 style={S.stepTitle}>{t.yourData}</h3>
            <div style={S.svcSummary}>
              <span style={{fontWeight:700}}>{state.service.name}</span>
              <span style={{color:"#a8a2b0"}}> · {formatDate(state.date, t.months)}, {minToTime(state.slot)}</span>
            </div>

            <label style={S.lbl}>{t.fullName}</label>
            <input style={S.input} value={state.name} onChange={e=>set("name",e.target.value)}
              placeholder="Jan Kowalski" autoFocus/>

            <label style={S.lbl}>{t.phone}</label>
            <input style={S.input} value={state.phone} onChange={e=>set("phone",e.target.value)}
              placeholder="+48 500 600 700" type="tel"/>

            <label style={S.lbl}>{t.email}</label>
            <input style={S.input} value={state.email} onChange={e=>set("email",e.target.value)}
              placeholder="jan@example.com" type="email"/>

            <label style={S.lbl}>{t.commentSalon}</label>
            <textarea style={{...S.input,minHeight:64,resize:"vertical" as const,fontFamily:font}}
              value={state.comment} onChange={e=>set("comment",e.target.value)}
              placeholder={t.commentSalonPlaceholder}/>

            <label style={{ display:"flex", alignItems:"flex-start", gap:10, margin:"12px 0 8px", cursor:"pointer" }}>
              <input
                type="checkbox"
                checked={bookingTerms}
                onChange={e => setBookingTerms(e.target.checked)}
                style={{ marginTop:3, accentColor:"#7c3aed", flexShrink:0, width:16, height:16 }}
              />
              <span style={{ fontSize:12.5, color:"#52525b", lineHeight:1.6 }}>
                Akceptuję{" "}
                <a href="/regulamin" target="_blank" rel="noopener noreferrer" style={{ color:"#7c3aed", fontWeight:600 }}>Regulamin</a>
                {" "}i{" "}
                <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" style={{ color:"#7c3aed", fontWeight:600 }}>Politykę prywatności</a>.
                {" "}Przyjmuję do wiadomości, że moje dane (imię, numer telefonu i szczegóły rezerwacji) zostaną przekazane wybranemu usługodawcy w celu realizacji wizyty.
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
            <button style={{...S.primary,marginTop:20}} onClick={onClose}>{t.backToProfile}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== SERVICE REQUEST MODAL ========== */
function ServiceRequestModal({ biz, onClose }: { biz: PublicBusiness; onClose: ()=>void }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!phone.trim()||!text.trim()) { setErr(t.phoneField.replace(" *","") + " / " + t.whatLooking.replace(" *","")); return; }
    setErr("");
    try {
      await api.serviceRequest(biz.slug, { client_phone: phone.trim(), text: text.trim() });
      setSent(true);
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.wizHead}>
          <div style={{flex:1,fontWeight:800,fontSize:16}}>{t.askTitle}</div>
          <button style={S.closeBtn} onClick={onClose}><X size={18}/></button>
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
            <input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+48 500 600 700" type="tel" autoFocus/>
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
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.reviews(slug).then(d => { setReviews(d.reviews); setAvg(d.avg); }).catch(()=>{});
  }, [slug]);

  const submit = async () => {
    if (!name.trim()) { setErr("Podaj swoje imię."); return; }
    setErr("");
    try {
      await api.addReview(slug, { client_name: name.trim(), rating, text: text.trim() });
      setSent(true);
      api.reviews(slug).then(d => { setReviews(d.reviews); setAvg(d.avg); }).catch(()=>{});
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={S.sectionTitle}>{t.reviews}</div>
        {avg !== null && (
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Stars rating={Math.round(avg)} size={15}/>
            <span style={{fontWeight:700,fontSize:14}}>{avg.toFixed(1)}</span>
            <span style={{fontSize:12,color:"#a8a2b0"}}>({reviews.length})</span>
          </div>
        )}
      </div>

      {!reviews.length && <div style={S.empty}>{t.noReviews}</div>}

      <div style={{display:"flex",flexDirection:"column" as const,gap:10,marginBottom:14}}>
        {reviews.slice(0,5).map(r => (
          <div key={r.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px #1b142008"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:14}}>{r.clientName}</span>
              <Stars rating={r.rating}/>
            </div>
            {r.text && <p style={{fontSize:13.5,color:"#52525b",margin:0,lineHeight:1.5}}>{r.text}</p>}
            <div style={{fontSize:11.5,color:"#c4bdd0",marginTop:6}}>{String(r.createdAt).slice(0,10)}</div>
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
          <label style={S.lbl}>{t.rating}</label>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={()=>setRating(i)}
                style={{fontSize:24,background:"none",border:"none",cursor:"pointer",
                  color:i<=rating?"#f59e0b":"#e5e7eb",padding:"0 2px"}}>★</button>
            ))}
          </div>
          <label style={S.lbl}>{t.firstName}</label>
          <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Jan K."/>
          <label style={S.lbl}>{t.comment}</label>
          <textarea style={{...S.input,minHeight:64,resize:"vertical" as const,fontFamily:font}}
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!name.trim() || !phone.trim()) { setErr("Imię i telefon są wymagane."); return; }
    setErr("");
    try {
      await api.joinWaitlist(biz.slug, {
        service_id: service?.id,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        preferred_date: date || undefined,
      });
      setSent(true);
    } catch(e) { setErr((e as Error).message); }
  };

  return (
    <div style={S.overlay} className="overlay-sheet" onClick={onClose}>
      <div style={S.wizard} className="rise wizard-sheet" onClick={e=>e.stopPropagation()}>
        <div style={S.wizHead}>
          <div style={{flex:1,fontWeight:800,fontSize:16}}>{t.waitlistTitle}</div>
          <button style={S.closeBtn} onClick={onClose}><X size={18}/></button>
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
            <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Jan Kowalski" autoFocus/>
            <label style={S.lbl}>{t.phone}</label>
            <input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+48 500 600 700" type="tel"/>
            <label style={S.lbl}>{t.email}</label>
            <input style={S.input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="jan@example.com" type="email"/>
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

  useEffect(() => {
    api.publicBusiness(slug)
      .then(d=>{ setBiz(d); setLoading(false); })
      .catch(()=>{ setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return <div style={S.center}>…</div>;
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
  services.forEach(s=>{ (groups[s.grp||"Usługi"]||=[]).push(s); });

  const workingDays = DAY_ORDER.filter(d=>biz.hours?.[d]);
  const DAY_PL = t.days;

  return (
    <div style={S.page}>
      {/* back nav */}
      <div style={S.navBar}>
        <button style={S.navBack} onClick={()=>navigate("/")}>
          <ArrowLeft size={16}/> {t.back}
        </button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <LangDropdown/>
        </div>
      </div>

      {/* banner */}
      <div className="biz-banner" style={{...S.banner,background:BANNERS[biz.banner]||BANNERS.violet}}>
        {biz.photos && biz.photos.length>0 && (
          <img src={biz.photos[photoIdx]} alt="" style={S.bannerPhoto}
            onError={e=>(e.currentTarget.style.display="none")}/>
        )}
        {biz.photos && biz.photos.length>1 && (
          <div style={S.photoDots}>
            {biz.photos.map((_,i)=>(
              <button key={i} style={{...S.photoDot,...(i===photoIdx?S.photoDotOn:{})}} onClick={()=>setPhotoIdx(i)}/>
            ))}
          </div>
        )}
      </div>

      <div style={S.content}>
        {/* business header */}
        <div style={S.bizHead}>
          <div>
            <div style={S.bizName}>
              {biz.name}
              {biz.verified && <span style={S.verBadge}><BadgeCheck size={16}/></span>}
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
          </div>
        </div>

        {/* about */}
        {biz.about && <p style={S.about}>{biz.about}</p>}

        {/* contact info */}
        <div style={S.infoRow}>
          {biz.address && (
            <div style={S.infoChip}><MapPin size={13}/> {biz.address}</div>
          )}
          {biz.phone && (
            <a href={`tel:${biz.phone}`} style={{...S.infoChip,textDecoration:"none"}}>
              <Phone size={13}/> {biz.phone}
            </a>
          )}
          {biz.instagram && (
            <div style={S.infoChip}><Instagram size={13}/> {biz.instagram}</div>
          )}
        </div>

        {/* working hours */}
        {workingDays.length>0 && (
          <div style={S.hoursBox}>
            <div style={S.sectionTitle}>{t.hours}</div>
            <div style={S.hoursGrid}>
              {workingDays.map(d=>{
                const h = biz.hours[d] as [string,string];
                return (
                  <div key={d} style={S.hoursRow}>
                    <span style={{fontWeight:600,minWidth:28}}>{DAY_PL[d as keyof typeof DAY_PL]}</span>
                    <span style={{color:"#52525b"}}>{h[0]} — {h[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* services */}
        <div style={S.sectionTitle}>{t.services}</div>
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
                      <span><Clock size={11}/> {s.duration} min</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column" as const,alignItems:"flex-end",gap:6}}>
                    <span style={{fontSize:15,fontWeight:800,color:ACC}}>{s.price} zł</span>
                    <button style={S.bookBtn} onClick={()=>setBooking(s)}>{t.book}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA + service request + waitlist */}
        <div style={S.ctaBox}>
          <button className="btn-primary" style={S.ctaMain} onClick={()=>setBooking(services[0]||null)}>
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
        <ReviewsSection slug={slug}/>
      </div>

      {/* modals */}
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
  svcSummary: { background:"#f4f0f8", borderRadius:12, padding:"9px 14px", fontSize:13, marginBottom:14, color:"#1a1320" },

  datePicker: { display:"flex", gap:8, overflowX:"auto" as const, paddingBottom:8, marginBottom:4 },
  dateChip:   { display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3, padding:"10px 12px", borderRadius:14, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", minWidth:56, fontFamily:font },
  dateChipOn: { background:ACC, color:"#fff", borderColor:ACC },

  slotGrid:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 },
  slotBtn:    { padding:"11px 0", borderRadius:12, border:"1.5px solid #efe9ee", background:"#fbf7f4", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:font, color:"#1a1320" },
  slotBtnOn:  { background:ACC, color:"#fff", borderColor:ACC },
  textBtn:    { display:"flex", alignItems:"center", gap:4, border:"none", background:"transparent", color:ACC, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px 0" },

  lbl:    { fontSize:12.5, fontWeight:600, color:"#52525b", display:"block", margin:"12px 0 6px" },
  input:  { width:"100%", padding:"12px 14px", borderRadius:14, border:"1.5px solid #efe9ee", fontSize:14.5, outline:"none", background:"#fbf7f4", marginBottom:4, boxSizing:"border-box" as const, fontFamily:font, color:"#1a1320" },
  err:    { background:"#fef2f2", color:"#dc2626", fontSize:13, padding:"10px 12px", borderRadius:10, marginBottom:8, textAlign:"center" as const },
  hint:   { fontSize:12, color:"#8b8194", textAlign:"center" as const, marginTop:8 },
  primary:{ width:"100%", marginTop:12, display:"flex", justifyContent:"center", alignItems:"center", gap:8, background:GRAD, color:"#fff", border:"none", borderRadius:999, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:font, boxShadow:"0 6px 20px rgba(124,58,237,.35)" },

  successIcon:{ width:60, height:60, borderRadius:999, background:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", boxShadow:"0 4px 20px rgba(124,58,237,.40)" },
};
