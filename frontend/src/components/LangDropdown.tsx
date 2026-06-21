import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { useTranslation, FLAGS, LANG_LABELS } from "../i18n";
import type { Lang } from "../i18n";

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";

export function LangDropdown() {
  const { lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const LANGS: Lang[] = ["pl", "en", "ru", "ua"];

  return (
    <div ref={ref} style={{ position: "relative" as const }}>
      <button style={S.trigger} onClick={() => setOpen(v => !v)} aria-label="Language">
        🌐 {LANG_LABELS[lang]}
        <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={S.menu} role="listbox">
          {LANGS.map(l => (
            <button
              key={l}
              role="option"
              aria-selected={lang === l}
              style={{ ...S.item, ...(lang === l ? S.itemActive : {}) }}
              onClick={() => { setLang(l); setOpen(false); }}
            >
              {FLAGS[l]} {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  trigger: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "7px 11px", borderRadius: 10,
    border: "1.5px solid #ece8f0", background: "#fff",
    fontSize: 13, fontWeight: 600, color: "#52525b",
    cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
  },
  menu: {
    position: "absolute", top: "calc(100% + 6px)", right: 0,
    background: "#fff", border: "1.5px solid #ece8f0",
    borderRadius: 12, boxShadow: "0 8px 30px #1b142018",
    zIndex: 200, minWidth: 110, overflow: "hidden",
  },
  item: {
    display: "flex", alignItems: "center", gap: 8,
    width: "100%", padding: "10px 14px",
    border: "none", background: "transparent",
    fontSize: 13, fontWeight: 600, color: "#52525b",
    cursor: "pointer", fontFamily: font, textAlign: "left",
  },
  itemActive: { background: "#f4f1f7", color: "#7c3aed" },
};
