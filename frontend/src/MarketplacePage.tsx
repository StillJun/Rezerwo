import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { Search, MapPin, BadgeCheck, ChevronRight, Store, Clock, Zap, UserCheck, Bell } from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { PublicBusiness, Meta } from "./types";
import { useTranslation } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";
import { Select } from "./components/Select";
import type { SelectOption } from "./components/Select";

const GRAD = "linear-gradient(115deg,#7c3aed 0%,#e0399e 52%,#ff7a59 100%)";
const MESH = [
  "radial-gradient(ellipse 900px 600px at 12% 35%, rgba(124,58,237,.055) 0%, transparent 65%)",
  "radial-gradient(ellipse 700px 500px at 88% 72%, rgba(224,57,158,.042) 0%, transparent 60%)",
  "radial-gradient(ellipse 600px 400px at 58% 2%,  rgba(255,122,89,.035) 0%, transparent 58%)",
  "#fbf7f4",
].join(",");

const BANNERS: Record<string, string> = {
  violet: "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  rose:   "linear-gradient(135deg,#ff9a9e,#fecfef)",
  peach:  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  ink:    "linear-gradient(135deg,#302b3a,#5b4b6e)",
  mint:   "linear-gradient(135deg,#a8edea,#fed6e3)",
  gold:   "linear-gradient(135deg,#f6d365,#fda085)",
};

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [meta, setMeta]         = useState<Meta|null>(null);
  const [city, setCity]         = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [nameQ, setNameQ]       = useState("");
  const [results, setResults]   = useState<PublicBusiness[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.meta()
      .then(m => { if (m?.cities && m?.categories) setMeta(m); })
      .catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true); setSearched(true);
    try {
      const data = await api.publicBusinesses({
        city: city||undefined, district: district||undefined,
        category: category||undefined, q: nameQ.trim()||undefined,
      });
      setResults(data);
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") search(); };
  const districts = city && meta?.cities ? (meta.cities[city] ?? []) : [];

  // Split title: last word gets gradient treatment
  const words = t.searchTitle.split(" ");
  const accent = words.pop() || "";
  const base   = words.join(" ");

  return (
    <div style={{ minHeight:"100vh", background: MESH, fontFamily:"'Inter',system-ui,sans-serif", color:"#1a1320" }}>

      {/* ══ HEADER ══ */}
      <header style={S.header}>
        <div style={S.logoRow} onClick={() => navigate("/")} role="link" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&navigate("/")}>
          <div style={S.logoMark}>R</div>
          <span style={S.logoText}>Rezerwo</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <LangDropdown/>
          <button className="panel-btn-sec" style={S.panelBtn} onClick={() => navigate("/panel")}>
            <Store size={14}/> {t.panelOwner.split(" ")[0]}
          </button>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section style={S.hero}>
        <h1 style={S.heroTitle} className="hero-title">
          {base}{" "}<span className="grad-text">{accent}</span>
        </h1>
        <p style={S.heroSub}>{t.searchSub}</p>

        {/* Search card — only glass element on page */}
        <div style={S.searchCard} className="search-box">

          {/* Name row */}
          <div style={S.nameRow} className="search-field">
            <Search size={15} color="#8b8194"/>
            <input
              style={S.nameInput}
              value={nameQ}
              onChange={e => setNameQ(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t.searchByName}
            />
            {nameQ && (
              <button onClick={() => setNameQ("")}
                style={{ border:"none", background:"none", cursor:"pointer", color:"#8b8194", padding:"0 4px", display:"flex", lineHeight:1, fontSize:18 }}>
                ×
              </button>
            )}
          </div>

          {/* City / District */}
          <div style={S.searchRow} className="search-row">
            {(() => {
              const cityOpts: SelectOption[] = [
                { value: "", label: t.allCities },
                ...(meta?.cities ? Object.keys(meta.cities).map(c => ({ value: c, label: c })) : []),
              ];
              const distOpts: SelectOption[] = [
                { value: "", label: t.allDistricts },
                ...districts.map(d => ({ value: d, label: d })),
              ];
              return (
                <>
                  <div style={{ flex:1, minWidth:160 }} className="search-field">
                    <Select
                      value={city}
                      onChange={v => { setCity(v); setDistrict(""); }}
                      options={cityOpts}
                      placeholder={t.allCities}
                      searchable
                      startIcon={<MapPin size={15}/>}
                      style={{ marginBottom:0 }}
                    />
                  </div>
                  {city && districts.length > 0 && (
                    <div style={{ flex:1, minWidth:160 }} className="search-field">
                      <Select
                        value={district}
                        onChange={setDistrict}
                        options={distOpts}
                        placeholder={t.allDistricts}
                        startIcon={<MapPin size={15}/>}
                        style={{ marginBottom:0 }}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Category chips */}
          <div style={S.catRow} className="cat-row">
            <button
              className="cat-chip"
              style={{ ...S.catChip, ...(!category ? S.catChipOn : {}) }}
              onClick={() => setCategory("")}
            >
              {t.allCategories}
            </button>
            {meta?.categories.map(c => (
              <button
                key={c.id}
                className="cat-chip"
                style={{ ...S.catChip, ...(category === c.id ? S.catChipOn : {}) }}
                onClick={() => setCategory(c.id)}
              >
                {c.emoji} {t.catLabels[c.id] ?? c.pl}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button className="btn-primary" style={S.searchBtn} onClick={search}>
            <Search size={16}/> {t.search}
          </button>
        </div>
      </section>

      {/* ══ BENEFITS (shown before first search) ══ */}
      {!searched && (
        <section style={S.benefitsWrap} className="benefits-grid">
          {([
            { icon: <Clock size={20} strokeWidth={2}/>,     title: t.benefit1, sub: t.benefit1Sub },
            { icon: <Zap size={20} strokeWidth={2}/>,       title: t.benefit2, sub: t.benefit2Sub },
            { icon: <UserCheck size={20} strokeWidth={2}/>, title: t.benefit3, sub: t.benefit3Sub },
            { icon: <Bell size={20} strokeWidth={2}/>,      title: t.benefit4, sub: t.benefit4Sub },
          ] as { icon: React.ReactNode; title: string; sub: string }[]).map((b, i) => (
            <div key={i} style={S.benefitCard}>
              <div style={S.benefitIcon}>{b.icon}</div>
              <div>
                <div style={S.benefitTitle}>{b.title}</div>
                <div style={S.benefitSub}>{b.sub}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ══ RESULTS ══ */}
      <div style={S.results}>

        {/* Skeleton */}
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
            <div style={S.emptyTitle}>{t.noResults}</div>
            <div style={S.emptySub}>{t.noResultsSub}</div>
          </div>
        )}

        {!loading && !searched && (
          <div style={S.empty}>
            <div style={S.emptyIcon}>💅</div>
            <div style={S.emptyTitle}>{t.pickCity}</div>
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
        <span style={S.footLink} onClick={() => navigate("/prywatnosc")}>{t.privacy}</span>
        <span style={{ margin:"0 8px", opacity:.35 }}>·</span>
        <span style={S.footLink} onClick={() => navigate("/pomoc")}>{t.help}</span>
      </footer>
    </div>
  );
}

/* ══ BUSINESS CARD ══ */
function BusinessCard({ biz }: { biz: PublicBusiness }) {
  const { t } = useTranslation();
  const bizCats = biz.categories && biz.categories.length > 0 ? biz.categories : [biz.category].filter(Boolean);
  const primaryCat = bizCats[0];

  return (
    <div className="biz-card" style={S.card} onClick={() => navigate(`/${biz.slug}`)}>
      {/* Banner */}
      <div style={{ ...S.cardBanner, background: BANNERS[biz.banner] || BANNERS.violet }}>
        {biz.verified && (
          <span style={S.verBadge}>
            <BadgeCheck size={12}/> Zweryfikowany
          </span>
        )}
      </div>

      {/* Body */}
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
            {biz.about.length > 90 ? biz.about.slice(0, 88) + "…" : biz.about}
          </p>
        )}
        <div style={S.cardFooter}>
          {biz.avgRating ? (
            <span style={S.ratingBadge}>
              ★ {biz.avgRating.toFixed(1)}
              {(biz.reviewCount ?? 0) > 0 && (
                <span style={{ opacity:.65, fontSize:11 }}> ({biz.reviewCount})</span>
              )}
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
  header: {
    maxWidth: 960, margin: "0 auto", padding: "16px 24px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoMark: {
    width: 34, height: 34, borderRadius: 10, background: GRAD,
    color: "#fff", fontWeight: 800, fontSize: 19, display: "grid", placeItems: "center",
    boxShadow: "0 4px 16px rgba(124,58,237,.40)",
    fontFamily: "'Fraunces',Georgia,serif", letterSpacing: -0.5,
  },
  logoText: {
    fontSize: 20, fontWeight: 500, letterSpacing: "-0.03em",
    fontFamily: "'Fraunces',Georgia,serif", color: "#1a1320",
  },
  panelBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 18px", borderRadius: 999,
    border: "1.5px solid #efe9ee", background: "#fff",
    fontSize: 13, fontWeight: 600, color: "#52525b", cursor: "pointer",
    fontFamily: "'Inter',system-ui,sans-serif",
    boxShadow: "0 1px 4px rgba(26,19,32,.05)",
    transition: "box-shadow .2s,transform .2s",
  },

  // Hero
  hero: { padding: "52px 20px 56px", textAlign: "center", maxWidth: 680, margin: "0 auto" },
  heroTitle: {
    fontSize: "clamp(30px,5.5vw,54px)", fontWeight: 500,
    fontFamily: "'Fraunces',Georgia,serif", letterSpacing: "-0.03em",
    margin: "0 0 14px", color: "#1a1320", lineHeight: 1.15,
  },
  heroSub: { fontSize: 16, color: "#8b8194", margin: "0 0 32px", lineHeight: 1.65 },

  // Search card
  searchCard: {
    background: "rgba(255,255,255,.82)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,.65)", borderRadius: 26,
    padding: "22px 22px 18px",
    boxShadow: "0 8px 40px rgba(26,19,32,.08), 0 1px 0 rgba(255,255,255,.8) inset",
    maxWidth: 620, margin: "0 auto",
  },
  nameRow: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1.5px solid #efe9ee", borderRadius: 18, padding: "0 14px",
    background: "#fff", marginBottom: 10,
  },
  nameInput: {
    border: "none", outline: "none", background: "transparent",
    fontSize: 14, padding: "13px 0", flex: 1, color: "#1a1320",
    fontFamily: "'Inter',system-ui,sans-serif",
  },
  searchRow: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" as const },
  catRow:    { display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 14 },
  catChip: {
    padding: "7px 14px", borderRadius: 999, border: "1.5px solid #efe9ee",
    background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#8b8194",
    cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif",
    transition: "all .15s ease",
  },
  catChipOn: { background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" },
  searchBtn: {
    width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
    background: GRAD, color: "#fff", border: "none", borderRadius: 999,
    padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer",
    fontFamily: "'Inter',system-ui,sans-serif",
    boxShadow: "0 6px 24px rgba(124,58,237,.35)",
    transition: "transform .2s,box-shadow .2s",
  },

  // Benefits
  benefitsWrap: {
    maxWidth: 960, margin: "0 auto 8px", padding: "0 20px 44px",
    display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14,
  },
  benefitCard: {
    background: "#fff", borderRadius: 20, padding: "18px 18px",
    display: "flex", alignItems: "flex-start", gap: 14,
    boxShadow: "0 2px 8px rgba(26,19,32,.05)", border: "1px solid #efe9ee",
  },
  benefitIcon: {
    width: 44, height: 44, borderRadius: 14,
    background: "rgba(124,58,237,.08)",
    display: "grid", placeItems: "center", color: "#7c3aed", flexShrink: 0,
  },
  benefitTitle: { fontSize: 13, fontWeight: 700, color: "#1a1320", marginBottom: 4 },
  benefitSub:   { fontSize: 12, color: "#8b8194", lineHeight: 1.45 },

  // Results
  results:       { maxWidth: 960, margin: "0 auto", padding: "8px 20px 64px" },
  resultsHeader: { fontSize: 13.5, color: "#8b8194", fontWeight: 500, marginBottom: 18 },
  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 },

  // Skeleton card
  skelCard: { background: "#fff", borderRadius: 26, overflow: "hidden", border: "1px solid #efe9ee" },

  // Empty states
  empty:      { textAlign: "center" as const, padding: "64px 20px" },
  emptyIcon:  { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 16, color: "#1a1320", fontWeight: 600, marginBottom: 6 },
  emptySub:   { fontSize: 13.5, color: "#8b8194" },

  // Business card
  card: {
    background: "#fff", borderRadius: 26, overflow: "hidden", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(26,19,32,.05)", border: "1px solid #efe9ee",
    transition: "transform .2s ease, box-shadow .2s ease",
  },
  cardBanner: { height: 88, position: "relative" as const },
  verBadge: {
    position: "absolute" as const, bottom: 8, left: 10,
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(0,0,0,.40)", backdropFilter: "blur(6px)",
    color: "#fff", fontSize: 10.5, fontWeight: 700,
    padding: "3px 9px", borderRadius: 999,
  },
  cardBody:    { padding: "14px 18px 18px" },
  cardName:    { fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4, color: "#1a1320" },
  cardMeta:    { fontSize: 12.5, color: "#8b8194", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const },
  catExtraTag: { fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "#f3eefe", color: "#7c3aed", fontWeight: 600, lineHeight: "18px" },
  cardAbout:   { fontSize: 13, color: "#8b8194", margin: "8px 0 0", lineHeight: 1.5 },
  cardFooter:  { marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" },
  ratingBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 700, color: "#f59e0b" },
  bookBtn:     { display: "flex", alignItems: "center", gap: 3, color: "#7c3aed", fontWeight: 700, fontSize: 13 },

  // Footer
  footer:   { textAlign: "center" as const, padding: "24px 20px 32px", fontSize: 12.5, color: "#8b8194", borderTop: "1px solid #efe9ee" },
  footLink: { color: "#7c3aed", fontWeight: 600, cursor: "pointer" },
};
