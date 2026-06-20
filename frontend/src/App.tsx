import { useState, useEffect, lazy, Suspense } from "react";

const PanelPage      = lazy(() => import("./PanelPage"));
const MarketplacePage= lazy(() => import("./MarketplacePage"));
const BusinessPage   = lazy(() => import("./BusinessPage"));
const TermsPage      = lazy(() => import("./TermsPage"));
const PrivacyPage    = lazy(() => import("./PrivacyPage"));
const SupportPage    = lazy(() => import("./SupportPage"));

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

  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"grid",placeItems:"center",color:"#a8a2b0",fontFamily:"sans-serif"}}>…</div>}>
      {path === "/panel"      ? <PanelPage /> :
       path === "/"           ? <MarketplacePage /> :
       path === "/regulamin"  ? <TermsPage /> :
       path === "/prywatnosc" ? <PrivacyPage /> :
       path === "/pomoc"      ? <SupportPage /> :
       (() => {
         const slug = path.slice(1);
         return slug && !slug.includes("/") ? <BusinessPage slug={slug} /> : <MarketplacePage />;
       })()}
    </Suspense>
  );
}
