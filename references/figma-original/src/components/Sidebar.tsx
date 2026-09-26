import { useState } from "react";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Activity,
  ClipboardList,
  Gauge,
  Settings,
  LifeBuoy,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export type ViewKey =
  | "dashboard"
  | "predict"
  | "breakdown"
  | "population"
  | "patients"
  | "model"
  | "settings";

const nav: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "predict", label: "Risk prediction", icon: Stethoscope },
  { key: "breakdown", label: "Risk breakdown", icon: Activity },
  { key: "population", label: "Population health", icon: Users },
  { key: "patients", label: "Screened patients", icon: ClipboardList },
  { key: "model", label: "Model performance", icon: Gauge },
];

/* ── Circuit brain logo mark ── */
function LogoMark({ size = 52 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Terracotta glow halo behind the logo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 60% 38%, rgba(212,81,26,0.55) 0%, rgba(212,81,26,0.18) 45%, transparent 70%)",
          transform: "scale(1.15)",
        }}
      />
      <img
        src="/src/assets/cerebra-logo.png"
        alt="CEREBRA logo"
        width={size}
        height={size}
        className="relative h-full w-full object-contain"
        style={{
          filter: "drop-shadow(0 0 6px rgba(212,81,26,0.7)) drop-shadow(0 2px 8px rgba(0,0,0,0.5)) brightness(1.15)",
        }}
      />
    </div>
  );
}

