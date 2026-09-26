import { useState } from "react";
import { Search, SlidersHorizontal, CalendarDays, X } from "lucide-react";
import { Panel, RiskBadge, SectionLabel } from "../components/ui";
import { usePatients } from "../store";

type Filter = "all" | "High" | "Low";
type DatePreset = "all" | "today" | "week" | string; // string covers "YYYY-MM" month keys

/* Parse "Sep 14, 2026" → Date */
function parseScreenedDate(s: string): Date {
  return new Date(s);
}

/* Format a Date to yyyy-mm-dd for <input type="date"> */
function toInputVal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* "YYYY-MM" → first and last day as yyyy-mm-dd strings */
function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return [toInputVal(first), toInputVal(last)];
}

const TODAY = new Date("2026-09-19");
const WEEK_AGO = new Date(TODAY);
WEEK_AGO.setDate(TODAY.getDate() - 6);

/* Condition tag pills */
function ConditionTag({ type }: { type: "hypertension" | "heart" | "none" }) {
  if (type === "hypertension") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(124,92,191,0.18)] px-2.5 py-1 font-mono text-xs font-bold text-[#9b6dff]">
        <span className="h-2 w-2 rounded-full bg-[#9b6dff]" />
        Hypertension
      </span>
    );
  }
  if (type === "heart") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(224,75,26,0.18)] px-2.5 py-1 font-mono text-xs font-bold text-risk-high">
        <span className="h-2 w-2 rounded-full bg-risk-high" />
        Heart disease
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[rgba(110,100,120,0.15)] px-2.5 py-1 font-mono text-xs font-medium text-slate-muted">
      <span className="h-2 w-2 rounded-full bg-slate-muted/60" />
      None
    </span>
  );
}

const TH = "py-4 pr-6 font-medium text-left whitespace-nowrap";
const TD = "py-5 pr-6 align-middle";

