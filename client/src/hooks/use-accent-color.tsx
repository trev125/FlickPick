import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const ACCENT_COLORS = [
  { name: "Indigo", value: "#818cf8", dark: "#6366f1" },
  { name: "Purple", value: "#a78bfa", dark: "#8b5cf6" },
  { name: "Pink", value: "#f472b6", dark: "#ec4899" },
  { name: "Rose", value: "#fb7185", dark: "#f43f5e" },
  { name: "Red", value: "#f87171", dark: "#ef4444" },
  { name: "Orange", value: "#fb923c", dark: "#f97316" },
  { name: "Amber", value: "#fbbf24", dark: "#f59e0b" },
  { name: "Yellow", value: "#facc15", dark: "#eab308" },
  { name: "Lime", value: "#a3e635", dark: "#84cc16" },
  { name: "Green", value: "#4ade80", dark: "#22c55e" },
  { name: "Emerald", value: "#34d399", dark: "#10b981" },
  { name: "Teal", value: "#2dd4bf", dark: "#14b8a6" },
  { name: "Cyan", value: "#22d3ee", dark: "#06b6d4" },
  { name: "Sky", value: "#38bdf8", dark: "#0ea5e9" },
  { name: "Blue", value: "#60a5fa", dark: "#3b82f6" },
] as const;

interface AccentColorContextType {
  accentColor: typeof ACCENT_COLORS[number];
  setAccentColor: (color: typeof ACCENT_COLORS[number]) => void;
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState<typeof ACCENT_COLORS[number]>(() => {
    const stored = localStorage.getItem("flickpick-accent");
    if (stored) {
      const found = ACCENT_COLORS.find(c => c.name === stored);
      if (found) return found;
    }
    return ACCENT_COLORS[0]; // Default to Indigo
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", accentColor.value);
    root.style.setProperty("--color-accent", accentColor.dark);
    root.style.setProperty("--color-ring", accentColor.dark);
    localStorage.setItem("flickpick-accent", accentColor.name);
  }, [accentColor]);

  const setAccentColor = (color: typeof ACCENT_COLORS[number]) => {
    setAccentColorState(color);
  };

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const context = useContext(AccentColorContext);
  if (!context) {
    throw new Error("useAccentColor must be used within an AccentColorProvider");
  }
  return context;
}
