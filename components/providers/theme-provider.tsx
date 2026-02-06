"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "hive-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

// External store for theme to avoid setState in effects
let themeListeners: Array<() => void> = [];
let currentTheme: Theme = "system";
let initialized = false;

function subscribeToTheme(callback: () => void) {
  themeListeners.push(callback);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== callback);
  };
}

function getThemeSnapshot(): Theme {
  // Initialize on first client-side access
  if (typeof window !== "undefined" && !initialized) {
    currentTheme = getStoredTheme();
    initialized = true;
  }
  return currentTheme;
}

function getThemeServerSnapshot(): Theme {
  return "system";
}

function setExternalTheme(newTheme: Theme) {
  currentTheme = newTheme;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, newTheme);
  }
  themeListeners.forEach((l) => l());
}

// External store for resolved theme
let resolvedListeners: Array<() => void> = [];
let currentResolvedTheme: "light" | "dark" = "light";

function subscribeToResolved(callback: () => void) {
  resolvedListeners.push(callback);
  return () => {
    resolvedListeners = resolvedListeners.filter((l) => l !== callback);
  };
}

function getResolvedSnapshot(): "light" | "dark" {
  return currentResolvedTheme;
}

function getResolvedServerSnapshot(): "light" | "dark" {
  return "light";
}

function setResolvedTheme(resolved: "light" | "dark") {
  currentResolvedTheme = resolved;
  resolvedListeners.forEach((l) => l());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const resolvedTheme = useSyncExternalStore(
    subscribeToResolved,
    getResolvedSnapshot,
    getResolvedServerSnapshot
  );

  const mountedRef = useRef(false);

  // Resolve and apply theme - updates external system (DOM)
  useEffect(() => {
    mountedRef.current = true;
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    // Apply class to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (currentTheme === "system") {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setExternalTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
