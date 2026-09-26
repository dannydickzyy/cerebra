import { createContext } from "react";
import type { ScreenedPatient } from "./data";

// Kept in its own module with only a type-only import so the context object's
// identity stays stable across Vite Fast Refresh reloads of data.ts / store.tsx.
export type Store = {
  patients: ScreenedPatient[];
  addPatient: (p: Omit<ScreenedPatient, "id" | "screened">) => ScreenedPatient;
};

export const PatientsContext = createContext<Store | null>(null);
