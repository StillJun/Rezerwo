import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { Search, MapPin, BadgeCheck, ChevronRight, ChevronDown, Store } from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { PublicBusiness, Meta } from "./types";
import { useTranslation } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";

/* ══ CONSTANTS ══ */
const GRAD = "linear-gradient(100deg,#7c3aed,#d6409f,#ff7a59)";
const MESH = [
  "radial-gradient(ellipse 900px 600px at 12% 35%, rgba(124,58,237,.055) 0%, transparent 65%)",
  "radial-gradient(ellipse 700px 500px at 88% 72%, rgba(224,57,158,.042) 0%, transparent 60%)",
  "radial-gradient(ellipse 600px 400px at 58% 2%,  rgba(255,122,89,.035) 0%, transparent 58%)",
  "#fbf7f4",
].join(",");

const BANNERS: Record<string, string> = {
  brand:      "linear-gradient(135deg,#7c3aed,#d6409f,#ff7a59)",
  rose:       "linear-gradient(135deg,#f43f5e,#fb7185,#fda4af)",
  peach:      "linear-gradient(135deg,#fb923c,#f9a8a8,#fecaca)",
  plum:       "linear-gradient(135deg,#6d28d9,#9333ea,#c084fc)",
  ocean:      "linear-gradient(135deg,#0ea5e9,#38bdf8,#7dd3fc)",
  teal:       "linear-gradient(135deg,#0d9488,#2dd4bf,#99f6e4)",
  mint:       "linear-gradient(135deg,#10b981,#6ee7b7,#d1fae5)",
  indigo:     "linear-gradient(135deg,#4f46e5,#818cf8,#c7d2fe)",
  sunset:     "linear-gradient(135deg,#f59e0b,#fb923c,#fdba74)",
  amber:      "linear-gradient(135deg,#d97706,#fbbf24,#fde68a)",
  terracotta: "linear-gradient(135deg,#c2410c,#ea580c,#fdba74)",
  graphite:   "linear-gradient(135deg,#1f2937,#374151,#6b7280)",
  espresso:   "linear-gradient(135deg,#44403c,#78716c,#a8a29e)",
  wine:       "linear-gradient(135deg,#881337,#be123c,#fb7185)",
  lime:       "linear-gradient(135deg,#65a30d,#a3e635,#d9f99d)",
};

const POPULAR_CITIES = ["Wrocław","Warszawa","Kraków","Poznań","Gdańsk","Łódź"];

const CATEGORY_CONFIG: { id: string; displayLabel: string; color: string }[] = [
  { id: "nails",       displayLabel: "Manicure",      color: "#d4537e" },
  { id: "barber",      displayLabel: "Barber",        color: "#185fa5" },
  { id: "hair",        displayLabel: "Fryzjer",       color: "#d85a30" },
  { id: "brows",       displayLabel: "Brwi",          color: "#854f0b" },
  { id: "tattoo",      displayLabel: "Tatuaż",        color: "#534ab7" },
  { id: "beauty",      displayLabel: "Kosmetyczny",   color: "#993556" },
  { id: "laser",       displayLabel: "Laser",         color: "#ba7517" },
  { id: "sugaring",    displayLabel: "Sugaring",      color: "#639922" },
  { id: "lashes",      displayLabel: "Rzęsy",         color: "#0f6e56" },
  { id: "massage",     displayLabel: "Masaż",         color: "#1d9e75" },
  { id: "spa",         displayLabel: "SPA",           color: "#378add" },
  { id: "cosmetology", displayLabel: "Kosmetolog",    color: "#a01a6b" },
  { id: "makeup",      displayLabel: "Wizaż",         color: "#e24b4a" },
  { id: "aesthetic",   displayLabel: "Medycyna est.", color: "#c2410c" },
  { id: "podology",    displayLabel: "Podolog",       color: "#854f0b" },
];
const CAT_BY_ID = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.id, c]));

