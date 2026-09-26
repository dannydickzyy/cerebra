import { Type, Sun, Moon, Bell, Shield, ChevronRight } from "lucide-react";
import { Panel, SectionLabel } from "../components/ui";

type FontSize = "sm" | "md" | "lg" | "xl";

const SIZES: { key: FontSize; label: string; px: string; preview: string }[] = [
  { key: "sm", label: "Small",   px: "13px", preview: "Aa" },
  { key: "md", label: "Medium",  px: "15px", preview: "Aa" },
  { key: "lg", label: "Large",   px: "17px", preview: "Aa" },
  { key: "xl", label: "X-Large", px: "19px", preview: "Aa" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 " +
        (checked ? "bg-terracotta" : "bg-[rgba(26,17,40,0.15)]")
      }
    >
      <span
        className={
          "pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}

export default function SettingsView({
  fontSize,
  onFontSize,
  darkMode,
  onDarkMode,
}: {
  fontSize: FontSize;
  onFontSize: (s: FontSize) => void;
  darkMode: boolean;
  onDarkMode: (v: boolean) => void;
}) {
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6 p-8">
      {/* ── Appearance ── */}
      <Panel className="divide-y divide-[rgba(26,17,40,0.07)] px-6">
        <div className="py-5">
          <div className="flex items-center gap-2 pb-1">
            <Type className="h-4 w-4 text-terracotta" strokeWidth={2} />
            <SectionLabel>Appearance</SectionLabel>
          </div>
          <h2 className="mt-0.5 font-display text-base font-bold text-ink">
            Font size
          </h2>
          <p className="mt-1 text-xs text-slate-muted">
            Adjusts the base text size across the entire dashboard.
          </p>

          {/* Size picker */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {SIZES.map((s) => {
              const on = fontSize === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => onFontSize(s.key)}
                  className={
                    "flex flex-col items-center gap-2 rounded-xl border py-4 transition-all " +
                    (on
                      ? "border-terracotta bg-terracotta/8 shadow-sm"
                      : "border-[rgba(26,17,40,0.10)] hover:border-[rgba(26,17,40,0.20)] hover:bg-vanilla/60")
                  }
                >
                  <span
                    className="font-display font-bold leading-none"
                    style={{
                      fontSize: s.px,
                      color: on ? "var(--color-terracotta)" : "var(--color-ink)",
                    }}
                  >
                    {s.preview}
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{
                      color: on ? "var(--color-terracotta)" : "var(--color-slate-muted)",
                    }}
                  >
                    {s.label}
                  </span>
                  <span className="font-mono text-[9px] text-slate-muted/60">
                    {s.px}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live preview */}
          <div className="mt-4 rounded-xl border border-[rgba(26,17,40,0.08)] bg-vanilla/60 p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted/60 mb-2">
              Preview
            </div>
            <p className="font-display font-bold text-ink" style={{ fontSize: SIZES.find(s => s.key === fontSize)?.px }}>
              Stroke Risk Dashboard
            </p>
            <p className="text-slate-muted" style={{ fontSize: SIZES.find(s => s.key === fontSize)?.px, marginTop: "2px" }}>
              Patient: Corazon Mendoza · PT-49812 · 82% high-risk
            </p>
          </div>
        </div>

        {/* Dark mode */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {darkMode ? (
                  <Moon className="h-4 w-4 text-terracotta" strokeWidth={2} />
                ) : (
                  <Sun className="h-4 w-4 text-terracotta" strokeWidth={2} />
                )}
                <span className="text-sm font-medium text-ink">Dark mode</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-muted">
                Switch between light and dark interface
              </p>
            </div>
            <Toggle checked={darkMode} onChange={onDarkMode} />
          </div>

          {/* Theme preview */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Light preview */}
            <button
              onClick={() => onDarkMode(false)}
              className={
                "overflow-hidden rounded-xl border-2 transition-all " +
                (!darkMode ? "border-terracotta shadow-sm" : "border-transparent opacity-60 hover:opacity-100")
              }
            >
              <div className="bg-[#f9fafb] p-3">
                <div className="mb-2 flex gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#e04b1a]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#f5b731]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/60" />
                </div>
                <div className="flex gap-2">
                  <div className="w-7 rounded bg-[#1a1128] py-4" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-[#211a2e]/20" />
                    <div className="h-1.5 w-1/2 rounded bg-[#211a2e]/10" />
                    <div className="mt-2 h-6 rounded bg-white shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="border-t bg-white px-3 py-1.5 text-center font-mono text-[10px] font-medium text-[#211a2e]">
                Light
              </div>
            </button>

            {/* Dark preview */}
            <button
              onClick={() => onDarkMode(true)}
              className={
                "overflow-hidden rounded-xl border-2 transition-all " +
                (darkMode ? "border-terracotta shadow-sm" : "border-transparent opacity-60 hover:opacity-100")
              }
            >
              <div className="bg-[#13111d] p-3">
                <div className="mb-2 flex gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#e04b1a]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#f5b731]/60" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/60" />
                </div>
                <div className="flex gap-2">
                  <div className="w-7 rounded bg-[#0d0a17] py-4" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-[#ede9f8]/20" />
                    <div className="h-1.5 w-1/2 rounded bg-[#ede9f8]/10" />
                    <div className="mt-2 h-6 rounded bg-[#1c1728] shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="border-t border-[#2a2440] bg-[#1c1728] px-3 py-1.5 text-center font-mono text-[10px] font-medium text-[#ede9f8]">
                Dark
              </div>
            </button>
          </div>
        </div>
      </Panel>

      {/* ── Notifications ── */}
      <Panel className="divide-y divide-[rgba(26,17,40,0.07)] px-6">
        <div className="flex items-center gap-2 py-4">
          <Bell className="h-4 w-4 text-terracotta" strokeWidth={2} />
          <SectionLabel>Notifications</SectionLabel>
        </div>
        {[
          { label: "High-risk flag alerts", sub: "Notify when a new patient is flagged high-risk", defaultOn: true },
          { label: "Daily screening summary", sub: "End-of-day report delivered to your inbox", defaultOn: false },
          { label: "Model drift warnings", sub: "Alert if classifier performance degrades", defaultOn: true },
        ].map(({ label, sub, defaultOn }) => (
          <Row key={label} label={label} sub={sub}>
            <Toggle checked={defaultOn} onChange={() => {}} />
          </Row>
        ))}
      </Panel>

      {/* ── Privacy & data ── */}
      <Panel className="divide-y divide-[rgba(26,17,40,0.07)] px-6">
        <div className="flex items-center gap-2 py-4">
          <Shield className="h-4 w-4 text-terracotta" strokeWidth={2} />
          <SectionLabel>Privacy & data</SectionLabel>
        </div>
        {[
          { label: "Export patient records", sub: "Download all screened patient data as CSV" },
          { label: "Audit log", sub: "View all screening and prediction activity" },
          { label: "Data retention policy", sub: "Manage how long patient records are stored" },
        ].map(({ label, sub }) => (
          <Row key={label} label={label} sub={sub}>
            <ChevronRight className="h-4 w-4 text-slate-muted" />
          </Row>
        ))}
      </Panel>

      {/* ── App info ── */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-muted/60">
        <span className="font-mono">CEREBRA v1.0 · XGBoost classifier</span>
        <span className="font-mono">Research prototype — not for clinical use</span>
      </div>
    </div>
  );
}
