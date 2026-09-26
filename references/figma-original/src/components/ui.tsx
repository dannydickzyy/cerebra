import type { ReactNode, ElementType } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-[rgba(26,17,40,0.09)] bg-cream shadow-[0_1px_0_rgba(26,17,40,0.04),0_12px_30px_-24px_rgba(26,17,40,0.30)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
      {children}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: "High" | "Low" }) {
  const high = risk === "High";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider " +
        (high
          ? "bg-risk-high/12 text-risk-high"
          : "bg-risk-low/12 text-risk-low")
      }
    >
      <span
        className={
          "h-1.5 w-1.5 rounded-full " +
          (high ? "bg-risk-high" : "bg-risk-low")
        }
      />
      {risk} risk
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
  tileBg,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  /** When provided, renders a fully tinted card instead of a plain Panel */
  tileBg?: string;
  icon?: ElementType;
  iconBg?: string;
  iconColor?: string;
}) {
  const numberColor = accent ?? "var(--color-ink)";

  if (tileBg) {
    return (
      <div
        className="flex flex-col justify-between rounded-2xl p-5"
        style={{
          background: tileBg,
          border: `1px solid ${iconBg ?? "rgba(26,17,40,0.08)"}22`,
          boxShadow: "0 1px 0 rgba(26,17,40,0.03), 0 8px 24px -16px rgba(26,17,40,0.18)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: iconColor ?? "var(--color-slate-muted)" }}
          >
            {label}
          </span>
          {Icon && (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: iconBg ?? "rgba(26,17,40,0.08)" }}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={2}
                style={{ color: iconColor ?? "var(--color-ink)" }}
              />
            </div>
          )}
        </div>
        <div
          className="mt-3 font-display text-[2.1rem] font-extrabold leading-none tracking-tight"
          style={{ color: numberColor }}
        >
          {value}
        </div>
        {sub && (
          <div className="mt-2 text-xs" style={{ color: iconColor ? iconColor + "99" : "var(--color-slate-muted)" }}>
            {sub}
          </div>
        )}
      </div>
    );
  }

  return (
    <Panel className="p-5">
      <SectionLabel>{label}</SectionLabel>
      <div
        className="mt-3 font-display text-[2.1rem] font-extrabold leading-none tracking-tight"
        style={{ color: numberColor }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-sm text-slate-muted">{sub}</div>
      )}
    </Panel>
  );
}

// Radial probability gauge
export function RiskGauge({
  probability,
  risk,
  size = 190,
}: {
  probability: number;
  risk: "High" | "Low";
  size?: number;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(probability, 0), 1);
  const color = risk === "High" ? "#e04b1a" : "#22c55e";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(26,17,40,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - c * pct}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold tracking-tight" style={{ color }}>
          {Math.round(pct * 100)}%
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-muted">
          probability
        </span>
      </div>
    </div>
  );
}
