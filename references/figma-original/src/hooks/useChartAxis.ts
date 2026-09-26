import { useTheme } from "../theme-context";

const FONT_PX: Record<string, number> = { sm: 13, md: 15, lg: 17, xl: 19 };

/**
 * Returns Recharts tick/axis props that scale with the current font-size
 * setting and adapt their fill color for dark mode.
 *
 * Usage:  const axis = useChartAxis();
 *         <XAxis tick={axis} ... />
 *
 * For a smaller variant (e.g. dense bar labels):
 *         <XAxis tick={{ ...axis, fontSize: axis.fontSize - 1 }} ... />
 */
export function useChartAxis() {
  const { darkMode, fontSize } = useTheme();
  const base = FONT_PX[fontSize] ?? 15;
  return {
    fontSize: Math.round(base * 0.87),   // ~11 sm · 13 md · 15 lg · 17 xl
    fontFamily: "Arial, Helvetica, sans-serif",
    fill: darkMode ? "#c9c0dc" : "#6e6478",
  };
}

/** Cursor / grid helpers that also respond to dark mode */
export function useChartColors() {
  const { darkMode } = useTheme();
  return {
    grid: darkMode ? "rgba(255,255,255,0.07)" : "rgba(26,17,40,0.07)",
    cursor: darkMode ? "rgba(255,255,255,0.12)" : "rgba(26,17,40,0.12)",
    cursorFill: darkMode ? "rgba(255,255,255,0.04)" : "rgba(26,17,40,0.04)",
  };
}
