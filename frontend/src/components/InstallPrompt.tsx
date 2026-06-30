import { useEffect, useState } from "react";

const LS_KEY = "rz_install_dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|edios|chrome/i.test(ua);
  return isIos && isSafari;
}

type Mode = "android" | "ios" | null;

export function InstallPrompt() {
  const [mode, setMode]       = useState<Mode>(null);
  const [visible, setVisible] = useState(false);
  const [deferredEvt, setDeferredEvt] = useState<Event | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(LS_KEY)) return;

    // Android/Chrome — catch beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvt(e);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari — show hint after a short delay on first interaction
    if (isIosSafari()) {
      const show = () => {
        if (!localStorage.getItem(LS_KEY) && !isStandalone()) {
          setMode("ios");
          setVisible(true);
        }
        window.removeEventListener("touchend", show);
      };
      window.addEventListener("touchend", show, { once: true });
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Show Android banner after first user interaction
  useEffect(() => {
    if (mode !== "android" || !deferredEvt) return;
    const show = () => {
      setVisible(true);
      window.removeEventListener("pointerup", show);
    };
    window.addEventListener("pointerup", show, { once: true });
  }, [mode, deferredEvt]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(LS_KEY, "1");
  };

  const install = async () => {
    if (!deferredEvt) return;
    (deferredEvt as BeforeInstallPromptEvent).prompt();
    const { outcome } = await (deferredEvt as BeforeInstallPromptEvent).userChoice;
    if (outcome === "accepted") localStorage.setItem(LS_KEY, "1");
    setVisible(false);
  };

  if (!visible || !mode) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      width: "min(calc(100vw - 32px), 400px)",
      background: "#fff", borderRadius: 18, padding: "14px 16px",
      boxShadow: "0 8px 32px #1b142018, 0 2px 8px #1b142010",
      zIndex: 9999, display: "flex", alignItems: "flex-start", gap: 12,
      border: "1.5px solid #efe9ee",
    }}>
      {/* Logo R */}
      <div style={{
        flexShrink: 0, width: 42, height: 42, borderRadius: 10,
        background: "linear-gradient(135deg,#7c3aed,#d6409f,#ff7a59)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "system-ui,sans-serif",
      }}>R</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1b1420", marginBottom: 3 }}>
          Zainstaluj aplikację Rezerwo
        </div>
        {mode === "android" ? (
          <>
            <p style={{ fontSize: 12.5, color: "#71717a", margin: "0 0 10px" }}>
              Szybki dostęp do rezerwacji prosto z ekranu głównego.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={install} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#d6409f)",
                color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
                Zainstaluj
              </button>
              <button onClick={dismiss} style={{
                padding: "8px 14px", borderRadius: 10, border: "1.5px solid #efe9ee",
                background: "transparent", color: "#71717a", fontWeight: 600,
                fontSize: 13, cursor: "pointer",
              }}>
                Nie teraz
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: "#71717a", margin: "0 0 4px" }}>
              Naciśnij <strong>Udostępnij</strong> <span style={{ fontSize: 14 }}>⬆️</span> na dole ekranu,
              potem wybierz <strong>Dodaj do ekranu&nbsp;początk.</strong>
            </p>
          </>
        )}
      </div>

      <button onClick={dismiss} style={{
        flexShrink: 0, background: "none", border: "none", cursor: "pointer",
        color: "#a8a2b0", fontSize: 18, lineHeight: 1, padding: "2px 4px",
      }} aria-label="Zamknij">×</button>
    </div>
  );
}

// Minimal TS augmentation for the deferred event
interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
