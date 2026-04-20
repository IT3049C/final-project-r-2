import { useState, useEffect } from "react";

const STORAGE_KEY = "gamehub-theme";

/**
 * useTheme — persists the user's light/dark preference in localStorage and
 * applies it by setting data-theme on <html>.
 *
 * Returns { theme, toggleTheme } where theme is "dark" | "light".
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Restore saved preference, falling back to "dark".
    return localStorage.getItem(STORAGE_KEY) ?? "dark";
  });

  // Keep <html data-theme="..."> in sync whenever theme changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
