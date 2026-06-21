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

  const btn: React.CSSProperties = {
    background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8,
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf8fb", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        {status === "loading" && <p style={{ color: "#a8a2b0", fontSize: 15 }}>Weryfikacja…</p>}

        {status === "ok" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h1 style={{ color: "#7c3aed", fontSize: 24, marginBottom: 8, fontWeight: 800 }}>Email potwierdzony!</h1>
            <p style={{ color: "#52525b", marginBottom: 24, lineHeight: 1.6 }}>
              Twój profil jest teraz widoczny w wyszukiwarce Rezerwo.
            </p>
            <button onClick={() => navigate("/panel")} style={btn}>Przejdź do panelu</button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h1 style={{ color: "#dc2626", fontSize: 24, marginBottom: 8, fontWeight: 800 }}>Nieprawidłowy link</h1>
            <p style={{ color: "#52525b", marginBottom: 24, lineHeight: 1.6 }}>
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
