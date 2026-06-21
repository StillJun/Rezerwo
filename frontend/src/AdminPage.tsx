import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { CheckCircle2, XCircle, BadgeCheck, BadgeX, Trash2, Store, BarChart2, MessageSquare, LogOut } from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";

const ACC  = "#7c3aed";
const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";
const font = "'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";
const MESH = [
  "radial-gradient(ellipse 900px 500px at 10% 20%, rgba(124,58,237,.04) 0%, transparent 65%)",
  "radial-gradient(ellipse 600px 400px at 90% 80%, rgba(224,57,158,.03) 0%, transparent 60%)",
  "#fbf7f4",
].join(",");

type BizRow = { id: number; slug: string; name: string; category: string; city: string; status: string; verified: boolean; ownerEmail: string; createdAt: string };
type Stats = { owners: number; businesses: Record<string, number>; appointments7d: number };
type FbRow = { id: number; kind: string; message: string; email: string; page: string; createdAt: string };

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    api.me().then(r => {
      if (r.user.role === "admin") setAuthed(true);
      else { navigate("/panel"); }
    }).catch(() => navigate("/panel"));
  }, []);

  if (authed === null) return <div style={{padding:40,textAlign:"center",color:"#a8a2b0"}}>…</div>;
  return <AdminDashboard/>;
}