/* ══ CITY FIELD ══ */
function CityField({ label, value, placeholder, options, onChange, searchable }: {
  label: string; value: string; placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; searchable?: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [q,    setQ]      = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close    = useCallback(() => { setOpen(false); setQ(""); }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, close]);

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open, searchable]);

  const filtered = searchable && q
    ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position:"relative", display:"flex", flex:1, minWidth:0 }}>
      <button type="button" className="city-trigger" style={S.cityTrigger} onClick={() => setOpen(o => !o)}>
        <span style={S.cityLabel}>{label}</span>
        <span style={S.cityVal}>
          <MapPin size={11} color="#e0399e" strokeWidth={2.5} style={{ flexShrink:0 }}/>
          <span style={{ color: value ? "#1a1320":"#a8a2b0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, flex:1, minWidth:0, fontSize:13.5 }}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown size={12} color="#a8a2b0" style={{ flexShrink:0, transition:"transform .15s", transform: open ? "rotate(180deg)":"none" }}/>
        </span>
      </button>
      {open && (
        <div style={S.cityDropdown}>
          {searchable && (
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Szukaj…" style={S.citySearchInput}/>
          )}
          <div style={{ maxHeight:240, overflowY:"auto" as const }}>
            {filtered.map(o => (
              <div key={o.value}
                style={{ ...S.cityOptItem, ...(o.value===value ? {background:"#f3eefe",color:"#7c3aed",fontWeight:600}:{}) }}
                onMouseDown={() => { onChange(o.value); close(); }}>
                {o.label || <span style={{color:"#a8a2b0"}}>{placeholder}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ MAIN PAGE ══ */
export default function MarketplacePage() {
  const { t } = useTranslation();
  const [meta,     setMeta]     = useState<Meta|null>(null);
  const [city,     setCity]     = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [nameQ,    setNameQ]    = useState("");
  const [results,  setResults]  = useState<PublicBusiness[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    api.meta().then(m => { if (m?.cities && m?.categories) setMeta(m); }).catch(() => {});
  }, []);

  const search = async (opts?: { category?: string }) => {
    const cat = opts?.category ?? category;
    setLoading(true); setSearched(true);
    try {
      const data = await api.publicBusinesses({
        city: city||undefined, district: district||undefined,
        category: cat||undefined, q: nameQ.trim()||undefined,
      });
      setResults(data);
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key==="Enter") search(); };

  const pickCity = async (c: string) => {
    setCity(c); setDistrict(""); setLoading(true); setSearched(true);
    try {
      const data = await api.publicBusinesses({ city: c, category: category||undefined, q: nameQ.trim()||undefined });
      setResults(data);
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const pickCategory = (id: string) => {
    setCategory(id);
    if (searched) search({ category: id });
  };

  const districts = city && meta?.cities ? (meta.cities[city] ?? []) : [];
  const catCount  = meta?.categories.length ?? 0;
  const cityOpts  = [
    { value:"", label: t.allCities },
    ...(meta?.cities ? Object.keys(meta.cities).map(c => ({ value:c, label:c })) : []),
  ];
  const distOpts = [
    { value:"", label: t.allDistricts },
    ...districts.map(d => ({ value:d, label:d })),
  ];

  const words  = t.searchTitle.split(" ");
  const accent = words.pop() || "";
  const base   = words.join(" ");

  return (
    <div style={{ minHeight:"100vh", background:MESH, fontFamily:"'Inter',system-ui,sans-serif", color:"#1a1320" }}>

      {/* ══ HEADER ══ */}
      <header style={S.header}>
        <div style={S.logoRow} onClick={() => navigate("/")} role="link" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&navigate("/")}>
          <div style={S.logoMark}>R</div>
          <span style={S.logoText}>Rezerwo</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <LangDropdown/>
          <button className="panel-btn-sec nav-login-btn" style={S.panelBtn} onClick={() => navigate("/panel?mode=login")}>
            {t.navLogin}
          </button>
          <button className="btn-primary nav-register-btn" style={{...S.panelBtn, background:"linear-gradient(115deg,#7c3aed,#e0399e)", color:"#fff", border:"none", boxShadow:"0 2px 8px rgba(124,58,237,.25)"}}
            onClick={() => navigate("/panel")}>
            <Store size={14}/> {t.navRegister}
          </button>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section style={S.hero}>
        <h1 style={S.heroTitle} className="hero-title">
          {base}{" "}<span className="grad-text">{accent}</span>
        </h1>
        <p style={S.heroSub}>{t.searchSub}</p>

        {/* ── SEARCH CARD ── */}
        <div style={S.searchCard}>
          <div style={S.searchBar} className="search-bar">

            {/* Name */}
            <div style={S.nameField} className="search-name-field">
              <Search size={15} color="#8b8194" style={{ flexShrink:0 }}/>
              <input style={S.nameInput} value={nameQ} onChange={e=>setNameQ(e.target.value)}
                onKeyDown={handleKey} placeholder={t.searchByName}/>
              {nameQ && (
                <button onClick={() => setNameQ("")} style={S.clearBtn}>×</button>
              )}
            </div>

            <div style={S.searchDiv} className="search-div"/>

            {/* Location group */}
            <div style={S.locGroup} className="search-loc-group">
              <CityField label="MIASTO" value={city} placeholder={t.allCities}
                options={cityOpts} onChange={v => { setCity(v); setDistrict(""); }} searchable/>
              {city && districts.length > 0 && (
                <>
                  <div style={S.searchDiv} className="search-div"/>
                  <CityField label="DZIELNICA" value={district} placeholder={t.allDistricts}
                    options={distOpts} onChange={setDistrict}/>
                </>
              )}
            </div>

            <div style={S.searchDiv} className="search-div"/>

            {/* Button */}
            <button className="btn-primary search-btn" style={S.searchBtn} onClick={() => search()}>
              <Search size={15}/> {t.search}
            </button>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      {meta && (
        <section style={S.catSection}>
          <div style={S.catHeader}>
            <span style={S.catHeaderLabel}>KATEGORIE</span>
            <span style={S.catHeaderCount}>{catCount} usług</span>
          </div>
          <div style={S.catGrid} className="cat-grid">
            <button className="cat-card" style={{ ...S.catCard, ...(!category ? S.catCardActive : {}) }}
              onClick={() => pickCategory("")}>
              <div style={{ ...S.catBadge, background: !category ? "rgba(255,255,255,.28)":"rgba(124,58,237,.13)" }}>
                <span style={{ fontSize:18 }}>✦</span>
              </div>
              <span style={{ ...S.catCardLabel, color: !category ? "#fff":"#1a1320" }}>Wszystkie</span>
            </button>
            {meta.categories.map(c => {
              const cfg    = CAT_BY_ID[c.id];
              const active = category === c.id;
              const color  = cfg?.color ?? "#7c3aed";
              return (
                <button key={c.id} className="cat-card"
                  style={{ ...S.catCard, ...(active ? S.catCardActive : {}) }}
                  onClick={() => pickCategory(c.id)}>
                  <div style={{ ...S.catBadge, background: active ? "rgba(255,255,255,.28)" : `${color}22` }}>
                    <span style={{ fontSize:18 }}>{c.emoji}</span>
                  </div>
                  <span style={{ ...S.catCardLabel, color: active ? "#fff":"#1a1320" }}>
                    {cfg?.displayLabel ?? c.pl}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ RESULTS ══ */}
      <div style={S.results}>

        {loading && (
          <div style={S.grid} className="biz-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={S.skelCard}>
                <div className="skeleton-line" style={{ height:88, borderRadius:"26px 26px 0 0" }}/>
                <div style={{ padding:"14px 18px 18px" }}>
                  <div className="skeleton-line" style={{ height:14, width:"68%", marginBottom:8 }}/>
                  <div className="skeleton-line" style={{ height:11, width:"42%" }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && !results.length && (
          <div style={S.empty}>
            <div style={S.emptyIcon}>🔍</div>
            <div style={S.emptyTitle}>{city ? t.noResultsCity : t.noResults}</div>
            {!city && <div style={S.emptySub}>{t.noResultsSub}</div>}
          </div>
        )}

        {!loading && !searched && (
          <div style={S.emptySearchWrap}>
            <div style={S.emptyPinIcon}>
              <MapPin size={30} color="#fff" strokeWidth={2.5}/>
            </div>
            <h2 style={S.emptySearchTitle}>{t.emptySearchTitle}</h2>
            <p style={S.emptySearchSub}>{t.emptySearchSub}</p>
            <p style={S.popularCitiesLabel}>{t.popularCities}</p>
            <div style={S.cityChips}>
              {POPULAR_CITIES.map(c => (
                <button key={c} className="city-chip" style={S.cityChip} onClick={() => pickCity(c)}>
                  <MapPin size={12} color="#e0399e" strokeWidth={2.5}/>{c}
                </button>
              ))}
            </div>
            <div style={S.skelHintGrid}>
              {[1,2].map(i => (
                <div key={i} style={{...S.skelCard, opacity:0.45}}>
                  <div className="skeleton-line" style={{height:70,borderRadius:"20px 20px 0 0"}}/>
                  <div style={{padding:"12px 16px 14px"}}>
                    <div className="skeleton-line" style={{height:12,width:"65%",marginBottom:7}}/>
                    <div className="skeleton-line" style={{height:10,width:"40%",marginBottom:12}}/>
                    <div className="skeleton-line" style={{height:28,borderRadius:999}}/>
                  </div>
                </div>
              ))}
            </div>
            <p style={S.emptyHint}>{t.emptyHint}</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div style={S.resultsHeader}>{t.found(results.length)}</div>
            <div style={S.grid} className="biz-grid">
              {results.map(b => <BusinessCard key={b.id} biz={b}/>)}
            </div>
          </>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={S.footer} className="page-footer">
        © {new Date().getFullYear()} Rezerwo · {t.footer}
        <span style={{ margin:"0 8px", opacity:.35 }}>·</span>
        <span style={S.footLink} onClick={() => navigate("/panel")}>{t.panelOwner}</span>
        <span style={{ margin:"0 8px", opacity:.35 }}>·</span>
        <span style={S.footLink} onClick={() => navigate("/regulamin")}>{t.terms}</span>
        <span style={{ margin:"0 8px", opacity:.35 }}>·</span>
        <span style={S.footLink} onClick={() => navigate("/polityka-prywatnosci")}>{t.privacy}</span>
        <span style={{ margin:"0 8px", opacity:.35 }}>·</span>
        <span style={S.footLink} onClick={() => navigate("/pomoc")}>{t.help}</span>
      </footer>
    </div>
  );
}

/* ══ BUSINESS CARD ══ */
function BusinessCard({ biz }: { biz: PublicBusiness }) {
  const { t } = useTranslation();
  const bizCats    = biz.categories && biz.categories.length > 0 ? biz.categories : [biz.category].filter(Boolean);
  const primaryCat = bizCats[0];

  return (
    <div className="biz-card" style={S.card} onClick={() => navigate(`/${biz.slug}`)}>
      <div style={{ ...S.cardBanner, background: BANNERS[biz.banner] || BANNERS.brand }}>
        {biz.verified && (
          <span style={S.verBadge}><BadgeCheck size={12}/> Zweryfikowany</span>
        )}
      </div>
      <div style={S.cardBody}>
        <div style={S.cardName}>{biz.name}</div>
        <div style={S.cardMeta}>
          <CategoryIcon id={primaryCat} size={13} color="#8b8194"/>
          {" "}{t.catLabels[primaryCat] ?? primaryCat}
          {bizCats.length > 1 && bizCats.slice(1).map(cid => (
            <span key={cid} style={S.catExtraTag}>{t.catLabels[cid] ?? cid}</span>
          ))}
          {biz.city && <span style={{color:"#c4bac8"}}> · </span>}
          {biz.city}{biz.district && `, ${biz.district}`}
        </div>
        {biz.about && (
          <p style={S.cardAbout}>
            {biz.about.length > 90 ? biz.about.slice(0,88)+"…" : biz.about}
          </p>
        )}
        <div style={S.cardFooter}>
          {biz.avgRating ? (
            <span style={S.ratingBadge}>
              ★ {biz.avgRating.toFixed(1)}
              {(biz.reviewCount ?? 0) > 0 && <span style={{opacity:.65,fontSize:11}}> ({biz.reviewCount})</span>}
            </span>
          ) : <span/>}
          <span style={S.bookBtn}>{t.book} <ChevronRight size={13}/></span>
        </div>
      </div>
    </div>
  );
}

/* ══ STYLES ══ */
const S: Record<string, CSSProperties> = {
  // Header
  header:   { maxWidth:960, margin:"0 auto", padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  logoRow:  { display:"flex", alignItems:"center", gap:10, cursor:"pointer" },
  logoMark: { width:34, height:34, borderRadius:10, background:GRAD, color:"#fff", fontWeight:800, fontSize:19, display:"grid", placeItems:"center", boxShadow:"0 4px 16px rgba(124,58,237,.40)", fontFamily:"'Fraunces',Georgia,serif", letterSpacing:-0.5 },
  logoText: { fontSize:20, fontWeight:500, letterSpacing:"-0.03em", fontFamily:"'Fraunces',Georgia,serif", color:"#1a1320" },
  panelBtn: { display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:999, border:"1.5px solid #efe9ee", background:"#fff", fontSize:13, fontWeight:600, color:"#52525b", cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:"0 1px 4px rgba(26,19,32,.05)", transition:"box-shadow .2s,transform .2s" },

  // Hero
  hero:      { padding:"40px 20px 28px", textAlign:"center", maxWidth:780, margin:"0 auto" },
  heroTitle: { fontSize:"clamp(28px,5.5vw,52px)", fontWeight:500, fontFamily:"'Fraunces',Georgia,serif", letterSpacing:"-0.03em", margin:"0 0 12px", color:"#1a1320", lineHeight:1.15 },
  heroSub:   { fontSize:16, color:"#8b8194", margin:"0 0 28px", lineHeight:1.65 },

  // Search card (single-row, no outer padding)
  searchCard: { background:"#fff", borderRadius:22, boxShadow:"0 4px 28px rgba(26,19,32,.09), 0 1px 0 rgba(255,255,255,.9) inset", border:"1px solid #efe9ee", maxWidth:780, margin:"0 auto" },
  searchBar:  { display:"flex", alignItems:"center" },
  nameField:  { display:"flex", alignItems:"center", gap:10, flex:1, padding:"16px 18px", minWidth:0 },
  nameInput:  { border:"none", outline:"none", background:"transparent", fontSize:14, flex:1, color:"#1a1320", minWidth:0, fontFamily:"'Inter',system-ui,sans-serif" },
  clearBtn:   { border:"none", background:"none", cursor:"pointer", color:"#8b8194", padding:"0 4px", display:"flex", lineHeight:1, fontSize:18, flexShrink:0 },
  searchDiv:  { width:1, alignSelf:"stretch", background:"#efe9ee", flexShrink:0, margin:"10px 0" },
  locGroup:   { display:"flex", alignItems:"center", flexShrink:0 },

  // City field
  cityTrigger:    { display:"flex", flexDirection:"column", gap:2, padding:"10px 16px", background:"none", border:"none", cursor:"pointer", minWidth:120, maxWidth:170, fontFamily:"'Inter',system-ui,sans-serif", textAlign:"left" as const, width:"100%" },
  cityLabel:      { fontSize:10, fontWeight:700, color:"#a8a2b0", textTransform:"uppercase" as const, letterSpacing:"0.08em", lineHeight:1 },
  cityVal:        { display:"flex", alignItems:"center", gap:4, marginTop:3, minWidth:0 },
  cityDropdown:   { position:"absolute" as const, top:"calc(100% + 6px)", left:0, minWidth:220, zIndex:300, background:"#fff", borderRadius:16, border:"1.5px solid #ece8f0", boxShadow:"0 8px 32px rgba(26,19,32,.12)", overflow:"hidden" },
  citySearchInput:{ display:"block" as const, width:"100%", border:"none", borderBottom:"1px solid #f0ebf5", padding:"12px 16px", fontSize:13.5, fontFamily:"'Inter',system-ui,sans-serif", outline:"none", background:"#faf8fb", boxSizing:"border-box" as const },
  cityOptItem:    { padding:"10px 16px", fontSize:13.5, cursor:"pointer", color:"#1a1320", userSelect:"none" as const },

  // Search button
  searchBtn: { display:"flex", alignItems:"center", gap:7, background:GRAD, color:"#fff", border:"none", borderRadius:16, padding:"13px 22px", margin:5, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:"0 4px 16px rgba(124,58,237,.30)", whiteSpace:"nowrap" as const, flexShrink:0, transition:"transform .2s,box-shadow .2s" },

  // Categories section
  catSection:      { maxWidth:960, margin:"0 auto", padding:"20px 20px 10px" },
  catHeader:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  catHeaderLabel:  { fontSize:11, fontWeight:700, color:"#a8a2b0", textTransform:"uppercase" as const, letterSpacing:"0.1em" },
  catHeaderCount:  { fontSize:12, color:"#a8a2b0" },
  catGrid:         { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:10 },
  catCard:         { display:"flex", alignItems:"center", gap:10, background:"#fff", border:"1px solid #efe9ee", borderRadius:14, padding:"11px 14px", cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", transition:"all .15s", textAlign:"left" as const, width:"100%" },
  catCardActive:   { background:GRAD, borderColor:"transparent", boxShadow:"0 4px 16px rgba(124,58,237,.28)" },
  catBadge:        { width:36, height:36, borderRadius:999, flexShrink:0, display:"grid", placeItems:"center" },
  catCardLabel:    { fontSize:12.5, fontWeight:600, lineHeight:1.25, whiteSpace:"normal" as const, wordBreak:"break-word" as const, flex:1 },

  // Results
  results:       { maxWidth:960, margin:"0 auto", padding:"8px 20px 64px" },
  resultsHeader: { fontSize:13.5, color:"#8b8194", fontWeight:500, marginBottom:18 },
  grid:          { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 },
  skelCard:      { background:"#fff", borderRadius:26, overflow:"hidden", border:"1px solid #efe9ee" },

  // Empty states
  empty:      { textAlign:"center" as const, padding:"64px 20px" },
  emptyIcon:  { fontSize:42, marginBottom:14 },
  emptyTitle: { fontSize:16, color:"#1a1320", fontWeight:600, marginBottom:6 },
  emptySub:   { fontSize:13.5, color:"#8b8194" },

  // Pre-search empty state
  emptySearchWrap:    { textAlign:"center" as const, padding:"40px 20px 40px", maxWidth:560, margin:"0 auto" },
  emptyPinIcon:       { width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#7c3aed,#d6409f,#ff7a59)", display:"grid", placeItems:"center", margin:"0 auto 20px", boxShadow:"0 8px 24px rgba(124,58,237,.30)" },
  emptySearchTitle:   { fontSize:24, fontWeight:500, fontFamily:"'Fraunces',Georgia,serif", letterSpacing:"-0.03em", color:"#1a1320", margin:"0 0 10px" },
  emptySearchSub:     { fontSize:14.5, color:"#8b8194", margin:"0 0 24px", lineHeight:1.6 },
  popularCitiesLabel: { fontSize:11.5, fontWeight:700, color:"#a8a2b0", textTransform:"uppercase" as const, letterSpacing:"0.08em", margin:"0 0 10px" },
  cityChips:          { display:"flex", flexWrap:"wrap" as const, gap:8, justifyContent:"center", marginBottom:28 },
  cityChip:           { display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:999, background:"#fff", border:"1.5px solid #efe9ee", fontSize:13, fontWeight:600, color:"#1a1320", cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", transition:"all .15s", boxShadow:"0 1px 4px rgba(26,19,32,.05)" },
  skelHintGrid:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, maxWidth:440, margin:"0 auto 12px" },
  emptyHint:          { fontSize:12.5, color:"#a8a2b0", margin:0 },

  // Business card
  card:        { background:"#fff", borderRadius:26, overflow:"hidden", cursor:"pointer", boxShadow:"0 2px 8px rgba(26,19,32,.05)", border:"1px solid #efe9ee", transition:"transform .2s ease,box-shadow .2s ease" },
  cardBanner:  { height:88, position:"relative" as const },
  verBadge:    { position:"absolute" as const, bottom:8, left:10, display:"flex", alignItems:"center", gap:4, background:"rgba(0,0,0,.40)", backdropFilter:"blur(6px)", color:"#fff", fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:999 },
  cardBody:    { padding:"14px 18px 18px" },
  cardName:    { fontSize:15, fontWeight:700, letterSpacing:"-0.02em", marginBottom:4, color:"#1a1320" },
  cardMeta:    { fontSize:12.5, color:"#8b8194", display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" as const },
  catExtraTag: { fontSize:11, padding:"1px 7px", borderRadius:999, background:"#f3eefe", color:"#7c3aed", fontWeight:600, lineHeight:"18px" },
  cardAbout:   { fontSize:13, color:"#8b8194", margin:"8px 0 0", lineHeight:1.5 },
  cardFooter:  { marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" },
  ratingBadge: { display:"flex", alignItems:"center", gap:3, fontSize:13, fontWeight:700, color:"#f59e0b" },
  bookBtn:     { display:"flex", alignItems:"center", gap:3, color:"#7c3aed", fontWeight:700, fontSize:13 },

  // Footer
  footer:   { textAlign:"center" as const, padding:"24px 20px 32px", fontSize:12.5, color:"#8b8194", borderTop:"1px solid #efe9ee" },
  footLink: { color:"#7c3aed", fontWeight:600, cursor:"pointer" },
};
