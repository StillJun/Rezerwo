import { useState, useRef, useEffect, useCallback } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTranslation } from "../i18n";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  startIcon?: ReactNode;
  style?: CSSProperties;
}

const ACC = "#7c3aed";
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";

export function Select({ value, onChange, options, placeholder, disabled, searchable, startIcon, style }: SelectProps) {
  const { t } = useTranslation();
  const ph = placeholder ?? t.p_pickSelect;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);
  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const close = useCallback(() => { setOpen(false); setSearch(""); setFocused(-1); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 10);
  }, [open, searchable]);

  // scroll focused item into view
  useEffect(() => {
    if (focused < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-opt]");
    items[focused]?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const select = (v: string) => { onChange(v); close(); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); return; }
    if (e.key === "Enter" && focused >= 0 && filtered[focused]) { e.preventDefault(); select(filtered[focused].value); }
  };

  const triggerStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, width: "100%",
    padding: "11px 13px", borderRadius: 12,
    border: `1.5px solid ${open ? ACC : "#ece8f0"}`,
    fontSize: 14.5, background: disabled ? "#f4f1f7" : "#faf8fb",
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: font,
    color: selected ? "#1b1420" : "#b8b2c0",
    boxSizing: "border-box" as const, outline: "none", textAlign: "left" as const,
    transition: "border-color .15s",
  };

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 10, ...style }} onKeyDown={onKeyDown}>
      <button
        type="button"
        style={triggerStyle}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {startIcon && <span style={{ display: "flex", flexShrink: 0, color: "#a8a2b0" }}>{startIcon}</span>}
        <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {selected?.icon && <span style={{ display: "flex", flexShrink: 0 }}>{selected.icon}</span>}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected?.label || ph}
          </span>
        </span>
        <ChevronDown
          size={15} color="#a8a2b0"
          style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300,
            background: "#fff", borderRadius: 12, border: "1.5px solid #ece8f0",
            boxShadow: "0 8px 32px #1b142018", maxHeight: 280, overflowY: "auto",
            fontFamily: font,
          }}
        >
          {searchable && (
            <div style={{ padding: "8px 8px 4px", position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #f4f1f7" }}>
              <input
                ref={searchRef}
                value={search}
                onChange={e => { setSearch(e.target.value); setFocused(-1); }}
                placeholder={t.selectSearch}
                style={{
                  width: "100%", border: "1.5px solid #ece8f0", borderRadius: 8,
                  padding: "7px 10px", fontSize: 13.5, fontFamily: font,
                  outline: "none", boxSizing: "border-box" as const, background: "#faf8fb",
                }}
                onKeyDown={onKeyDown}
              />
            </div>
          )}
          {!filtered.length && (
            <div style={{ padding: "12px 14px", fontSize: 13.5, color: "#a8a2b0" }}>{t.selectNoResults}</div>
          )}
          {filtered.map((o, i) => (
            <div
              key={o.value}
              data-opt
              role="option"
              aria-selected={o.value === value}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", cursor: "pointer", fontSize: 14.5,
                background: i === focused ? "#f4f1f7" : o.value === value ? "#7c3aed0a" : "transparent",
                color: "#1b1420", userSelect: "none" as const,
              }}
              onMouseEnter={() => setFocused(i)}
              onMouseDown={e => { e.preventDefault(); select(o.value); }}
            >
              {o.icon && <span style={{ display: "flex", flexShrink: 0 }}>{o.icon}</span>}
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.value === value && <Check size={14} color={ACC} style={{ flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
