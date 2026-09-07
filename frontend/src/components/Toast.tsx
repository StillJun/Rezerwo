import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/* Tiny app-wide toast. Imperative API (`showToast("…")`) so any handler —
   even outside React — can fire one. Mount <ToastHost/> once near the app root. */

type ToastDetail = { message: string; tone: "ok" | "err" };
const EVT = "rz-toast";

export function showToast(message: string, tone: "ok" | "err" = "ok") {
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVT, { detail: { message, tone } }));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastDetail | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      setToast(detail);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener(EVT, onToast);
    return () => { window.removeEventListener(EVT, onToast); clearTimeout(timer); };
  }, []);

  if (!toast) return null;
  return (
    <div style={S.wrap} role="status" aria-live="polite">
      <div style={{ ...S.toast, ...(toast.tone === "err" ? S.err : S.ok) }}>
        {toast.message}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrap:  { position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", zIndex: 200, pointerEvents: "none", padding: "0 16px" },
  toast: { maxWidth: 420, padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "#fff", boxShadow: "0 12px 40px rgba(0,0,0,.22)", textAlign: "center", animation: "rise .25s ease both" },
  ok:    { background: "linear-gradient(115deg,#7c3aed,#e0399e)" },
  err:   { background: "#dc2626" },
};
