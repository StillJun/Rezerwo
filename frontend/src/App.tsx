import { useState, useEffect, lazy, Suspense } from "react";
import { FeedbackWidget } from "./components/FeedbackWidget";

const PanelPage       = lazy(() => import("./PanelPage"));
const MarketplacePage = lazy(() => import("./MarketplacePage"));
const BusinessPage    = lazy(() => import("./BusinessPage"));
const AdminPage       = lazy(() => import("./AdminPage"));
const TermsPage       = lazy(() => import("./TermsPage"));
const PrivacyPage     = lazy(() => import("./PrivacyPage"));
const SupportPage     = lazy(() => import("./SupportPage"));
const VerifyEmailPage = lazy(() => import("./VerifyEmailPage"));

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

  useEffect(() => { document.title = "Rezerwo"; }, []);

  return (
    <>
      <Suspense fallback={<div style={{minHeight:"100vh",display:"grid",placeItems:"center",color:"#a8a2b0",fontFamily:"sans-serif"}}>…</div>}>
        {path === "/panel"        ? <PanelPage /> :
         path === "/admin"       ? <AdminPage /> :
         path === "/"            ? <MarketplacePage /> :
         path === "/verify-email"? <VerifyEmailPage /> :
         path === "/regulamin"   ? <TermsPage /> :
         path === "/prywatnosc"  ? <PrivacyPage /> :
         path === "/pomoc"       ? <SupportPage /> :
         (() => {
           const slug = path.slice(1);
           return slug && !slug.includes("/") ? <BusinessPage slug={slug} /> : <MarketplacePage />;
         })()}
      </Suspense>
      <FeedbackWidget />
    </>
  );
}
