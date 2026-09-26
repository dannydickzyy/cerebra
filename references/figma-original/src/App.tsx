import { useState, useEffect } from "react";
import Sidebar, { type ViewKey } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardView from "./views/DashboardView";
import PredictionView from "./views/PredictionView";
import BreakdownView from "./views/BreakdownView";
import PopulationView from "./views/PopulationView";
import PatientsView from "./views/PatientsView";
import ModelView from "./views/ModelView";
import SettingsView from "./views/SettingsView";
import { PatientsProvider } from "./store";
import { ThemeContext, type FontSize } from "./theme-context";
const FONT_PX: Record<FontSize, string> = {
  sm: "13px",
  md: "15px",
  lg: "17px",
  xl: "19px",
};

const meta: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Health analytics overview",
    subtitle: "Stroke-risk screening across all sites — at a glance",
  },
  predict: {
    title: "Risk prediction",
    subtitle: "Enter a patient profile to estimate stroke likelihood",
  },
  breakdown: {
    title: "Risk factor breakdown",
    subtitle: "Per-individual explanation of what drives each prediction",
  },
  population: {
    title: "Population health",
    subtitle: "Aggregate risk patterns for outreach planning",
  },
  patients: {
    title: "Screened patients",
    subtitle: "Every individual assessed by the classifier",
  },
  model: {
    title: "Model performance",
    subtitle: "Classification metrics and candidate benchmarking",
  },
  settings: {
    title: "Settings",
    subtitle: "Appearance, notifications, and data preferences",
  },
};

export default function App() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PX[fontSize];
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const views: Record<ViewKey, React.ReactNode> = {
    dashboard: <DashboardView />,
    predict: <PredictionView />,
    breakdown: <BreakdownView />,
    population: <PopulationView />,
    patients: <PatientsView />,
    model: <ModelView />,
    settings: (
      <SettingsView
        fontSize={fontSize}
        onFontSize={setFontSize}
        darkMode={darkMode}
        onDarkMode={setDarkMode}
      />
    ),
  };

  return (
    <ThemeContext.Provider value={{ darkMode, fontSize }}>
    <PatientsProvider>
      <div className="flex h-screen overflow-hidden bg-vanilla text-ink">
        <Sidebar active={view} onChange={setView} darkMode={darkMode} onDarkMode={setDarkMode} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Topbar
            title={meta[view].title}
            subtitle={meta[view].subtitle}
            onNew={() => setView("predict")}
            darkMode={darkMode}
            onDarkMode={setDarkMode}
          />
          <div key={view}>{views[view]}</div>
        </main>
      </div>
    </PatientsProvider>
    </ThemeContext.Provider>
  );
}
