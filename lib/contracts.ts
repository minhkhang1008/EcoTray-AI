export type ComponentKey = "rice" | "vegetables" | "main";
export type Values = Record<ComponentKey, number>;
export type TrayRow = {
  id: string;
  date: string;
  menu: string;
  source: string;
  rice: number | null;
  vegetables: number | null;
  main: number | null;
  allergyFlags?: string[];
  riceDish?: string;
  vegetableDish?: string;
  soupDish?: string;
  soup?: number | null;
};
export type Adapter = "lite" | "standard" | "pro";
export type NfcStatus =
  | "VALID"
  | "ALLERGY_WARNING"
  | "ALREADY_REDEEMED"
  | "UNKNOWN_CARD";
export interface NfcEvent {
  eventId: string;
  status: NfcStatus;
  servedCount: number;
  menu: { menuId: string; name: string } | null;
  allergyFlags: string[];
  recordedAt: string;
  cardUidHash?: string;
  studentCode?: string;
}
export interface Capture {
  captureId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  capturedAt: string;
  imageUrl?: string;
  dishId?: string;
  menuName?: string;
  result?: Values & { isOutlier: boolean; recommendation: string; soup?: number; vegetableServedGrams?: number };
  latencyMs?: number;
  errorMessage?: string;
}
export interface IotStatus {
  online: boolean;
  lastUpdatedAt: string | null;
  servedCount: number;
  latestNfc: NfcEvent | null;
  latestCapture: Capture | null;
  captures?: Capture[];
  source: "hardware";
}
export interface Intervention {
  id: string;
  at: string;
  menu: string;
  kind: string;
  text: string;
  source: "simulation" | "hardware" | "reference-fallback";
  captureId: string;
}
export interface StageState {
  served: number;
  savedTickets: number;
  nfc: NfcEvent | null;
  capture: Capture | null;
  analyzed: boolean;
  approved: boolean;
  history: Intervention[];
  redeemed: string[];
  sequence: number;
}
export type StageAction =
  | { type: "reset" }
  | {
      type: "scan";
      scenario: "normal" | "allergy" | "unknown";
      cardHash?: string;
    }
  | { type: "capture" }
  | { type: "analyze" }
  | { type: "approve"; at?: string };
export interface CalibrationSample {
  id: string;
  at: string;
  component: ComponentKey;
  percent: number;
  grams: number;
  source: "measured-reference";
}

export interface NfcScanRequest {
  eventId: string;
  schoolId: string;
  stationId: string;
  cardUidHash: string;
  scannedAt: string;
}
export interface TrayCaptureHeaders {
  "X-School-Id": string;
  "X-Station-Id": string;
  "X-Captured-At": string;
  "Idempotency-Key": string;
}
export interface TrayCaptureReceipt {
  captureId: string;
  status: "QUEUED";
  statusUrl: string;
}
export interface CaptureResultRequest {
  schoolId: string;
  stationId: string;
  captureId: string;
  dishId?: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  riceLeftoverPct?: number;
  vegLeftoverPct?: number;
  mainLeftoverPct?: number;
  soupLeftoverPct?: number;
  isOutlier?: boolean;
  latencyMs?: number;
}
export interface IotError {
  error: { code: string; message: string; details: unknown };
}
