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
import { Zap, RotateCcw, Sparkles, Save, Check, Stethoscope, BarChart2, BookOpen } from "lucide-react";
import { Panel, SectionLabel, RiskGauge, RiskBadge } from "../components/ui";
import { ChartTip } from "../components/chart";
import { usePatients } from "../store";
import { type WorkType, type Residence } from "../data";

const clinicalRefs = [
  {
    factor: "Glucose",
    ranges: [
      { label: "Normal", range: "70–99 mg/dL", color: "#22c55e" },
      { label: "Pre-diabetic", range: "100–125 mg/dL", color: "#f5b731" },
      { label: "Diabetic", range: "≥ 126 mg/dL", color: "#e04b1a" },
    ],
  },
  {
    factor: "BMI",
    ranges: [
      { label: "Underweight", range: "< 18.5", color: "#f5b731" },
      { label: "Normal", range: "18.5–24.9", color: "#22c55e" },
      { label: "Overweight", range: "25–29.9", color: "#f07832" },
      { label: "Obese", range: "≥ 30", color: "#e04b1a" },
    ],
  },
  {
    factor: "Age risk",
    ranges: [
      { label: "Low (< 45 yrs)", range: "Baseline risk", color: "#22c55e" },
      { label: "Moderate (45–64)", range: "2× elevated", color: "#f07832" },
      { label: "High (≥ 65)", range: "3–5× elevated", color: "#e04b1a" },
    ],
  },
];

type Smoking = "Never smoked" | "Formerly smoked" | "Smokes";

const workTypes: WorkType[] = [
  "Private",
  "Self-employed",
  "Govt job",
  "Children",
  "Never worked",
];

type Form = {
  name: string;
  age: number | "";
  glucose: number | "";
  bmi: number | "";
  hypertension: boolean | null;
  heartDisease: boolean | null;
  smoking: Smoking | "";
  married: boolean | null;
  workType: WorkType | "";
  residence: Residence | "";
};

const initial: Form = {
  name: "",
  age: "",
  glucose: "",
  bmi: "",
  hypertension: null,
  heartDisease: null,
  smoking: "",
  married: null,
  workType: "",
  residence: "",
};

type Scored = {
  name: string;
  age: number;
  glucose: number;
  bmi: number;
  hypertension: boolean;
  heartDisease: boolean;
  smoking: Smoking;
  married: boolean;
  workType: WorkType;
  residence: Residence;
};