function AdminDashboard() {
  const [tab, setTab] = useState<"pending"|"approved"|"rejected"|"stats"|"feedback">("pending");

  const tabs: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: "pending",  label: "Oczekujące",   icon: <Store size={14}/> },
    { key: "approved", label: "Zatwierdzone",  icon: <CheckCircle2 size={14}/> },
    { key: "rejected", label: "Odrzucone",     icon: <XCircle size={14}/> },
    { key: "stats",    label: "Statystyki",    icon: <BarChart2 size={14}/> },
    { key: "feedback", label: "Feedback",      icon: <MessageSquare size={14}/> },
  ];

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={S.logo}>R</div>
          <div>
            <div style={{fontWeight:500,fontSize:17,fontFamily:"'Fraunces',Georgia,serif",letterSpacing:"-0.02em",color:"#1a1320"}}>Rezerwo Admin</div>
            <div style={{fontSize:11.5,color:"#8b8194"}}>Panel moderacji</div>
          </div>
        </div>
        <button style={S.iconBtn} onClick={()=>navigate("/panel")} title="Panel właściciela">
          <LogOut size={16}/>
        </button>
      </header>

      <div style={S.tabsRow}>
        {tabs.map(t => (
          <button key={t.key} style={{...S.tabBtn,...(tab===t.key?S.tabBtnOn:{})}} onClick={()=>setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {(tab==="pending"||tab==="approved"||tab==="rejected") && <BizList status={tab}/>}
        {tab==="stats"    && <StatsView/>}
        {tab==="feedback" && <FeedbackView/>}
      </div>
    </div>
  );
}

function BizList({ status }: { status: "pending"|"approved"|"rejected" }) {
  const [list, setList] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await api.adminBusinesses(status)); } catch { /**/ } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, fn: ()=>Promise<unknown>) => {
    setBusy(id);
    try { await fn(); await load(); } finally { setBusy(null); }
  };

  if (loading) return <div style={S.empty}>…</div>;
  if (!list.length) return <div style={S.empty}>Brak rekordów.</div>;

  return (
    <div style={S.card}>
      {list.map(b => (
        <div key={b.id} style={S.row}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14}}>{b.name}</div>
            <div style={{fontSize:12.5,color:"#71717a"}}>{b.category} · {b.city || "—"}</div>
            <div style={{fontSize:12,color:"#a8a2b0"}}>{b.ownerEmail}</div>
            {b.slug && (
              <a href={`/${b.slug}`} target="_blank" rel="noreferrer"
                style={{fontSize:12,color:ACC,textDecoration:"none"}}>/{b.slug}</a>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
            {b.verified
              ? <button style={{...S.actBtn,color:"#71717a"}} disabled={busy===b.id} onClick={()=>act(b.id,()=>api.adminUnverify(b.id))}>
                  <BadgeX size={13}/> Cofnij weryfikację
                </button>
              : <button style={{...S.actBtn,color:ACC}} disabled={busy===b.id} onClick={()=>act(b.id,()=>api.adminVerify(b.id))}>
                  <BadgeCheck size={13}/> Weryfikuj
                </button>
            }
            {status !== "approved" && (
              <button style={{...S.actBtn,color:"#059669"}} disabled={busy===b.id} onClick={()=>act(b.id,()=>api.adminApprove(b.id))}>
                <CheckCircle2 size={13}/> Zatwierdź
              </button>
            )}
            {status !== "rejected" && (
              <button style={{...S.actBtn,color:"#dc2626"}} disabled={busy===b.id} onClick={()=>act(b.id,()=>api.adminReject(b.id))}>
                <XCircle size={13}/> Odrzuć
              </button>
            )}
            <button style={{...S.actBtn,color:"#dc2626",borderColor:"#dc2626"}} disabled={busy===b.id}
              onClick={()=>{ if(confirm(`Usunąć "${b.name}"?`)) act(b.id,()=>api.adminDelete(b.id)); }}>
              <Trash2 size={13}/> Usuń
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsView() {
  const [stats, setStats] = useState<Stats|null>(null);
  useEffect(() => { api.adminStats().then(setStats).catch(()=>{}); }, []);
  if (!stats) return <div style={S.empty}>…</div>;
  return (
    <div>
      <h2 style={S.h2}>Statystyki</h2>
      <div style={S.statsGrid}>
        <StatCard label="Właściciele" value={stats.owners}/>
        <StatCard label="Zatwierdzone" value={stats.businesses["approved"]||0}/>
        <StatCard label="Oczekujące"  value={stats.businesses["pending"]||0}/>
        <StatCard label="Odrzucone"   value={stats.businesses["rejected"]||0}/>
        <StatCard label="Rezerwacje (7 dni)" value={stats.appointments7d}/>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={S.statCard}>
      <div style={{fontSize:30,fontWeight:500,color:ACC,fontFamily:"'Fraunces',Georgia,serif"}}>{value}</div>
      <div style={{fontSize:13,color:"#8b8194",marginTop:4}}>{label}</div>
    </div>
  );
}

function FeedbackView() {
  const [list, setList] = useState<FbRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.adminFeedback().then(setList).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  if (loading) return <div style={S.empty}>…</div>;
  if (!list.length) return <div style={S.empty}>Brak feedbacku.</div>;
  return (
    <div style={S.card}>
      {list.map(f => (
        <div key={f.id} style={S.row}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
              <span style={{...S.kindBadge,...(f.kind==="bug"?{color:"#dc2626",background:"#fee2e2"}:{color:"#059669",background:"#d1fae5"})}}>
                {f.kind}
              </span>
              {f.email && <span style={{fontSize:12,color:"#a8a2b0"}}>{f.email}</span>}
            </div>
            <div style={{fontSize:13.5,lineHeight:1.5}}>{f.message}</div>
            {f.page && <div style={{fontSize:11.5,color:"#a8a2b0",marginTop:4}}>Strona: {f.page}</div>}
          </div>
          <div style={{fontSize:11.5,color:"#a8a2b0",flexShrink:0,paddingLeft:12}}>
            {new Date(f.createdAt).toLocaleDateString("pl-PL")}
          </div>
        </div>
      ))}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page:     { minHeight:"100vh", background:MESH, fontFamily:font },
  header:   { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 22px", background:"rgba(251,247,244,.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid rgba(239,233,238,.7)", position:"sticky", top:0, zIndex:10 },
  logo:     { width:32, height:32, borderRadius:9, background:GRAD, color:"#fff", fontWeight:800, fontSize:18, display:"grid", placeItems:"center", boxShadow:"0 3px 14px rgba(124,58,237,.38)", fontFamily:"'Fraunces',Georgia,serif" },
  iconBtn:  { display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", cursor:"pointer", color:"#52525b" },
  tabsRow:  { display:"flex", gap:6, overflowX:"auto" as const, padding:"12px 20px", borderBottom:"1px solid #efe9ee", background:"rgba(255,255,255,.7)", scrollbarWidth:"none" as const },
  tabBtn:   { display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", fontSize:13, fontWeight:600, color:"#8b8194", cursor:"pointer", whiteSpace:"nowrap" as const, fontFamily:font },
  tabBtnOn: { background:"#1a1320", color:"#fff", borderColor:"#1a1320" },
  body:     { maxWidth:900, margin:"0 auto", padding:"22px 18px 60px" },
  card:     { background:"#fff", borderRadius:20, overflow:"hidden", border:"1px solid #efe9ee", boxShadow:"0 2px 8px rgba(26,19,32,.05)" },
  row:      { display:"flex", alignItems:"flex-start", gap:12, padding:"14px 18px", borderBottom:"1px solid #efe9ee" },
  actBtn:   { display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:font, transition:"border-color .15s" },
  empty:    { textAlign:"center" as const, color:"#8b8194", padding:"48px 0", fontSize:14, background:"#fff", borderRadius:20, border:"1px solid #efe9ee" },
  h2:       { fontSize:20, fontWeight:500, margin:"0 0 18px", letterSpacing:"-0.03em", fontFamily:"'Fraunces',Georgia,serif", color:"#1a1320" },
  statsGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 },
  statCard: { background:"#fff", borderRadius:18, padding:"18px 20px", border:"1px solid #efe9ee", boxShadow:"0 2px 8px rgba(26,19,32,.05)" },
  kindBadge:{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 },
};
