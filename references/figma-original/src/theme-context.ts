import { createContext, useContext } from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";

interface ThemeState {
  darkMode: boolean;
  fontSize: FontSize;
}

export const ThemeContext = createContext<ThemeState>({ darkMode: false, fontSize: "md" });

export function useTheme() {
  return useContext(ThemeContext);
}