function score(f: Scored) {
  const contrib = {
    Age: Math.min(f.age / 90, 1) * 0.31,
    "Glucose level": Math.min(Math.max(f.glucose - 80, 0) / 180, 1) * 0.24,
    Hypertension: (f.hypertension ? 1 : 0.05) * 0.17,
    BMI: Math.min(Math.max(f.bmi - 18, 0) / 25, 1) * 0.13,
    "Heart disease": (f.heartDisease ? 1 : 0.04) * 0.09,
    Smoking:
      (f.smoking === "Smokes" ? 1 : f.smoking === "Formerly smoked" ? 0.5 : 0.05) *
      0.06,
  };
  const raw = Object.values(contrib).reduce((a, b) => a + b, 0);
  const probability = Math.min(Math.max(raw, 0.02), 0.97);
  const bars = Object.entries(contrib)
    .map(([factor, weight]) => ({ factor, weight: +(weight * 100).toFixed(1) }))
    .sort((a, b) => b.weight - a.weight);
  return { probability, bars };
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block " + className}>
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-[rgba(26,17,40,0.13)] bg-vanilla px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-slate-muted/55 focus:border-terracotta focus:ring-2 focus:ring-terracotta/10";

function Toggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-[10px] border border-[rgba(26,17,40,0.13)] bg-vanilla p-1">
      {(
        [
          ["No", false],
          ["Yes", true],
        ] as [string, boolean][]
      ).map(([label, v]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={
            "flex-1 rounded-lg py-2 text-sm font-medium transition-all " +
            (value === v
              ? "bg-terracotta text-white shadow-sm"
              : "text-slate-muted hover:text-ink")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function PredictionView() {
  const { addPatient } = usePatients();
  const [form, setForm] = useState<Form>(initial);
  const [scored, setScored] = useState<Scored | null>(null);
  const [result, setResult] = useState<ReturnType<typeof score> | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(null);
  };

  const risk: "High" | "Low" = (result?.probability ?? 0) >= 0.5 ? "High" : "Low";

  const handlePredict = () => {
    if (
      form.age === "" ||
      form.glucose === "" ||
      form.bmi === "" ||
      form.hypertension === null ||
      form.heartDisease === null ||
      form.smoking === "" ||
      form.married === null ||
      form.workType === "" ||
      form.residence === ""
    ) {
      setError("Please complete every clinical field before predicting.");
      setResult(null);
      return;
    }
    const s: Scored = {
      name: form.name.trim(),
      age: Number(form.age),
      glucose: Number(form.glucose),
      bmi: Number(form.bmi),
      hypertension: form.hypertension,
      heartDisease: form.heartDisease,
      smoking: form.smoking as Smoking,
      married: form.married,
      workType: form.workType as WorkType,
      residence: form.residence as Residence,
    };
    setError(null);
    setScored(s);
    setResult(score(s));
    setSaved(null);
  };

  const handleReset = () => {
    setForm(initial);
    setScored(null);
    setResult(null);
    setSaved(null);
    setError(null);
  };

  const handleSave = () => {
    if (!result || !scored) return;
    const record = addPatient({
      name: scored.name || "Unnamed patient",
      age: scored.age,
      risk,
      probability: +result.probability.toFixed(2),
      glucose: scored.glucose,
      bmi: scored.bmi,
      hypertension: scored.hypertension,
      heartDisease: scored.heartDisease,
      smoking: scored.smoking,
      married: scored.married,
      workType: scored.workType,
      residence: scored.residence,
    });
    setSaved(record.id);
  };

  return (
    <div className="animate-rise grid grid-cols-1 gap-6 p-8 xl:grid-cols-[1.1fr_0.9fr]">
      {/* ── Left: Patient health profile form ── */}
      <Panel className="p-7">
        {/* Module label */}
        <div className="mb-4 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-terracotta" strokeWidth={2} />
          <SectionLabel>Risk prediction module</SectionLabel>
        </div>

        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Patient health profile
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-muted">
          Enter the patient&apos;s identity and clinical factors. The trained
          classifier returns a risk label you can save to Screened patients.
        </p>

        {/* Divider */}
        <div className="my-5 h-px bg-[rgba(26,17,40,0.07)]" />

        {/* Patient name — full width */}
        <Field label="Patient name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Corazon Mendoza"
            className={inputCls}
          />
        </Field>

        {/* 2-col clinical grid */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Age">
            <input
              type="number"
              min={0}
              max={120}
              value={form.age}
              onChange={(e) =>
                set("age", e.target.value === "" ? "" : +e.target.value)
              }
              placeholder="e.g. 58"
              className={inputCls}
            />
          </Field>

          <Field label="Avg. glucose level (mg/dL)">
            <input
              type="number"
              value={form.glucose}
              onChange={(e) =>
                set("glucose", e.target.value === "" ? "" : +e.target.value)
              }
              placeholder="e.g. 120"
              className={inputCls}
            />
          </Field>

          <Field label="Body mass index (BMI)">
            <input
              type="number"
              step="0.1"
              value={form.bmi}
              onChange={(e) =>
                set("bmi", e.target.value === "" ? "" : +e.target.value)
              }
              placeholder="e.g. 24.5"
              className={inputCls}
            />
          </Field>

          <Field label="Smoking status">
            <select
              value={form.smoking}
              onChange={(e) => set("smoking", e.target.value as Form["smoking"])}
              className={inputCls}
            >
              <option value="" disabled>
                Select status…
              </option>
              <option>Never smoked</option>
              <option>Formerly smoked</option>
              <option>Smokes</option>
            </select>
          </Field>

          <Field label="Hypertension">
            <Toggle
              value={form.hypertension}
              onChange={(v) => set("hypertension", v)}
            />
          </Field>

          <Field label="Heart disease">
            <Toggle
              value={form.heartDisease}
              onChange={(v) => set("heartDisease", v)}
            />
          </Field>

          <Field label="Ever married">
            <Toggle value={form.married} onChange={(v) => set("married", v)} />
          </Field>

          <Field label="Work type">
            <select
              value={form.workType}
              onChange={(e) => set("workType", e.target.value as Form["workType"])}
              className={inputCls}
            >
              <option value="" disabled>
                Select work type…
              </option>
              {workTypes.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </Field>

          {/* Residence type — spans full width */}
          <Field label="Residence type" className="col-span-2">
            <select
              value={form.residence}
              onChange={(e) =>
                set("residence", e.target.value as Form["residence"])
              }
              className={inputCls}
            >
              <option value="" disabled>
                Select residence type…
              </option>
              <option>Urban</option>
              <option>Rural</option>
            </select>
          </Field>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-5 rounded-xl bg-risk-high/8 px-4 py-2.5 text-sm text-risk-high">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handlePredict}
            className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-terracotta-deep active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" strokeWidth={2.5} />
            Predict stroke risk
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-[rgba(26,17,40,0.14)] px-4 py-3 text-sm font-medium text-slate-muted transition-colors hover:bg-vanilla-deep hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </Panel>

      {/* ── Right: Result + Breakdown + Reference ── */}
      <div className="flex flex-col gap-6">
        {/* Prediction result card */}
        <Panel className="flex-1 p-7">
          <SectionLabel>Prediction result</SectionLabel>

          {!result ? (
            <div className="mt-5 flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vanilla-deep">
                <Sparkles className="h-6 w-6 text-terracotta/50" strokeWidth={1.5} />
              </div>
              <p className="mt-1 max-w-[220px] text-sm leading-relaxed text-slate-muted">
                Complete the patient profile and select{" "}
                <span className="font-medium text-ink">Predict stroke risk</span>{" "}
                to see the result here.
              </p>
            </div>
          ) : (
            scored && (
              <div className="mt-5 flex flex-col items-center gap-5">
                <RiskGauge probability={result.probability} risk={risk} />
                <div className="w-full text-center">
                  <RiskBadge risk={risk} />
                  {scored.name && (
                    <p className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
                      {scored.name}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-slate-muted">
                    {risk === "High"
                      ? "This profile is flagged for preventive counseling and follow-up screening."
                      : "This profile falls below the intervention threshold. Routine monitoring advised."}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-muted/70">
                    Threshold 50% · XGBoost classifier
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={!!saved}
                    className={
                      "mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all " +
                      (saved
                        ? "bg-risk-low/10 text-risk-low"
                        : "bg-terracotta text-white shadow-sm hover:bg-terracotta-deep active:scale-[0.98]")
                    }
                  >
                    {saved ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved as {saved}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save to screened patients
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          )}
        </Panel>

        {/* Risk factor breakdown card */}
        <Panel className="p-7">
          <div className="flex items-start gap-2">
            <BarChart2 className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" strokeWidth={2} />
            <div>
              <SectionLabel>Risk factor breakdown</SectionLabel>
              <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
                What drove this result
              </h3>
            </div>
          </div>

          {!result ? (
            <div className="mt-4 rounded-xl border border-dashed border-[rgba(26,17,40,0.12)] bg-vanilla/50 px-5 py-8 text-center">
              <p className="text-sm text-slate-muted">
                The factor contribution chart appears once a prediction is run.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-muted/70">
                Contribution points show each factor&apos;s share of the predicted
                probability — useful for explaining the result during counseling.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220} className="mt-4">
                <BarChart
                  data={result.bars}
                  layout="vertical"
                  margin={{ left: 8, right: 20, top: 4 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="factor"
                    tick={{
                      fontSize: 11,
                      fontFamily: "Arial, Helvetica, sans-serif",
                      fill: "#6e6478",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={104}
                  />
                  <Tooltip
                    content={<ChartTip suffix=" pts" />}
                    cursor={{ fill: "rgba(26,17,40,0.05)" }}
                  />
                  <Bar
                    dataKey="weight"
                    name="Contribution"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {result.bars.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0 ? "#e04b1a" : i === 1 ? "#f07832" : "#f5b731"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-xs leading-relaxed text-slate-muted/70">
                Contribution points show each factor&apos;s share of the predicted
                probability — useful for explaining the result during counseling.
              </p>
            </>
          )}
        </Panel>

        {/* Clinical reference ranges */}
        <Panel className="p-7">
          <div className="flex items-start gap-2">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" strokeWidth={2} />
            <div>
              <SectionLabel>Clinical reference</SectionLabel>
              <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
                Diagnostic thresholds
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {clinicalRefs.map((group) => (
              <div key={group.factor}>
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-terracotta">
                  {group.factor}
                </p>
                <div className="space-y-1.5">
                  {group.ranges.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-4 rounded-lg bg-vanilla-deep/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: r.color }}
                        />
                        <span className="text-sm text-ink">{r.label}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-muted">
                        {r.range}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[rgba(212,81,26,0.18)] bg-[rgba(212,81,26,0.05)] px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-muted">
              <span className="font-semibold text-terracotta">Model threshold:</span>{" "}
              Predictions at or above <span className="font-semibold text-ink">50% probability</span> are
              classified High-risk and warrant preventive counseling per clinical protocol.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
