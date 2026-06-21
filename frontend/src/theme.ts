import { useState, useEffect, useContext, createContext, createElement, useCallback } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "rz_theme";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

function getInitial(): Theme {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "dark") return "dark";
  if (v === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return createElement(ThemeCtx.Provider, { value: { theme, toggle } }, children);
}

export function useTheme() { return useContext(ThemeCtx); }
