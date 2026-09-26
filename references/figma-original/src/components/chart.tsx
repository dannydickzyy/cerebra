import type { ReactNode } from "react";
import { Panel, SectionLabel } from "./ui";

export function ChartCard({
  label,
  title,
  hint,
  children,
  className = "",
}: {
  label: string;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={"p-6 " + className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{label}</SectionLabel>
          <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
            {title}
          </h3>
        </div>
        {hint && (
          <span className="max-w-[45%] text-right text-xs text-slate-muted">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </Panel>
  );
}

export function ChartTip({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgba(26,17,40,0.10)] bg-cream px-3 py-2 shadow-lg">
      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="mt-0.5 text-sm font-medium text-ink">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: p.color || p.fill }}
          />
          {p.name}: {Number(p.value).toLocaleString()}
          {suffix}
        </p>
      ))}
    </div>
  );
}
