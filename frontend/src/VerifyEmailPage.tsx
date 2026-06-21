import { useState, useEffect } from "react";
import { api } from "./api";
import { navigate } from "./App";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); return; }
    api.verifyEmail(token).then(() => setStatus("ok")).catch(() => setStatus("error"));
  }, []);

  const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";
  const btn: React.CSSProperties = {
    background: GRAD, color: "#fff", border: "none", borderRadius: 999,
    padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12,
    boxShadow: "0 6px 20px rgba(124,58,237,.35)", fontFamily: "'Inter',system-ui,sans-serif",
  };
  const MESH = "radial-gradient(ellipse 700px 500px at 50% 20%, rgba(124,58,237,.055) 0%, transparent 65%), #fbf7f4";

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: MESH, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: 32, background: "#fff", borderRadius: 26, border: "1px solid #efe9ee", boxShadow: "0 8px 40px rgba(26,19,32,.08)" }}>
        {status === "loading" && <p style={{ color: "#8b8194", fontSize: 15 }}>Weryfikacja…</p>}

        {status === "ok" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h1 style={{ color: "#7c3aed", fontSize: 24, marginBottom: 8, fontWeight: 500, fontFamily: "'Fraunces',Georgia,serif", letterSpacing: "-0.02em" }}>Email potwierdzony!</h1>
            <p style={{ color: "#52525b", marginBottom: 24, lineHeight: 1.6, fontSize: 15 }}>
              Twój profil jest teraz widoczny w wyszukiwarce Rezerwo.
            </p>
            <button onClick={() => navigate("/panel")} style={btn}>Przejdź do panelu</button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h1 style={{ color: "#dc2626", fontSize: 24, marginBottom: 8, fontWeight: 500, fontFamily: "'Fraunces',Georgia,serif", letterSpacing: "-0.02em" }}>Nieprawidłowy link</h1>
            <p style={{ color: "#52525b", marginBottom: 24, lineHeight: 1.6, fontSize: 15 }}>
              Link weryfikacyjny jest nieprawidłowy lub już został wykorzystany.
              Zaloguj się do panelu i wyślij link ponownie.
            </p>
            <button onClick={() => navigate("/panel")} style={btn}>Panel właściciela</button>
          </>
        )}
      </div>
    </div>
  );
}