/* ── Neural brain decorative card ── */
function NeuralCard() {
  return (
    <div
      className="relative mx-3 mb-3 overflow-hidden rounded-2xl border border-white/8"
      style={{
        background:
          "linear-gradient(135deg, #0d0a17 0%, #1a1128 55%, #271040 100%)",
      }}
    >
      {/* Neural SVG background */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 220 110"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="nglow" cx="75%" cy="25%" r="55%">
            <stop offset="0%" stopColor="#d4511a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d4511a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="220" height="110" fill="url(#nglow)" />
        {/* Tendril paths */}
        <path
          d="M0 55 Q35 35 65 50 Q100 65 130 40 Q160 18 190 45 Q205 55 220 48"
          stroke="#f07832"
          strokeWidth="0.7"
          fill="none"
          strokeOpacity="0.4"
        />
        <path
          d="M0 80 Q40 65 80 78 Q120 90 160 72 Q188 60 220 74"
          stroke="#d4511a"
          strokeWidth="0.7"
          fill="none"
          strokeOpacity="0.35"
        />
        <path
          d="M0 28 Q50 42 100 25 Q145 10 185 32 Q205 42 220 30"
          stroke="#f5b731"
          strokeWidth="0.5"
          fill="none"
          strokeOpacity="0.22"
        />
        {/* Synapse nodes */}
        {([
          [65, 50],
          [130, 40],
          [80, 78],
          [160, 72],
          [100, 25],
        ] as [number, number][]).map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={1.6}
            fill="#d4511a"
            fillOpacity="0.75"
          />
        ))}
      </svg>

      {/* Orange glow orb — top right */}
      <div
        className="pointer-events-none absolute -right-3 -top-5 h-20 w-20 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,81,26,0.65) 0%, transparent 70%)",
        }}
      />

      {/* Content row */}
      <div className="relative flex items-center gap-3 px-4 py-3.5">
        {/* Mini brain — uses the actual logo asset */}
        <div className="relative h-14 w-14 shrink-0">
          <img
            src="/src/assets/cerebra-logo.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
            style={{
              filter: "drop-shadow(0 0 5px rgba(212,81,26,0.65)) brightness(1.15)",
            }}
          />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/38">
            AI-Powered
          </div>
          <div className="mt-0.5 font-display text-sm font-bold leading-tight text-white">
            Neural Analytics
          </div>
          <div
            className="mt-1 font-mono text-[8.5px] font-semibold"
            style={{ color: "var(--color-terracotta)" }}
          >
            XGBoost · Active
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  active,
  onChange,
}: {
  active: ViewKey;
  onChange: (v: ViewKey) => void;
  darkMode?: boolean;
  onDarkMode?: (v: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={
        "flex h-screen shrink-0 flex-col bg-indigo-ink text-white/90 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] " +
        (collapsed ? "w-[76px]" : "w-[268px]")
      }
    >
      {/* ── Brand header ── */}
      <div
        className={
          "flex items-center gap-3 pb-5 pt-6 " +
          (collapsed ? "justify-center px-3" : "px-5")
        }
      >
        <LogoMark size={52} />

        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-display text-[1.15rem] font-extrabold tracking-tight text-white">
              CEREBRA
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">
              Stroke Analytics
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-3">
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className={"mb-5 h-px bg-white/10 " + (collapsed ? "mx-3" : "mx-5")} />

      {/* ── Nav ── */}
      <nav className={"flex-1 overflow-y-auto " + (collapsed ? "px-2" : "px-4")}>
        {!collapsed && (
          <p className="px-2 pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            Workspace
          </p>
        )}
        <ul className="space-y-1.5">
          {nav.map(({ key, label, icon: Icon }) => {
            const on = active === key;
            return (
              <li key={key}>
                <button
                  onClick={() => onChange(key)}
                  title={collapsed ? label : undefined}
                  className={
                    "group flex w-full items-center gap-3 rounded-xl text-sm transition-all duration-200 " +
                    (collapsed ? "justify-center px-0 py-3" : "px-3 py-3") +
                    " " +
                    (on
                      ? "bg-terracotta/15 font-medium text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white")
                  }
                >
                  <Icon
                    className={
                      "h-[18px] w-[18px] shrink-0 " +
                      (on
                        ? "text-terracotta"
                        : "text-white/40 group-hover:text-white")
                    }
                    strokeWidth={2}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && on && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-terracotta" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Neural brain decoration (expanded only) ── */}
      {!collapsed && <NeuralCard />}

      {/* ── Bottom utilities ── */}
      <div className={"pb-3 pt-3 " + (collapsed ? "px-2" : "px-4")}>
        <div className={"mb-4 h-px bg-white/10 " + (collapsed ? "mx-1" : "mx-2")} />
        <ul className="space-y-1.5">
          <li>
            <button
              onClick={() => onChange("settings")}
              title={collapsed ? "Settings" : undefined}
              className={
                "flex w-full items-center gap-3 rounded-xl text-sm transition-all duration-200 " +
                (collapsed ? "justify-center px-0 py-2" : "px-3 py-2") +
                " " +
                (active === "settings"
                  ? "bg-terracotta/15 font-medium text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white")
              }
            >
              <Settings
                className={
                  "h-[18px] w-[18px] shrink-0 " +
                  (active === "settings" ? "text-terracotta" : "text-white/40")
                }
                strokeWidth={2}
              />
              {!collapsed && "Settings"}
            </button>
          </li>
          <li>
            <button
              title={collapsed ? "Help & support" : undefined}
              className={
                "flex w-full items-center gap-3 rounded-xl text-sm text-white/60 transition-colors hover:bg-white/8 hover:text-white " +
                (collapsed ? "justify-center px-0 py-2" : "px-3 py-2")
              }
            >
              <LifeBuoy
                className="h-[18px] w-[18px] shrink-0 text-white/40"
                strokeWidth={2}
              />
              {!collapsed && "Help & support"}
            </button>
          </li>
        </ul>
      </div>

      {/* ── User card ── */}
      <div
        className={
          "border-t border-white/10 py-3 " + (collapsed ? "px-2" : "px-4")
        }
      >
        <button
          title={collapsed ? "Dr. Danny Padua" : undefined}
          className={
            "flex w-full items-center gap-3 rounded-xl text-left transition-colors hover:bg-white/8 " +
            (collapsed ? "justify-center px-0 py-2" : "px-2 py-2")
          }
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ring-2 ring-terracotta/40"
            style={{ background: "var(--color-terracotta)" }}>
            DP
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-semibold text-white">
                  Dr. Danny Padua
                </div>
                <div className="truncate text-xs text-white/45">
                  Screening lead
                </div>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 text-white/35" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
