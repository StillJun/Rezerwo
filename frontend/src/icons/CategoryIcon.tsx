import type { CSSProperties } from "react";

const ACC = "#7c3aed";

interface Props { id: string; size?: number; color?: string; style?: CSSProperties; }

const ICONS: Record<string, (c: string, s: number) => JSX.Element> = {
  nails: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 5 5.5 5 9c0 4 3 7 7 7s7-3 7-7c0-3.5-3-7-7-7z"/>
      <path d="M12 16v6M9 22h6"/>
    </svg>
  ),
  barber: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v18M18 3v18M6 12h12"/>
      <circle cx="6" cy="3" r="1.5"/><circle cx="18" cy="3" r="1.5"/>
      <circle cx="6" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/>
    </svg>
  ),
  hair: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2l2 6-4 4 4 4-2 6M18 2l-2 6 4 4-4 4 2 6"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
    </svg>
  ),
  brows: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8c3-3 7-4 10-3 3 1 7 2 10-1"/>
      <path d="M2 14c3-3 7-4 10-3 3 1 7 2 10-1"/>
    </svg>
  ),
  tattoo: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
    </svg>
  ),
  beauty: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 015 5c0 2.5-1.5 4.5-3 6l-2 9-2-9C8.5 11.5 7 9.5 7 7a5 5 0 015-5z"/>
    </svg>
  ),
  laser: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83"/>
    </svg>
  ),
  sugaring: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-7 6-7 12a7 7 0 0014 0c0-6-7-12-7-12z"/>
      <path d="M12 8v8M9 11l3-3 3 3"/>
    </svg>
  ),
  lashes: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c0 0 4-6 10-6s10 6 10 6-4 6-10 6-10-6-10-6z"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M8 6l-1-3M12 5V2M16 6l1-3"/>
    </svg>
  ),
  massage: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  spa: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12M12 12C12 12 7 9 7 5a5 5 0 0110 0c0 4-5 7-5 7z"/>
      <path d="M12 12C12 12 17 9 20 6"/>
      <path d="M12 12C12 12 7 9 4 6"/>
    </svg>
  ),
  cosmetology: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
    </svg>
  ),
  makeup: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  ),
  aesthetic: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  podology: (c, s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 12h.01M15 8h.01M19 8h.01M13 12h.01"/>
      <path d="M5 20c0-4 2-7 5-9l2-9 2 9c3 2 5 5 5 9H5z"/>
    </svg>
  ),
};

const DEFAULT_ICON = (c: string, s: number) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
);

export function CategoryIcon({ id, size = 20, color = ACC, style }: Props) {
  const render = ICONS[id] ?? DEFAULT_ICON;
  return <span style={{ display: "inline-flex", alignItems: "center", ...style }}>{render(color, size)}</span>;
}
