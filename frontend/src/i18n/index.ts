import { useState, useEffect } from "react";
import { pl } from "./pl";
import { en } from "./en";
import { ru } from "./ru";
import { ua } from "./ua";
import type { T } from "./pl";

export type Lang = "pl" | "en" | "ru" | "ua";

const DICT: Record<Lang, T> = { pl, en, ru, ua };
const STORAGE_KEY = "rz_lang";

export function getLang(): Lang {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "pl" || v === "en" || v === "ru" || v === "ua") return v;
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (browser === "ru") return "ru";
  if (browser === "uk") return "ua";
  if (browser === "en") return "en";
  return "pl";
}

export function setLang(lang: Lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent("rz-lang-change", { detail: lang }));
}

export function useTranslation(): { t: T; lang: Lang; setLang: (l: Lang) => void } {
  const [lang, setLangState] = useState<Lang>(getLang);

  useEffect(() => {
    const h = (e: Event) => setLangState((e as CustomEvent<Lang>).detail);
    window.addEventListener("rz-lang-change", h);
    return () => window.removeEventListener("rz-lang-change", h);
  }, []);

  return {
    t: DICT[lang],
    lang,
    setLang: (l: Lang) => { setLang(l); setLangState(l); },
  };
}

export const FLAGS: Record<Lang, string> = { pl: "🇵🇱", en: "🇬🇧", ru: "🇷🇺", ua: "🇺🇦" };
export const LANG_LABELS: Record<Lang, string> = { pl: "PL", en: "EN", ru: "RU", ua: "UA" };
export type { T };
