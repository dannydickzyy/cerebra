import { useContext, useMemo, useState, type ReactNode } from "react";
import { recentPatients, type ScreenedPatient } from "./data";
import { PatientsContext, type Store } from "./patients-context";

function nextId(existing: ScreenedPatient[]) {
  const max = existing.reduce((m, p) => {
    const n = Number(p.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 49000);
  return `PT-${max + 1}`;
}

const todayLabel = () =>
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export function PatientsProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<ScreenedPatient[]>(recentPatients);

  const value = useMemo<Store>(
    () => ({
      patients,
      addPatient: (p) => {
        const record: ScreenedPatient = {
          ...p,
          id: nextId(patients),
          screened: todayLabel(),
        };
        setPatients((prev) => [record, ...prev]);
        return record;
      },
    }),
    [patients],
  );

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
}

export function usePatients() {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error("usePatients must be used within PatientsProvider");
  return ctx;
}
