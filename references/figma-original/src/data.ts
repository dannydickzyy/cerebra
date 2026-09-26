// CEREBRA — mock analytics data derived from the study's synthetic stroke dataset
// (50,000 records, 12 features, binary stroke target).

export const overview = {
  screened: 50000,
  highRisk: 6420,
  flaggedToday: 148,
  modelAccuracy: 0.942,
  recall: 0.897,
  precision: 0.814,
  rocAuc: 0.961,
};

// High-risk share by age band
export const ageRisk = [
  { band: "18–29", highRisk: 2.1, screened: 5120 },
  { band: "30–39", highRisk: 4.8, screened: 8340 },
  { band: "40–49", highRisk: 9.7, screened: 9880 },
  { band: "50–59", highRisk: 16.4, screened: 10420 },
  { band: "60–69", highRisk: 24.9, screened: 8760 },
  { band: "70+", highRisk: 33.6, screened: 7480 },
];

// Glucose vs risk — mean high-risk % by glucose bucket
export const glucoseRisk = [
  { level: "<90", highRisk: 5.2 },
  { level: "90–125", highRisk: 8.9 },
  { level: "126–160", highRisk: 15.3 },
  { level: "161–200", highRisk: 23.1 },
  { level: ">200", highRisk: 31.7 },
];

// BMI vs risk — mean high-risk % by BMI category
export const bmiRisk = [
  { band: "Under", highRisk: 6.4 },
  { band: "Normal", highRisk: 8.1 },
  { band: "Overweight", highRisk: 14.6 },
  { band: "Obese I", highRisk: 22.8 },
  { band: "Obese II", highRisk: 29.5 },
];

// Smoking status distribution of the screened population
export const smokingSplit = [
  { name: "Never smoked", value: 18600, color: "#2e9e44" },
  { name: "Formerly smoked", value: 13400, color: "#f07832" },
  { name: "Smokes", value: 11200, color: "#e5342a" },
  { name: "Unknown", value: 6800, color: "#7c5cbf" },
];

// Population-level feature importance (global model)
export const globalImportance = [
  { factor: "Age", weight: 0.31 },
  { factor: "Avg. glucose level", weight: 0.24 },
  { factor: "Hypertension", weight: 0.17 },
  { factor: "BMI", weight: 0.13 },
  { factor: "Heart disease", weight: 0.09 },
  { factor: "Smoking status", weight: 0.06 },
];

// Monthly screening throughput and high-risk flags
export const throughput = [
  { month: "Mar", screened: 3120, high: 402 },
  { month: "Apr", screened: 3680, high: 471 },
  { month: "May", screened: 4210, high: 538 },
  { month: "Jun", screened: 4890, high: 641 },
  { month: "Jul", screened: 5320, high: 712 },
  { month: "Aug", screened: 6010, high: 803 },
];

export type WorkType =
  | "Private"
  | "Self-employed"
  | "Govt job"
  | "Children"
  | "Never worked";
export type Residence = "Urban" | "Rural";

// High-risk share by work type
export const workTypeRisk = [
  { type: "Self-employed", highRisk: 19.8, screened: 8210 },
  { type: "Private", highRisk: 13.4, screened: 28600 },
  { type: "Govt job", highRisk: 12.1, screened: 6640 },
  { type: "Never worked", highRisk: 4.6, screened: 1180 },
  { type: "Children", highRisk: 1.2, screened: 5370 },
];

// High-risk share by residence type
export const residenceSplit = [
  { name: "Urban", value: 25840, highRisk: 13.6, color: "#f07832" },
  { name: "Rural", value: 24160, highRisk: 12.3, color: "#f5b731" },
];

// High-risk share by marital status (ever married)
export const marriedRisk = [
  { status: "Married", highRisk: 15.7, screened: 32800 },
  { status: "Not married", highRisk: 6.9, screened: 17200 },
];

export type ScreenedPatient = {
  id: string;
  name: string;
  age: number;
  risk: "High" | "Low";
  probability: number;
  glucose: number;
  bmi: number;
  hypertension: boolean;
  heartDisease: boolean;
  smoking: string;
  married: boolean;
  workType: WorkType;
  residence: Residence;
  screened: string;
};

export const recentPatients: ScreenedPatient[] = [
  { id: "PT-49812", name: "Corazon Mendoza", age: 67, risk: "High", probability: 0.82, glucose: 198, bmi: 31.4, hypertension: true, heartDisease: true, smoking: "Formerly smoked", married: true, workType: "Self-employed", residence: "Urban", screened: "Sep 14, 2026" },
  { id: "PT-49810", name: "Ramon Villanueva", age: 58, risk: "High", probability: 0.71, glucose: 172, bmi: 29.1, hypertension: true, heartDisease: false, smoking: "Smokes", married: true, workType: "Private", residence: "Rural", screened: "Sep 14, 2026" },
  { id: "PT-49807", name: "Lourdes Bautista", age: 44, risk: "Low", probability: 0.18, glucose: 104, bmi: 24.2, hypertension: false, heartDisease: false, smoking: "Never smoked", married: true, workType: "Govt job", residence: "Urban", screened: "Sep 13, 2026" },
  { id: "PT-49805", name: "Emilio Santos", age: 72, risk: "High", probability: 0.88, glucose: 211, bmi: 33.7, hypertension: true, heartDisease: true, smoking: "Smokes", married: true, workType: "Self-employed", residence: "Rural", screened: "Sep 13, 2026" },
  { id: "PT-49803", name: "Divina Reyes", age: 39, risk: "Low", probability: 0.09, glucose: 91, bmi: 22.6, hypertension: false, heartDisease: false, smoking: "Never smoked", married: false, workType: "Private", residence: "Urban", screened: "Sep 13, 2026" },
  { id: "PT-49801", name: "Feliciano Cruz", age: 61, risk: "High", probability: 0.64, glucose: 158, bmi: 27.8, hypertension: true, heartDisease: false, smoking: "Formerly smoked", married: true, workType: "Private", residence: "Urban", screened: "Sep 12, 2026" },
  { id: "PT-49799", name: "Marilou Aquino", age: 51, risk: "Low", probability: 0.27, glucose: 118, bmi: 26.0, hypertension: false, heartDisease: false, smoking: "Formerly smoked", married: false, workType: "Govt job", residence: "Rural", screened: "Sep 12, 2026" },
];
