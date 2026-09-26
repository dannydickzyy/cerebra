import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { ArrowUpRight, TriangleAlert, Users, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { StatTile, Panel, SectionLabel } from "../components/ui";
import { ChartCard, ChartTip } from "../components/chart";
import {
  overview,
  throughput,
  globalImportance,
  ageRisk,
  residenceSplit,
  workTypeRisk,
  glucoseRisk,
  bmiRisk,
  smokingSplit,
} from "../data";
import { usePatients } from "../store";
import { useChartAxis, useChartColors } from "../hooks/useChartAxis";

const smokingTotal = smokingSplit.reduce((a, b) => a + b.value, 0);

function barFill(i: number, len: number): string {
  const pct = i / Math.max(len - 1, 1);
  if (pct < 0.35) return "#f5b731";
  if (pct < 0.65) return "#f07832";
  return "#e04b1a";
}

export default function DashboardView() {
  const axis = useChartAxis();
  const cc = useChartColors();
  const { patients } = usePatients();
  const highRiskPct = ((overview.highRisk / overview.screened) * 100).toFixed(1);
  const flagged = patients.filter((p) => p.risk === "High").slice(0, 4);

  const residenceCases = residenceSplit
    .map((r) => ({
      name: r.name,
      cases: Math.round((r.value * r.highRisk) / 100),
      color: r.color,
    }))
    .sort((a, b) => b.cases - a.cases);
  const topResidence = residenceCases[0];

  const workCases = workTypeRisk
    .map((w) => ({
      type: w.type,
      cases: Math.round((w.screened * w.highRisk) / 100),
    }))
    .sort((a, b) => b.cases - a.cases);
  const topWork = workCases[0];

  return (
    <div className="animate-rise space-y-6 p-6">

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Patients screened"
          value={overview.screened.toLocaleString()}
          sub="Across all screening sites"
          tileBg="#eef0fa"
          icon={Users}
          iconBg="rgba(26,17,40,0.10)"
          iconColor="#1a1128"
          accent="#1a1128"
        />
        <StatTile
          label="Flagged high-risk"
          value={`${highRiskPct}%`}
          sub={`${overview.highRisk.toLocaleString()} individuals`}
          tileBg="#fdebe9"
          icon={AlertTriangle}
          iconBg="rgba(224,75,26,0.14)"
          iconColor="#e04b1a"
          accent="#e04b1a"
        />
        <StatTile
          label="Model recall"
          value={`${(overview.recall * 100).toFixed(1)}%`}
          sub="Actual stroke cases caught"
          tileBg="#eef5ec"
          icon={Target}
          iconBg="rgba(92,122,90,0.16)"
          iconColor="#22c55e"
          accent="#22c55e"
        />
        <StatTile
          label="ROC–AUC"
          value={overview.rocAuc.toFixed(3)}
          sub="Discriminative ability"
          tileBg="#fdf3e3"
          icon={TrendingUp}
          iconBg="rgba(217,164,65,0.18)"
          iconColor="#f5b731"
          accent="#f5b731"
        />
      </div>

      {/* ── Throughput + Feature importance ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          label="Throughput"
          title="Screenings & high-risk flags"
          hint="Monthly volume, last 6 months"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={throughput} margin={{ left: 4, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gScreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f07832" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#f07832" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e04b1a" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#e04b1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: cc.cursor }} />
              <Area type="monotone" dataKey="screened" name="Screened" stroke="#f07832" strokeWidth={2.5} fill="url(#gScreen)" />
              <Area type="monotone" dataKey="high" name="High-risk" stroke="#e04b1a" strokeWidth={2} fill="url(#gHigh)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard label="Global drivers" title="Feature importance" hint="What the model weighs most">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={globalImportance} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide domain={[0, 0.35]} />
              <YAxis
                type="category"
                dataKey="factor"
                tick={{ ...axis, fontSize: Math.max(axis.fontSize - 1, 10) }}
                axisLine={false}
                tickLine={false}
                width={104}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: cc.cursorFill }} />
              <Bar dataKey="weight" name="Weight" radius={[0, 6, 6, 0]} barSize={16}>
                {globalImportance.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#d4511a" : i < 3 ? "#f07832" : "#f5b731"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Risk factor analysis ── */}
      <div>
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-terracotta">
          Risk factor analysis
        </p>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard label="Metabolic" title="Glucose level vs. risk" hint="Mean high-risk % per glucose bucket (mg/dL)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={glucoseRisk} margin={{ left: 4, right: 16, top: 12 }}>
                <CartesianGrid stroke={cc.grid} vertical={false} />
                <XAxis dataKey="level" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} width={40} unit="%" />
                <Tooltip content={<ChartTip suffix="%" />} cursor={{ stroke: cc.cursor, strokeDasharray: "4 3" }} />
                <Line
                  type="monotone"
                  dataKey="highRisk"
                  name="High-risk"
                  stroke="#3d4fc8"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy } = props;
                    return <Dot key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#f07832" stroke="#ffffff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 7, fill: "#f07832", stroke: "#fffcf6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard label="Anthropometric" title="BMI vs. risk" hint="Mean high-risk % per BMI category">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bmiRisk} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid stroke={cc.grid} vertical={false} />
                <XAxis
                  dataKey="band"
                  tick={axis}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={axis} axisLine={false} tickLine={false} width={48} unit="%" />
                <Tooltip content={<ChartTip suffix="%" />} cursor={{ fill: cc.cursorFill }} />
                <Bar dataKey="highRisk" name="High-risk" radius={[6, 6, 0, 0]} barSize={34}>
                  {bmiRisk.map((_, i) => (
                    <Cell key={i} fill={barFill(i, bmiRisk.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard label="Lifestyle" title="Smoking status" hint="Population composition by smoking habit">
            <div className="mt-1 flex items-center gap-4">
              <div className="relative shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={smokingSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {smokingSplit.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-xl font-bold tracking-tight text-ink">{smokingSplit.length}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-muted">groups</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2.5">
                {smokingSplit.map((s) => {
                  const pct = ((s.value / smokingTotal) * 100).toFixed(0);
                  return (
                    <li key={s.name} className="flex items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 text-sm text-ink">{s.name}</span>
                      <span className="font-mono text-sm font-semibold text-ink">{pct}%</span>
                    </li>
                  );
                })}
                <li className="pt-0.5 font-mono text-[10px] text-slate-muted/70">
                  n = {smokingTotal.toLocaleString()}
                </li>
              </ul>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Age cohort + recent high-risk ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          label="Demographic"
          title="High-risk share by age band"
          hint="% flagged high-risk within each cohort"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageRisk} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis dataKey="band" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={40} unit="%" />
              <Tooltip content={<ChartTip suffix="%" />} cursor={{ fill: cc.cursorFill }} />
              <Bar dataKey="highRisk" name="High-risk" radius={[6, 6, 0, 0]} barSize={34}>
                {ageRisk.map((d, i) => (
                  <Cell key={i} fill={d.highRisk > 20 ? "#e04b1a" : d.highRisk > 10 ? "#f07832" : "#f5b731"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>Attention</SectionLabel>
              <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
                Recent high-risk
              </h3>
            </div>
            <TriangleAlert className="h-5 w-5 text-risk-high" />
          </div>
          <ul className="mt-4 space-y-3">
            {flagged.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-[rgba(26,17,40,0.08)] bg-vanilla/60 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta/12 font-mono text-xs font-semibold text-terracotta-deep">
                  {p.age}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  <p className="font-mono text-[11px] text-slate-muted">{p.id}</p>
                </div>
                <span className="ml-auto font-display text-lg font-bold text-risk-high">
                  {Math.round(p.probability * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(26,17,40,0.12)] py-2.5 text-sm font-medium text-terracotta-deep transition-colors hover:bg-vanilla-deep">
            View all screened patients
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </Panel>
      </div>

      {/* ── Geographic & occupational ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          label="Geographic"
          title="Recorded stroke cases · Urban vs. Rural"
          hint={`${topResidence.name} areas record the most cases (${topResidence.cases.toLocaleString()})`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={residenceCases} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid stroke={cc.grid} vertical={false} />
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ChartTip suffix=" cases" />} cursor={{ fill: cc.cursorFill }} />
              <Bar dataKey="cases" name="Stroke cases" radius={[6, 6, 0, 0]} barSize={72}>
                {residenceCases.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#e04b1a" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          label="Occupational"
          title="Recorded stroke cases by work type"
          hint={`${topWork.type} has the most positive cases (${topWork.cases.toLocaleString()})`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workCases} layout="vertical" margin={{ left: 8, right: 24, top: 4 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ ...axis, fontSize: Math.max(axis.fontSize - 1, 10) }}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip content={<ChartTip suffix=" cases" />} cursor={{ fill: cc.cursorFill }} />
              <Bar dataKey="cases" name="Stroke cases" radius={[0, 6, 6, 0]} barSize={20}>
                {workCases.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#e04b1a" : i === 1 ? "#f07832" : i === 2 ? "#f5b731" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

    </div>
  );
}
