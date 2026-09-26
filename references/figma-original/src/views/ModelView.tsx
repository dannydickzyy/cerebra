import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
} from "recharts";
import { Panel, SectionLabel, StatTile } from "../components/ui";
import { ChartCard, ChartTip } from "../components/chart";
import { overview } from "../data";
import { useChartAxis, useChartColors } from "../hooks/useChartAxis";

const models = [
  { metric: "Accuracy", LogReg: 88, RandomForest: 92, XGBoost: 94 },
  { metric: "Precision", LogReg: 74, RandomForest: 79, XGBoost: 81 },
  { metric: "Recall", LogReg: 81, RandomForest: 86, XGBoost: 90 },
  { metric: "F1-score", LogReg: 77, RandomForest: 82, XGBoost: 85 },
  { metric: "ROC-AUC", LogReg: 90, RandomForest: 94, XGBoost: 96 },
];

// Confusion matrix (test set) for the selected XGBoost model
const cm = {
  tp: 1794,
  fn: 206,
  fp: 411,
  tn: 7589,
};

export default function ModelView() {
  const axis = useChartAxis();
  const cc = useChartColors();
  const f1 = (2 * (overview.precision * overview.recall)) / (overview.precision + overview.recall);
  return (
    <div className="animate-rise space-y-6 p-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Accuracy" value={`${(overview.modelAccuracy * 100).toFixed(1)}%`} sub="Overall correctness" accent="var(--color-terracotta)" />
        <StatTile label="Precision" value={`${(overview.precision * 100).toFixed(1)}%`} sub="Of flagged, truly high-risk" accent="var(--color-terracotta)" />
        <StatTile label="Recall" value={`${(overview.recall * 100).toFixed(1)}%`} sub="Of true cases, caught" accent="var(--color-risk-low)" />
        <StatTile label="F1-score" value={f1.toFixed(3)} sub="Balance of the two" accent="var(--color-terracotta)" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          label="Benchmark"
          title="Candidate model comparison"
          hint="XGBoost selected as production model"
        >
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={models} outerRadius="72%">
              <PolarGrid stroke={cc.grid} />
              <PolarAngleAxis
                dataKey="metric"
                tick={axis}
              />
              <Radar name="Logistic Reg." dataKey="LogReg" stroke="#6e6478" fill="#6e6478" fillOpacity={0.07} strokeWidth={1.5} />
              <Radar name="Random Forest" dataKey="RandomForest" stroke={cc.cursor} fill={cc.cursor} fillOpacity={0.10} strokeWidth={1.5} />
              <Radar name="XGBoost" dataKey="XGBoost" stroke="#f07832" fill="#f07832" fillOpacity={0.25} strokeWidth={2.5} />
              <Tooltip content={<ChartTip suffix="%" />} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
            {[
              ["Logistic Reg.", "#6e6478"],
              ["Random Forest", "#1a1128"],
              ["XGBoost", "#f07832"],
            ].map(([n, c]) => (
              <span key={n} className="flex items-center gap-1.5 text-slate-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {n}
              </span>
            ))}
          </div>
        </ChartCard>

        <Panel className="p-6">
          <SectionLabel>Confusion matrix</SectionLabel>
          <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
            XGBoost · held-out test set
          </h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              {
                label: "True positive",
                value: cm.tp,
                note: "Correctly flagged",
                bg: "rgba(34,197,94,0.09)",
                border: "rgba(34,197,94,0.22)",
                color: "#22c55e",
              },
              {
                label: "False negative",
                value: cm.fn,
                note: "Missed cases",
                bg: "rgba(224,75,26,0.08)",
                border: "rgba(224,75,26,0.22)",
                color: "#e04b1a",
              },
              {
                label: "False positive",
                value: cm.fp,
                note: "False alarms",
                bg: "rgba(217,164,65,0.10)",
                border: "rgba(217,164,65,0.28)",
                color: "#f5b731",
              },
              {
                label: "True negative",
                value: cm.tn,
                note: "Correctly cleared",
                bg: "rgba(34,197,94,0.09)",
                border: "rgba(34,197,94,0.22)",
                color: "#22c55e",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl p-4"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted">
                  {c.label}
                </div>
                <div
                  className="mt-2 font-display text-[1.85rem] font-extrabold leading-none tracking-tight"
                  style={{ color: c.color }}
                >
                  {c.value.toLocaleString()}
                </div>
                <div className="mt-1.5 text-xs text-slate-muted">{c.note}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-muted">
            Recall is prioritized over precision — in screening, a missed at-risk
            person costs more than a false alarm. SMOTE addressed class imbalance
            during training.
          </p>
        </Panel>
      </div>
    </div>
  );
}
