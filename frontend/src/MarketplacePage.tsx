import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { Search, MapPin, BadgeCheck, ChevronRight, Store } from "lucide-react";
import { api } from "./api";
import { navigate } from "./App";
import type { PublicBusiness, Meta } from "./types";
import { useTranslation } from "./i18n";
import { LangDropdown } from "./components/LangDropdown";
import { CategoryIcon } from "./icons/CategoryIcon";
import { Select } from "./components/Select";
import type { SelectOption } from "./components/Select";
import { ThemeToggle } from "./components/ThemeToggle";

const ACC = "#7c3aed";
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";
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
  const [meta, setMeta] = useState<Meta|null>(null);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [nameQ, setNameQ] = useState("");
  const [results, setResults] = useState<PublicBusiness[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.meta().then(setMeta).catch(()=>{}); }, []);

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

  const districts = city && meta ? (meta.cities[city]||[]) : [];

  return (
    <div style={S.page}>
      {/* header */}
      <header style={S.header}>
        <div style={S.logoRow}>
          <div style={S.logo}>R</div>
          <span style={{fontSize:20,fontWeight:800,letterSpacing:-0.5}}>Rezerwo</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <ThemeToggle/>
          <LangDropdown/>
          <button style={S.panelBtn} onClick={()=>navigate("/panel")}>
            <Store size={14}/> {t.panelOwner.split(" ")[0]}
          </button>
        </div>
      </header>

      {/* hero */}
      <div style={S.hero}>
        <h1 style={S.heroTitle}>{t.searchTitle}</h1>
        <p style={S.heroSub}>{t.searchSub}</p>

        {/* search box */}
        <div style={S.searchBox} className="search-box">
          {/* name search */}
          <div style={{...S.fieldWrap, marginBottom: 10}} className="search-field">
            <Search size={15} color="#a8a2b0"/>
            <input
              style={S.sel}
              value={nameQ}
              onChange={e => setNameQ(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t.searchByName}
            />
            {nameQ && (
              <button onClick={() => setNameQ("")}
                style={{border:"none",background:"none",cursor:"pointer",color:"#a8a2b0",padding:"0 4px",display:"flex"}}>
                ×
              </button>
            )}
          </div>
          <div style={S.searchRow} className="search-row">
            {(() => {
              const cityOpts: SelectOption[] = [
                { value: "", label: t.allCities },
                ...(meta ? Object.keys(meta.cities).map(c => ({ value: c, label: c })) : []),
              ];
              const distOpts: SelectOption[] = [
                { value: "", label: t.allDistricts },
                ...districts.map(d => ({ value: d, label: d })),
              ];
              return (
                <>
                  <div style={{ flex: 1, minWidth: 160 }} className="search-field">
                    <Select
                      value={city}
                      onChange={v => { setCity(v); setDistrict(""); }}
                      options={cityOpts}
                      placeholder={t.allCities}
                      searchable
                      startIcon={<MapPin size={15}/>}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  {city && districts.length > 0 && (
                    <div style={{ flex: 1, minWidth: 160 }} className="search-field">
                      <Select
                        value={district}
                        onChange={setDistrict}
                        options={distOpts}
                        placeholder={t.allDistricts}
                        startIcon={<MapPin size={15}/>}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* category chips */}
          <div style={S.catRow} className="cat-row">
            <button className="cat-chip" style={{...S.catChip,...(!category?S.catChipOn:{})}} onClick={()=>setCategory("")}>
              {t.allCategories}
            </button>
            {meta?.categories.map(c=>(
              <button key={c.id} className="cat-chip" style={{...S.catChip,...(category===c.id?S.catChipOn:{})}}
                onClick={()=>setCategory(c.id)}>
                {c.emoji} {t.catLabels[c.id] ?? c.pl}
              </button>
            ))}
          </div>

          <button style={S.searchBtn} onClick={search}>
            <Search size={16}/> {t.search}
          </button>
        </div>
      </div>

      {/* results */}
      <div style={S.results}>
        {loading && <div style={S.empty}>{t.searching}</div>}

        {!loading && searched && !results.length && (
          <div style={S.empty}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            {t.noResults}<br/>
            <span style={{fontSize:13,color:"#a8a2b0"}}>{t.noResultsSub}</span>
          </div>
        )}

        {!loading && !searched && (
          <div style={S.empty}>
            <div style={{fontSize:32,marginBottom:12}}>💅</div>
            {t.pickCity}
          </div>
        )}

        {!loading && results.length>0 && (
          <>
            <div style={S.resultsHeader}>{t.found(results.length)}</div>
            <div style={S.grid} className="biz-grid">
              {results.map(b=>(
                <BusinessCard key={b.id} biz={b}/>
              ))}
            </div>
          </>
        )}
      </div>

      <footer style={S.footer}>
        © 2025 Rezerwo · {t.footer}
        <span style={{marginLeft:16}}>
          <span style={S.footLink} onClick={()=>navigate("/panel")}>{t.panelOwner}</span>
        </span>
        <span style={{marginLeft:16}}>
          <span style={S.footLink} onClick={()=>navigate("/regulamin")}>{t.terms}</span>
        </span>
        <span style={{marginLeft:8}}>·</span>
        <span style={{marginLeft:8}}>
          <span style={S.footLink} onClick={()=>navigate("/prywatnosc")}>{t.privacy}</span>
        </span>
        <span style={{marginLeft:8}}>·</span>
        <span style={{marginLeft:8}}>
          <span style={S.footLink} onClick={()=>navigate("/pomoc")}>{t.help}</span>
        </span>
      </footer>
    </div>
  );
}

function BusinessCard({ biz }: { biz: PublicBusiness }) {
  const { t } = useTranslation();
  const cat = biz.category;
  const catLabel = t.catLabels[cat] ?? cat;

  return (
    <div className="biz-card" style={S.card} onClick={()=>navigate(`/${biz.slug}`)}>
      <div style={{...S.cardBanner,background:BANNERS[biz.banner]||BANNERS.violet}}/>
      <div style={S.cardBody}>
        <div style={S.cardTop}>
          <div style={{flex:1,minWidth:0}}>
            <div style={S.cardName}>{biz.name}</div>
            <div style={S.cardMeta}>
              <CategoryIcon id={cat} size={13} color="#a8a2b0"/>
              {" "}{catLabel}{biz.city && ` · ${biz.city}`}{biz.district && `, ${biz.district}`}
            </div>
          </div>
          {biz.verified && (
            <span style={S.verBadge}><BadgeCheck size={12}/></span>
          )}
        </div>
        {biz.about && (
          <p style={S.cardAbout}>{biz.about.length>90?biz.about.slice(0,88)+"…":biz.about}</p>
        )}
        <div style={S.cardFooter}>
          {biz.avgRating && (
            <span style={S.ratingBadge}>
              ★ {biz.avgRating.toFixed(1)}
              {(biz.reviewCount ?? 0) > 0 && <span style={{opacity:.7,fontSize:11}}> ({biz.reviewCount})</span>}
            </span>
          )}
          <span style={S.bookBtn}>{t.book} <ChevronRight size={14}/></span>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page:   {minHeight:"100vh",background:"#faf8fb",fontFamily:font},
  header: {maxWidth:900,margin:"0 auto",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  logoRow:{display:"flex",alignItems:"center",gap:10},
  logo:   {width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#7c3aed,#ec4899)",color:"#fff",fontWeight:800,fontSize:18,display:"grid",placeItems:"center",boxShadow:"0 3px 12px #7c3aed55"},
  panelBtn:{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,border:"1.5px solid #ece8f0",background:"#fff",fontSize:13,fontWeight:600,color:"#52525b",cursor:"pointer",fontFamily:font},

  hero:   {background:"radial-gradient(1200px 600px at 50% -10%,#efe4ff,#faf8fb 60%)",padding:"40px 20px 50px",textAlign:"center"},
  heroTitle:{fontSize:"clamp(26px,5vw,44px)",fontWeight:900,letterSpacing:-1,margin:"0 0 10px",color:"#1b1420"},
  heroSub:{fontSize:16,color:"#71717a",margin:"0 0 28px"},

  searchBox:{background:"#fff",borderRadius:20,padding:"20px",maxWidth:600,margin:"0 auto",boxShadow:"0 8px 40px #7c3aed18"},
  searchRow:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap" as const},
  fieldWrap:{display:"flex",alignItems:"center",gap:8,border:"1.5px solid #ece8f0",borderRadius:12,padding:"0 12px",flex:1,minWidth:160,background:"#faf8fb"},
  sel:      {border:"none",outline:"none",background:"transparent",fontSize:14,padding:"12px 0",flex:1,fontFamily:font,cursor:"pointer",color:"#1b1420"},
  catRow:   {display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:14},
  catChip:  {padding:"7px 13px",borderRadius:999,border:"1.5px solid #ece8f0",background:"#fff",fontSize:13,fontWeight:600,color:"#71717a",cursor:"pointer",fontFamily:font},
  catChipOn:{background:ACC,color:"#fff",borderColor:ACC},
  searchBtn:{width:"100%",display:"flex",justifyContent:"center",alignItems:"center",gap:8,background:"linear-gradient(135deg,#7c3aed,#ec4899)",color:"#fff",border:"none",borderRadius:13,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:font,boxShadow:"0 6px 20px #7c3aed44"},

  results:{maxWidth:900,margin:"0 auto",padding:"28px 20px 60px"},
  empty:  {textAlign:"center" as const,color:"#a8a2b0",fontSize:15,padding:"50px 0",lineHeight:1.8},
  resultsHeader:{fontSize:14,color:"#71717a",marginBottom:14},
  grid:   {display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16},

  card:     {background:"#fff",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 16px #1b142012",cursor:"pointer",transition:"transform .15s,box-shadow .15s"},
  cardBanner:{height:80},
  cardBody: {padding:"14px 16px 16px"},
  cardTop:  {display:"flex",alignItems:"flex-start",gap:8,marginBottom:6},
  cardName: {fontSize:15,fontWeight:800,letterSpacing:-0.3,marginBottom:3},
  cardMeta: {fontSize:12.5,color:"#71717a"},
  verBadge: {color:ACC,display:"flex",marginTop:2},
  cardAbout:{fontSize:13,color:"#71717a",margin:"6px 0",lineHeight:1.5},
  cardFooter:{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"},
  ratingBadge:{display:"flex",alignItems:"center",gap:3,fontSize:13,fontWeight:700,color:"#f59e0b"},
  bookBtn:  {display:"flex",alignItems:"center",gap:4,color:ACC,fontWeight:700,fontSize:13.5},

  footer:   {textAlign:"center" as const,padding:"20px",fontSize:12.5,color:"#a8a2b0"},
  footLink: {color:ACC,fontWeight:600,cursor:"pointer"},
};
