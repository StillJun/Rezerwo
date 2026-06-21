import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { MessageSquarePlus, X, Check } from "lucide-react";
import { api } from "../api";
import { useTranslation } from "../i18n";

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";
const ACC = "#7c3aed";

export function FeedbackWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"bug"|"idea"|"other">("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const send = async () => {
    if (!message.trim() || message.trim().length < 5) { setErr("Min. 5 znaków"); return; }
    setBusy(true); setErr("");
    try {
      await api.submitFeedback({ kind, message: message.trim(), email: email.trim(), page: window.location.pathname });
      setSent(true);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const reset = () => { setOpen(false); setSent(false); setMessage(""); setEmail(""); setErr(""); };

  const KINDS = [
    { id: "bug" as const, label: t.feedbackKindBug },
    { id: "idea" as const, label: t.feedbackKindIdea },
    { id: "other" as const, label: t.feedbackKindOther },
  ];

  return (
    <div ref={ref} style={S.wrap}>
      {open && (
        <div style={S.panel}>
          <div style={S.head}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{t.feedbackTitle}</span>
            <button style={S.close} onClick={reset}><X size={16}/></button>
          </div>

          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={S.successIcon}><Check size={22} color="#fff"/></div>
              <p style={{ marginTop: 10, fontSize: 14, color: "#52525b" }}>{t.feedbackSent}</p>
            </div>
          ) : (
            <>
              <div style={S.kindRow}>
                {KINDS.map(k => (
                  <button key={k.id} style={{ ...S.kindBtn, ...(kind === k.id ? S.kindBtnOn : {}) }}
                    onClick={() => setKind(k.id)}>{k.label}</button>
                ))}
              </div>

              <label style={S.lbl}>{t.feedbackMsg}</label>
              <textarea
                style={{ ...S.input, minHeight: 80, resize: "vertical" as const, fontFamily: font }}
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Opisz…" autoFocus/>

              <label style={S.lbl}>{t.feedbackEmail}</label>
              <input style={S.input} type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="twoj@email.com"/>

              {err && <div style={S.err}>{err}</div>}

              <button style={S.btn} onClick={send} disabled={busy}>
                {busy ? "…" : t.feedbackSend}
              </button>
            </>
          )}
        </div>
      )}

      <button style={S.fab} onClick={() => setOpen(v => !v)} title={t.feedbackBtn}>
        <MessageSquarePlus size={20} color="#fff"/>
      </button>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap:       { position: "fixed", bottom: 20, right: 20, zIndex: 500, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 },
  fab:        { width: 48, height: 48, borderRadius: 999, border: "none", background: `linear-gradient(135deg,${ACC},#ec4899)`, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 4px 20px #7c3aed44" },
  panel:      { background: "#fff", borderRadius: 18, padding: "16px", boxShadow: "0 8px 40px #1b142022", width: 300, maxHeight: "80vh", overflowY: "auto" },
  head:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  close:      { border: "none", background: "transparent", cursor: "pointer", color: "#a8a2b0", padding: 4 },
  kindRow:    { display: "flex", gap: 6, marginBottom: 12 },
  kindBtn:    { padding: "6px 12px", borderRadius: 8, border: "1.5px solid #ece8f0", background: "#faf8fb", fontSize: 12, fontWeight: 600, color: "#71717a", cursor: "pointer", fontFamily: font },
  kindBtnOn:  { background: ACC, color: "#fff", borderColor: ACC },
  lbl:        { fontSize: 12, fontWeight: 600, color: "#52525b", display: "block", marginBottom: 5 },
  input:      { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #ece8f0", fontSize: 13.5, outline: "none", background: "#faf8fb", boxSizing: "border-box" as const, fontFamily: font, marginBottom: 8 },
  err:        { fontSize: 12, color: "#dc2626", marginBottom: 8 },
  btn:        { width: "100%", padding: "11px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${ACC},#ec4899)`, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: font, marginTop: 4 },
  successIcon:{ width: 44, height: 44, borderRadius: 999, background: `linear-gradient(135deg,${ACC},#ec4899)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" },
};
