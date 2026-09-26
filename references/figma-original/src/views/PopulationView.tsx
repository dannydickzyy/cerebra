import { Users, MapPin, TrendingUp, ArrowRight, Activity, AlertTriangle } from "lucide-react";
import { Panel, SectionLabel } from "../components/ui";
import { overview } from "../data";

/* ── Site data sorted by high-risk % desc ── */
const sites = [
  { site: "Pozorrubio District Hospital", screened: 9610, high: 21.4 },
  { site: "Urdaneta City Health Office", screened: 12840, high: 18.2 },
  { site: "Asingan RHU", screened: 7180, high: 16.3 },
  { site: "Binalonan RHU", screened: 8420, high: 14.7 },
  { site: "Manaoag RHU", screened: 6730, high: 11.9 },
];

const MAX_HIGH = sites[0].high; // 21.4

/* Map risk % to a gold → terracotta → brick-red CSS gradient fill */
function barColor(pct: number): string {
  const t = pct / MAX_HIGH; // 0..1
  if (t >= 0.85) return "linear-gradient(90deg,#f07832,#e04b1a)";
  if (t >= 0.65) return "linear-gradient(90deg,#f5b731,#f07832)";
  return "linear-gradient(90deg,#f5b731,#f07832 80%)";
}

/* Small stat tile used inside the top row */
function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <Panel className="flex flex-col gap-2 p-5">
      <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-terracotta leading-snug">
        {label}
      </span>
      <div
        className="mt-1 font-display text-[1.85rem] font-extrabold leading-none tracking-tight"
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
      </div>
      <div className="text-sm font-medium leading-snug text-slate-muted">{sub}</div>
    </Panel>
  );
}

export default function PopulationView() {
  const pct = +((overview.highRisk / overview.screened) * 100).toFixed(1);

  /* SVG donut parameters */
  const R = 54;
  const STROKE = 12;
  const CIRC = 2 * Math.PI * R;
  const filled = CIRC * (pct / 100);

  return (
    <div className="animate-rise space-y-6 p-8">
      {/* ── Top row: gauge + 4 stat tiles — equal height, all rem-based ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* 1. Donut gauge card */}
        <Panel className="flex flex-col items-center gap-3 p-5 xl:col-span-1">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-terracotta leading-snug text-center">
            Population high-risk rate
          </span>

          <div className="relative w-[7rem] h-[7rem] shrink-0">
            <svg
              viewBox="0 0 140 140"
              className="w-full h-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={70} cy={70} r={R}
                fill="none"
                stroke="rgba(26,17,40,0.09)"
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
              <circle
                cx={70} cy={70} r={R}
                fill="none"
                stroke="#e04b1a"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - filled}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-risk-high">
                {pct}%
              </span>
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-muted">
                high-risk
              </span>
            </div>
          </div>

          <p className="text-center text-sm font-medium leading-snug text-slate-muted">
            {overview.highRisk.toLocaleString()} individuals warrant preventive outreach.
          </p>
        </Panel>

        {/* 2–5. Regular stat tiles */}
        <MiniStat
          label="Active screening sites"
          value="5"
          sub="RHUs & city health offices"
          accent="var(--color-terracotta)"
        />
        <MiniStat
          label="Flagged today"
          value={overview.flaggedToday.toString()}
          sub="New high-risk individuals"
          accent="var(--color-risk-high)"
        />
        <MiniStat
          label="Avg. glucose (high-risk)"
          value="184 mg/dL"
          sub="vs. 108 in low-risk group"
        />
        <MiniStat
          label="Hypertension prevalence"
          value="41%"
          sub="Among high-risk cohort"
          accent="var(--color-terracotta)"
        />
      </div>

      {/* ── Per-site ranked bars ── */}
      <Panel className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-terracotta" strokeWidth={2} />
              <SectionLabel>Outreach planning · by site</SectionLabel>
            </div>
            <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
              Where to concentrate preventive resources
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-risk-high/10 px-3 py-1 font-mono text-[11px] font-semibold text-risk-high">
            {sites.length} sites
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {sites.map((s, i) => (
            <div key={s.site}>
              {/* Label row */}
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {/* Rank badge */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(26,17,40,0.07)] font-mono text-[10px] font-bold text-slate-muted">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-ink">{s.site}</span>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-muted">
                  {s.screened.toLocaleString()} screened ·{" "}
                  <span
                    style={{
                      color: s.high > 18 ? "#e04b1a" : s.high > 14 ? "#f07832" : "#f5b731",
                    }}
                    className="font-semibold"
                  >
                    {s.high}% high-risk
                  </span>
                </span>
              </div>

              {/* Gradient bar */}
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[rgba(26,17,40,0.07)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(s.high / MAX_HIGH) * 100}%`,
                    background: barColor(s.high),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 border-t border-[rgba(26,17,40,0.07)] pt-4">
          {[
            { color: "#f5b731", label: "Low priority (< 14%)" },
            { color: "#f07832", label: "Moderate (14–18%)" },
            { color: "#e04b1a", label: "High priority (> 18%)" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[10px] text-slate-muted">{label}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Insight cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            icon: TrendingUp,
            label: "Priority alert",
            title: "Prioritize Pozorrubio",
            body: "Highest high-risk share at 21.4%. Deploy a focused hypertension & glucose screening drive immediately.",
          },
          {
            icon: Users,
            label: "Backlog",
            title: "Follow-up backlog",
            body: "1,204 high-risk individuals flagged but not yet contacted for preventive counseling.",
          },
          {
            icon: MapPin,
            label: "Coverage",
            title: "Coverage gap",
            body: "Rural barangays near Manaoag show low screening volume relative to estimated population.",
          },
        ].map((r) => (
          <div
            key={r.title}
            className="rounded-2xl border border-[rgba(212,81,26,0.20)] bg-[rgba(212,81,26,0.06)] p-6 shadow-[0_2px_12px_-6px_rgba(212,81,26,0.15)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta/15">
                <r.icon className="h-5 w-5 text-terracotta" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-terracotta">
                  {r.label}
                </span>
                <h4 className="mt-0.5 font-display text-base font-semibold tracking-tight text-ink">
                  {r.title}
                </h4>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-muted">{r.body}</p>
            <button className="mt-4 flex items-center gap-1.5 text-sm font-medium text-terracotta-deep transition-all hover:gap-3">
              Plan outreach <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
