import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 38, height: 38, borderRadius: 10,
        border: "none", background: "var(--card)", color: "var(--text-muted)",
        cursor: "pointer", display: "grid", placeItems: "center",
        boxShadow: "0 1px 4px #0000000a", transition: "background .2s",
      }}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
