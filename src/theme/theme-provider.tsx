import { File, Paths } from "expo-file-system";
import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, setActiveColors } from "@/theme/colors";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: "light" | "dark";
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const preferenceFile = () => new File(Paths.document, "xontaom-theme.txt");

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const scheme = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  setActiveColors(scheme === "dark" ? darkColors : lightColors);

  useEffect(() => {
    try {
      if (process.env.EXPO_OS === "web") {
        const saved = globalThis.localStorage?.getItem("xontaom-theme");
        if (isThemeMode(saved)) setModeState(saved);
        return;
      }
      const file = preferenceFile();
      if (file.exists) {
        void file.text().then((saved) => { if (isThemeMode(saved)) setModeState(saved); });
      }
    } catch {
      // The system theme remains available if preference storage is unavailable.
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      if (process.env.EXPO_OS === "web") {
        globalThis.localStorage?.setItem("xontaom-theme", next);
        return;
      }
      const file = preferenceFile();
      file.create({ overwrite: true, intermediates: true });
      file.write(next);
    } catch {
      // Keep the selected theme active for this session if persistence fails.
    }
  }, []);

  const value = useMemo(() => ({ mode, scheme, isDark: scheme === "dark", setMode }), [mode, scheme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = use(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside AppThemeProvider");
  return value;
}
