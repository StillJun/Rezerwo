import { useState, useEffect, lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { InstallPrompt } from "./components/InstallPrompt";
import { ToastHost } from "./components/Toast";

class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", fontFamily:"sans-serif", textAlign:"center", color:"#52525b" }}>
        <div>
          <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
          <div style={{ fontWeight:700, marginBottom:6 }}>Coś poszło nie tak</div>
          <div style={{ fontSize:13, color:"#a8a2b0", marginBottom:20 }}>Odśwież stronę lub wróć później.</div>
          <button onClick={() => window.location.reload()}
            style={{ padding:"10px 24px", borderRadius:999, background:"#7c3aed", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:14 }}>
            Odśwież
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const PanelPage                 = lazy(() => import("./PanelPage"));
const MarketplacePage           = lazy(() => import("./MarketplacePage"));
const BusinessPage              = lazy(() => import("./BusinessPage"));
const AdminPage                 = lazy(() => import("./AdminPage"));
const TermsPage                 = lazy(() => import("./TermsPage"));
const PrivacyPage               = lazy(() => import("./PrivacyPage"));
const SupportPage               = lazy(() => import("./SupportPage"));
const VerifyEmailPage           = lazy(() => import("./VerifyEmailPage"));
const RegulaminPage             = lazy(() => import("./RegulaminPage"));
const PolitykaPrywatnosciPage   = lazy(() => import("./PolitykaPrywatnosciPage"));
const ManageBookingPage         = lazy(() => import("./ManageBookingPage"));

export function navigate(to: string) {
  history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const h = () => setPath(window.location.pathname);
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  useEffect(() => {
    const named: Record<string, string> = {
      "/panel": "Panel — Rezerwo",
      "/admin": "Admin — Rezerwo",
      "/pomoc": "Pomoc — Rezerwo",
      "/regulamin": "Regulamin — Rezerwo",
      "/polityka-prywatnosci": "Polityka prywatności — Rezerwo",
      "/verify-email": "Rezerwo",
    };
    // BusinessPage / ManageBookingPage set their own title once loaded
    if (path.startsWith("/wizyta/")) return;
    if (named[path]) { document.title = named[path]; return; }
    if (path === "/" || path.slice(1).includes("/")) document.title = "Rezerwo — rezerwacje online";
  }, [path]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{minHeight:"100vh",display:"grid",placeItems:"center",color:"#a8a2b0",fontFamily:"sans-serif"}}>…</div>}>
        {path === "/panel"                    ? <PanelPage /> :
         path === "/admin"                   ? <AdminPage /> :
         path === "/"                        ? <MarketplacePage /> :
         path === "/verify-email"            ? <VerifyEmailPage /> :
         path === "/regulamin"               ? <RegulaminPage /> :
         path === "/polityka-prywatnosci"    ? <PolitykaPrywatnosciPage /> :
         path === "/prywatnosc"              ? <PrivacyPage /> :
         path === "/pomoc"                   ? <SupportPage /> :
         path.startsWith("/wizyta/")         ? <ManageBookingPage token={decodeURIComponent(path.slice(8))} /> :
         (() => {
           const slug = path.slice(1);
           return slug && !slug.includes("/") ? <BusinessPage slug={slug} /> : <MarketplacePage />;
         })()}
      </Suspense>
      <FeedbackWidget />
      <InstallPrompt />
      <ToastHost />
    </ErrorBoundary>
  );
}
