import { useState, useContext, createContext, createElement, useCallback } from "react";
import type { ReactNode } from "react";
import { pl } from "./pl";
import { en } from "./en";
import { ru } from "./ru";
import { ua } from "./ua";
import type { T } from "./pl";

export type Lang = "pl" | "en" | "ru" | "ua";
const DICT: Record<Lang, T> = { pl, en, ru, ua };
const STORAGE_KEY = "rz_lang";

function getInitialLang(): Lang {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "pl" || v === "en" || v === "ru" || v === "ua") return v;
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (browser === "ru") return "ru";
  if (browser === "uk") return "ua";
  if (browser === "en") return "en";
  return "pl";
}

type LangCtx = { lang: Lang; t: T; setLang: (l: Lang) => void };
const LangContext = createContext<LangCtx>({ lang: "pl", t: pl, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);
  return createElement(LangContext.Provider, { value: { lang, t: DICT[lang], setLang } }, children);
}

export function useTranslation(): { t: T; lang: Lang; setLang: (l: Lang) => void } {
  return useContext(LangContext);
}

export const FLAGS: Record<Lang, string> = { pl: "🇵🇱", en: "🇬🇧", ru: "🇷🇺", ua: "🇺🇦" };
export const LANG_LABELS: Record<Lang, string> = { pl: "PL", en: "EN", ru: "RU", ua: "UA" };
export type { T };
