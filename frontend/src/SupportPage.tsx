import { useState } from "react";
import type { CSSProperties } from "react";
import { navigate } from "./App";
import { api } from "./api";
import { useTranslation } from "./i18n";
import { Check } from "lucide-react";

const font = "'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";
const ACC  = "#7c3aed";
const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";

export default function SupportPage() {
  const { t } = useTranslation();
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);

  const send = async () => {
    if (!email.trim() || !subject.trim() || !message.trim()) {
      setErr("Wypełnij wszystkie pola."); return;
    }
    setBusy(true); setErr("");
    try {
      await api.submitSupport({ email: email.trim(), subject: subject.trim(), message: message.trim() });
      setSent(true);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate("/")}>← Rezerwo</button>
        <h1 style={S.h1}>{t.supportTitle}</h1>
        <p style={S.sub}>{t.supportSub}</p>

        {sent ? (
          <div style={S.successBox}>
            <div style={S.successIcon}><Check size={28} color="#fff"/></div>
            <p style={{marginTop:14,fontSize:16,fontWeight:700,color:"#1b1420"}}>{t.supportSuccess}</p>
            <button style={S.btn} onClick={() => navigate("/")}>{t.back}</button>
          </div>
        ) : (
          <div style={S.card}>
            <label style={S.lbl}>{t.emailField}</label>
            <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="twoj@email.com" autoFocus/>

            <label style={S.lbl}>{t.subject}</label>
            <input style={S.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="np. Problem z rezerwacją"/>

            <label style={S.lbl}>{t.message}</label>
            <textarea style={{...S.input, minHeight:120, resize:"vertical" as const, fontFamily:font}}
              value={message} onChange={e => setMessage(e.target.value)} placeholder="Opisz swój problem lub pytanie…"/>

            {err && <div style={S.err}>{err}</div>}

            <button className="btn-primary" style={S.btn} onClick={send} disabled={busy}>
              {busy ? "…" : t.send}
            </button>
          </div>
        )}

        <div style={S.faq}>
          <h2 style={S.faqTitle}>FAQ</h2>
          {FAQ.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={S.faqItem} onClick={() => setOpen(v => !v)}>
      <div style={S.faqQ}>
        <span>{q}</span>
        <span style={{color:ACC, fontSize:18, fontWeight:700}}>{open ? "−" : "+"}</span>
      </div>
      {open && <p style={S.faqA}>{a}</p>}
    </div>
  );
}

const FAQ = [
  {
    q: "Jak anulować rezerwację?",
    a: "Skontaktuj się telefonicznie lub przez Instagram bezpośrednio z salonem. Kontakt znajdziesz na stronie profilu salonu w Rezerwo.",
  },
  {
    q: "Nie otrzymałem/am potwierdzenia wizity.",
    a: "Salon może wymagać ręcznego potwierdzenia. Poczekaj na kontakt od salonu lub sprawdź, czy podałeś/aś prawidłowy numer telefonu.",
  },
  {
    q: "Chcę usunąć swoje dane osobowe.",
    a: "Napisz do nas na adres privacy@rezerwo.app z prośbą o usunięcie danych. Zrealizujemy żądanie w ciągu 30 dni.",
  },
  {
    q: "Jak dodać mój salon do Rezerwo?",
    a: "Kliknij 'Panel właściciela' na stronie głównej i załóż konto. Twój profil zostanie aktywowany natychmiast.",
  },
  {
    q: "Czy Rezerwo jest płatne?",
    a: "Rezerwo jest bezpłatne na etapie beta. W przyszłości pojawią się płatne funkcje premium, ale podstawowa wersja pozostanie darmowa.",
  },
];

const S: Record<string, CSSProperties> = {
  page:       { minHeight:"100vh", background:"radial-gradient(ellipse 800px 500px at 15% 30%, rgba(124,58,237,.045) 0%, transparent 65%), #fbf7f4", fontFamily:font, padding:"0 20px 60px" },
  wrap:       { maxWidth:600, margin:"0 auto", paddingTop:20 },
  back:       { border:"1.5px solid #efe9ee", background:"#fff", color:ACC, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:font, padding:"7px 16px", borderRadius:999, marginBottom:28, display:"inline-flex", alignItems:"center", gap:6 },
  h1:         { fontSize:"clamp(22px,4vw,34px)", fontWeight:500, letterSpacing:"-0.03em", color:"#1a1320", margin:"0 0 6px", fontFamily:"'Fraunces',Georgia,serif" },
  sub:        { fontSize:15, color:"#8b8194", margin:"0 0 24px" },
  card:       { background:"#fff", borderRadius:22, padding:"24px", boxShadow:"0 2px 8px rgba(26,19,32,.05)", border:"1px solid #efe9ee", marginBottom:32 },
  lbl:        { fontSize:12.5, fontWeight:600, color:"#52525b", display:"block", margin:"12px 0 6px" },
  input:      { width:"100%", padding:"12px 14px", borderRadius:14, border:"1.5px solid #efe9ee", fontSize:14.5, outline:"none", background:"#fbf7f4", marginBottom:4, boxSizing:"border-box" as const, fontFamily:font, color:"#1a1320" },
  err:        { background:"#fef2f2", color:"#dc2626", fontSize:13, padding:"10px 12px", borderRadius:10, marginBottom:8, textAlign:"center" as const },
  btn:        { width:"100%", marginTop:14, display:"flex", justifyContent:"center", alignItems:"center", gap:8, background:GRAD, color:"#fff", border:"none", borderRadius:999, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:font, boxShadow:"0 6px 20px rgba(124,58,237,.35)" },
  successBox: { textAlign:"center" as const, padding:"40px 20px", background:"#fff", borderRadius:22, border:"1px solid #efe9ee", marginBottom:32 },
  successIcon:{ width:56, height:56, borderRadius:999, background:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", boxShadow:"0 4px 18px rgba(124,58,237,.36)" },
  faq:        { marginTop:8 },
  faqTitle:   { fontSize:18, fontWeight:500, margin:"0 0 14px", fontFamily:"'Fraunces',Georgia,serif", color:"#1a1320" },
  faqItem:    { background:"#fff", borderRadius:16, padding:"14px 18px", marginBottom:8, cursor:"pointer", border:"1px solid #efe9ee" },
  faqQ:       { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:14.5, fontWeight:600, gap:12, color:"#1a1320" },
  faqA:       { fontSize:14, color:"#52525b", margin:"10px 0 0", lineHeight:1.6 },
};