export default function PatientsView() {
  const { patients } = usePatients();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  /* Unique months (YYYY-MM) sorted desc, derived from actual patient data */
  const availableMonths = Array.from(
    new Set(
      patients.map((p) => {
        const d = parseScreenedDate(p.screened);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  function applyPreset(preset: DatePreset) {
    setDatePreset(preset);
    if (preset === "today") {
      setDateFrom(toInputVal(TODAY));
      setDateTo(toInputVal(TODAY));
    } else if (preset === "week") {
      setDateFrom(toInputVal(WEEK_AGO));
      setDateTo(toInputVal(TODAY));
    } else if (preset !== "all" && preset.includes("-")) {
      const [from, to] = monthRange(preset);
      setDateFrom(from);
      setDateTo(to);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  }

  /* Human label for the active date filter button */
  function activeDateLabel(): string {
    if (datePreset === "today") return "Today";
    if (datePreset === "week") return "Last 7 days";
    if (datePreset !== "all" && datePreset.includes("-")) {
      const [y, m] = datePreset.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
    }
    if (dateFrom || dateTo) return `${dateFrom || "…"} → ${dateTo || "…"}`;
    return "Date range";
  }

  const hasDateFilter = dateFrom || dateTo;

  const rows = patients.filter((p) => {
    const matchRisk = filter === "all" || p.risk === filter;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    let matchDate = true;
    if (hasDateFilter) {
      const d = parseScreenedDate(p.screened);
      if (dateFrom) matchDate = matchDate && d >= new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        matchDate = matchDate && d <= end;
      }
    }
    return matchRisk && matchQuery && matchDate;
  });

  return (
    <div className="animate-rise flex min-h-full flex-col p-4">
      <Panel className="flex flex-1 flex-col overflow-hidden p-0">
        {/* ── Card header ── */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[rgba(26,17,40,0.09)] px-7 py-5">
          <div>
            <SectionLabel>Screened patients</SectionLabel>
            <h3 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-ink">
              {rows.length} record{rows.length !== 1 ? "s" : ""}
            </h3>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted/70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or patient ID…"
                className="w-60 rounded-xl border border-[rgba(26,17,40,0.13)] bg-vanilla py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-slate-muted/55 focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
              />
            </div>

            {/* Filter pills */}
            <div className="inline-flex rounded-xl border border-[rgba(26,17,40,0.13)] bg-vanilla p-1">
              {(
                [
                  ["all", "All"],
                  ["High", "High risk"],
                  ["Low", "Low risk"],
                ] as [Filter, string][]
              ).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    "rounded-lg px-4 py-2 text-sm font-medium transition-all " +
                    (filter === f
                      ? "bg-indigo-ink text-white shadow-sm"
                      : "text-slate-muted hover:text-ink")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date filter trigger */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker((v) => !v)}
                className={
                  "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors " +
                  (hasDateFilter
                    ? "border-terracotta/50 bg-terracotta/8 text-terracotta"
                    : "border-[rgba(26,17,40,0.13)] text-slate-muted hover:border-terracotta/40 hover:text-terracotta")
                }
              >
                <CalendarDays className="h-4 w-4" />
                {activeDateLabel()}
                {hasDateFilter && (
                  <span
                    onClick={(e) => { e.stopPropagation(); applyPreset("all"); }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-terracotta/15"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {showDatePicker && (
                <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-[rgba(26,17,40,0.12)] bg-cream p-4 shadow-xl">
                  {/* Quick presets */}
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-muted">
                    Quick select
                  </p>
                  <div className="mb-4 flex gap-2">
                    {([
                      ["all", "All time"],
                      ["today", "Today"],
                      ["week", "Last 7 days"],
                    ] as [DatePreset, string][]).map(([p, label]) => (
                      <button
                        key={p}
                        onClick={() => { applyPreset(p); setShowDatePicker(false); }}
                        className={
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all " +
                          (datePreset === p
                            ? "bg-terracotta text-white"
                            : "bg-vanilla text-slate-muted hover:text-ink")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* By month */}
                  {availableMonths.length > 0 && (
                    <>
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-muted">
                        By month
                      </p>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {availableMonths.map((ym) => {
                          const [y, m] = ym.split("-");
                          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", {
                            month: "short",
                            year: "numeric",
                          });
                          return (
                            <button
                              key={ym}
                              onClick={() => { applyPreset(ym); setShowDatePicker(false); }}
                              className={
                                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all " +
                                (datePreset === ym
                                  ? "bg-terracotta text-white"
                                  : "bg-vanilla text-slate-muted hover:text-ink")
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Custom range */}
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-muted">
                    Custom range
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-mono text-[10px] text-slate-muted">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDatePreset("all"); }}
                        className="w-full rounded-xl border border-[rgba(26,17,40,0.13)] bg-vanilla px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[10px] text-slate-muted">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDatePreset("all"); }}
                        className="w-full rounded-xl border border-[rgba(26,17,40,0.13)] bg-vanilla px-3 py-2 text-sm text-ink outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="mt-4 w-full rounded-xl bg-terracotta py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Settings icon */}
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(26,17,40,0.13)] text-slate-muted transition-colors hover:border-terracotta/40 hover:bg-vanilla-deep hover:text-terracotta">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[rgba(26,17,40,0.09)] bg-vanilla/95 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-slate-muted backdrop-blur-sm">
                <th className={TH + " pl-7"}>Patient</th>
                <th className={TH}>Age</th>
                <th className={TH}>Glucose</th>
                <th className={TH}>BMI</th>
                <th className={TH}>Conditions</th>
                <th className={TH}>Smoking</th>
                <th className={TH}>Married</th>
                <th className={TH}>Work type</th>
                <th className={TH}>Residence</th>
                <th className={TH}>Probability</th>
                <th className={TH + " pr-7"}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, idx) => (
                <tr
                  key={p.id}
                  className={
                    "border-b border-[rgba(26,17,40,0.06)] transition-colors hover:bg-[rgba(212,81,26,0.05)] " +
                    (idx % 2 === 0 ? "bg-cream" : "bg-vanilla/30")
                  }
                >
                  {/* Patient */}
                  <td className={TD + " pl-7"}>
                    <div className="text-base font-bold text-ink">{p.name}</div>
                    <div className="mt-0.5 font-mono text-xs font-semibold text-terracotta">
                      {p.id}
                    </div>
                    <div className="font-mono text-xs text-slate-muted">
                      {p.screened}
                    </div>
                  </td>

                  {/* Age */}
                  <td className={TD + " font-mono text-base text-ink"}>{p.age}</td>

                  {/* Glucose */}
                  <td className={TD + " font-mono text-base text-ink"}>
                    {p.glucose}
                    <span className="ml-0.5 text-xs text-slate-muted/70">
                      mg/dL
                    </span>
                  </td>

                  {/* BMI */}
                  <td className={TD + " font-mono text-base text-ink"}>{p.bmi}</td>

                  {/* Conditions */}
                  <td className={TD}>
                    <div className="flex flex-col gap-1.5">
                      {p.hypertension && <ConditionTag type="hypertension" />}
                      {p.heartDisease && <ConditionTag type="heart" />}
                      {!p.hypertension && !p.heartDisease && (
                        <ConditionTag type="none" />
                      )}
                    </div>
                  </td>

                  {/* Smoking */}
                  <td className={TD + " text-base text-ink"}>{p.smoking}</td>

                  {/* Married */}
                  <td className={TD + " text-center text-base text-ink"}>
                    {p.married ? "Yes" : "No"}
                  </td>

                  {/* Work type */}
                  <td className={TD + " text-base text-ink"}>{p.workType}</td>

                  {/* Residence */}
                  <td className={TD + " text-base text-ink"}>{p.residence}</td>

                  {/* Probability */}
                  <td className={TD}>
                    <span
                      className="font-display text-2xl font-bold leading-none tracking-tight"
                      style={{
                        color:
                          p.risk === "High"
                            ? "var(--color-risk-high)"
                            : "var(--color-risk-low)",
                      }}
                    >
                      {Math.round(p.probability * 100)}%
                    </span>
                  </td>

                  {/* Risk badge */}
                  <td className={TD + " pr-7"}>
                    <RiskBadge risk={p.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-base text-slate-muted">
                No patients match your current filters.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-[rgba(26,17,40,0.07)] px-7 py-4">
          <span className="font-mono text-xs text-slate-muted/70">
            Showing {rows.length} of {patients.length} records
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted/50">
            XGBoost · Threshold 50%
          </span>
        </div>
      </Panel>
    </div>
  );
}
