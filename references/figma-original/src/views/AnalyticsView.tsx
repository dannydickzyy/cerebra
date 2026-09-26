import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Dot,
} from "recharts";
import { ChartCard, ChartTip } from "../components/chart";
import { glucoseRisk, bmiRisk, ageRisk, smokingSplit } from "../data";
import { useChartAxis, useChartColors } from "../hooks/useChartAxis";

/* Gold → Terracotta → Brick-red gradient by index */
function barFill(i: number, len: number): string {
  const pct = i / Math.max(len - 1, 1);
  if (pct < 0.35) return "#f5b731";
  if (pct < 0.65) return "#f07832";
  return "#e04b1a";
}

const smokingTotal = smokingSplit.reduce((a, b) => a + b.value, 0);

export default function AnalyticsView() {
  const axis = useChartAxis();
  const cc = useChartColors();
  return (
    <div className="animate-rise space-y-6 p-8">
      {/* Helper italic line */}
      <p className="max-w-2xl text-sm italic leading-relaxed text-slate-muted">
        Visual summaries of risk-factor distributions across the analyzed population
        (e.g., glucose level vs. risk, BMI vs. risk).
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Top-left: Glucose vs risk ── */}
        <ChartCard
          label="Metabolic"
          title="Glucose level vs. risk"
          hint="Mean high-risk % per glucose bucket (mg/dL)"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={glucoseRisk} margin={{ left: 4, right: 16, top: 12 }}>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis dataKey="level" tick={axis} axisLine={false} tickLine={false} />
              <YAxis
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={48}
                unit="%"
              />
              <Tooltip
                content={<ChartTip suffix="%" />}
                cursor={{ stroke: cc.cursor, strokeDasharray: "4 3" }}
              />
              <Line
                type="monotone"
                dataKey="highRisk"
                name="High-risk"
                stroke="#3d4fc8"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy } = props;
                  return (
                    <Dot
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#f07832"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 7, fill: "#f07832", stroke: "#fffcf6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Top-right: BMI vs risk ── */}
        <ChartCard
          label="Anthropometric"
          title="BMI vs. risk"
          hint="Mean high-risk % per BMI category"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bmiRisk} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis
                dataKey="band"
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={48}
                unit="%"
              />
              <Tooltip
                content={<ChartTip suffix="%" />}
                cursor={{ fill: cc.cursorFill }}
              />
              <Bar dataKey="highRisk" name="High-risk" radius={[6, 6, 0, 0]} barSize={34}>
                {bmiRisk.map((_, i) => (
                  <Cell key={i} fill={barFill(i, bmiRisk.length)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Bottom-left: Age band ── */}
        <ChartCard
          label="Demographic"
          title="High-risk share by age band"
          hint="% flagged high-risk within each cohort"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ageRisk} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis dataKey="band" tick={axis} axisLine={false} tickLine={false} />
              <YAxis
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={48}
                unit="%"
              />
              <Tooltip
                content={<ChartTip suffix="%" />}
                cursor={{ fill: cc.cursorFill }}
              />
              <Bar dataKey="highRisk" name="High-risk" radius={[6, 6, 0, 0]} barSize={34}>
                {ageRisk.map((_, i) => (
                  <Cell key={i} fill={barFill(i, ageRisk.length)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Bottom-right: Smoking donut ── */}
        <ChartCard
          label="Lifestyle"
          title="Smoking status distribution"
          hint="Screened population composition"
        >
          <div className="mt-2 flex items-center gap-4">
            {/* Donut */}
            <div className="relative shrink-0">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={smokingSplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {smokingSplit.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTip />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold tracking-tight text-ink">
                  {smokingSplit.length}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-muted">
                  categories
                </span>
              </div>
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-3">
              {smokingSplit.map((s) => {
                const pct = ((s.value / smokingTotal) * 100).toFixed(0);
                return (
                  <li key={s.name} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="flex-1 text-sm text-ink">{s.name}</span>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {pct}%
                    </span>
                  </li>
                );
              })}
              <li className="pt-1 font-mono text-[10px] text-slate-muted/70">
                n = {smokingTotal.toLocaleString()} screened
              </li>
            </ul>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
