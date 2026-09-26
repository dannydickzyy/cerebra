import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from "recharts";
import { Panel, SectionLabel, RiskGauge, RiskBadge } from "../components/ui";
import { ChartTip } from "../components/chart";
import { type ScreenedPatient } from "../data";
import { usePatients } from "../store";
import { useChartAxis, useChartColors } from "../hooks/useChartAxis";

/* Derive initials from full name */
function initials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Contribution bars relative to total */
function contributions(p: ScreenedPatient) {
  const raw = {
    Age: Math.min(p.age / 90, 1) * 0.31,
    "Glucose level": Math.min(Math.max(p.glucose - 80, 0) / 180, 1) * 0.24,
    Hypertension: (p.hypertension ? 1 : 0.05) * 0.17,
    BMI: Math.min(Math.max(p.bmi - 18, 0) / 25, 1) * 0.13,
    "Heart disease": (p.heartDisease ? 1 : 0.04) * 0.09,
    Smoking:
      (p.smoking === "Smokes" ? 1 : p.smoking === "Formerly smoked" ? 0.5 : 0.05) *
      0.06,
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.entries(raw)
    .map(([factor, v]) => ({ factor, weight: +((v / total) * 100).toFixed(1) }))
    .sort((a, b) => b.weight - a.weight);
}

/* Bar fill by rank */
const BAR_FILL = ["#e04b1a", "#f07832", "#f5b731", "#f5b731", "#6e6478", "#6e6478"];

export default function BreakdownView() {
  const { patients } = usePatients();
  const axis = useChartAxis();
  const cc = useChartColors();
  const [selectedId, setSelectedId] = useState<string>(patients[0]?.id ?? "");
  const selected = patients.find((p) => p.id === selectedId) ?? patients[0];
  const bars = contributions(selected);

  return (
    <div className="animate-rise grid grid-cols-1 gap-6 p-8 xl:grid-cols-[300px_1fr]">
      {/* ── Left: patient list ── */}
      <Panel className="flex flex-col p-5">
        <SectionLabel>Select patient</SectionLabel>
        <p className="mt-1 text-xs text-slate-muted/70">
          {patients.length} patients in store
        </p>

        <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {patients.map((p) => {
            const on = p.id === selected.id;
            const high = p.risk === "High";

            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all " +
                    (on
                      ? "border-terracotta/40 bg-terracotta/8 shadow-[0_0_0_1px_rgba(212,81,26,0.25)]"
                      : "border-[rgba(26,17,40,0.08)] hover:border-[rgba(26,17,40,0.14)] hover:bg-vanilla/70")
                  }
                >
                  {/* Initials avatar — solid ring, vivid background */}
                  <div
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-extrabold ring-2 " +
                      (high
                        ? "bg-risk-high/20 text-risk-high ring-risk-high/30"
                        : "bg-risk-low/20 text-risk-low ring-risk-low/30")
                    }
                  >
                    {initials(p.name)}
                  </div>

                  {/* Name + ID + age */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                    <p className="font-mono text-[10px] font-semibold text-terracotta">
                      {p.id}
                    </p>
                    <p className="font-mono text-[10px] text-slate-muted">
                      age {p.age}
                    </p>
                  </div>

                  {/* Risk % badge pill */}
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold " +
                      (high
                        ? "bg-risk-high/15 text-risk-high"
                        : "bg-risk-low/15 text-risk-low")
                    }
                  >
                    {Math.round(p.probability * 100)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* ── Right: detail + contribution ── */}
      <div className="flex flex-col gap-6">
        {/* Individual explanation */}
        <Panel className="p-7">
          <SectionLabel>Individual explanation</SectionLabel>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Probability gauge */}
            <div className="shrink-0">
              <RiskGauge
                probability={selected.probability}
                risk={selected.risk}
                size={180}
              />
            </div>

            {/* Identity + clinical grid */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                  {selected.name}
                </h2>
                <RiskBadge risk={selected.risk} />
              </div>

              <p className="mt-1 font-mono text-xs text-slate-muted">
                {selected.id} · age {selected.age}
              </p>

              {/* Clinical detail grid */}
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {[
                  ["Glucose", `${selected.glucose} mg/dL`],
                  ["BMI", String(selected.bmi)],
                  ["Smoking", selected.smoking],
                  ["Hypertension", selected.hypertension ? "Yes" : "No"],
                  ["Heart disease", selected.heartDisease ? "Yes" : "No"],
                  ["Ever married", selected.married ? "Yes" : "No"],
                  ["Work type", selected.workType],
                  ["Residence", selected.residence],
                  ["Screened", selected.screened],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-muted/70">
                      {k}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-ink">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Risk factor contribution */}
        <Panel className="p-7">
          <SectionLabel>Risk factor contribution</SectionLabel>
          <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
            Which factors drove this score
          </h3>

          <ResponsiveContainer width="100%" height={260} className="mt-2">
            <BarChart
              data={bars}
              layout="vertical"
              margin={{ left: 8, right: 32, top: 8, bottom: 0 }}
            >
              <XAxis type="number" hide domain={[0, 60]} />
              <YAxis
                type="category"
                dataKey="factor"
                tick={{ ...axis, fontSize: Math.max(axis.fontSize - 1, 10) }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                content={<ChartTip suffix="%" />}
                cursor={{ fill: cc.cursorFill }}
              />
              <Bar dataKey="weight" name="Contribution" radius={[0, 6, 6, 0]} barSize={22}>
                {bars.map((_, i) => (
                  <Cell key={i} fill={BAR_FILL[i] ?? "#6e6478"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Caption */}
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-vanilla/60 px-4 py-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-terracotta" />
            <p className="text-xs leading-relaxed text-slate-muted">
              The two largest drivers give a health worker talking points for
              personalized preventive counseling.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
