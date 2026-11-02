import * as station from "../../lib/station-vision.mjs";
import * as engine from "../../lib/ptnk-vision.mjs";
import * as featuresLib from "../../lib/ptnk-features.mjs";
export type VisionKey = "rice" | "main" | "veg" | "soup";
export type FeatureVectors = Record<VisionKey, number[]>;
export type ModelWeights = Record<VisionKey, number[]>;
export type Percentages = [number, number, number, number];
export interface ComponentPrediction {
  nameVi: string;
  wastePct: number;
  protocolLevel: 0 | 25 | 50 | 75 | 100;
  servedGrams: number;
  wasteGrams: number;
  consumedGrams: number;
  status: "OPTIMAL" | "WARNING" | "CRITICAL";
  bboxNormalized: [number, number, number, number];
}
export interface VisionAnalysisResponse {
  sampleId: string;
  timestamp: string;
  comboName: string;
  menuDate: string | null;
  modelVersion: string;
  predictionSource:
    | "ridge-pixels"
    | "anchor-label"
    | "manual-calibration"
    | "ov2640-area";
  stationLayout?: {
    orientation: 0 | 180;
    rotation: 0 | 90;
    uncertain: boolean;
  } | null;
  calibrationAccuracyPct: null;
  brothFiltered: "heuristic";
  utensilFiltered: "heuristic";
  isDietaryOutlier: boolean;
  referenceOnly: boolean;
  iqrEligibleCount: number;
  iqrExcludedCount: number;
  nutritionalFloorLocked: boolean;
  totalWasteGrams: number;
  components: Record<VisionKey, ComponentPrediction>;
  decisionLoop: {
    diagnosisCode: string;
    headline: string;
    recommendation: string;
    nutritionalGuardrailNote: string;
  };
}
export interface EvaluateParams {
  sampleId?: string;
  comboName?: string;
  menuDate?: string;
  featureVectors?: FeatureVectors;
  overridePcts?: Percentages;
  weights?: ModelWeights;
  allergyFlags?: string[];
  vegPos?: "TL" | "TR";
  pixelMeasurement?: StationMeasurement;
  cohort?: {
    id: string;
    group?: string;
    combo: string;
    date: string;
    pcts: Percentages;
    isOutlier?: boolean;
    allergyFlags?: string[];
  }[];
}
export const PTNK_TRAYS_CATALOG = engine.PTNK_TRAYS_CATALOG;
export const RIDGE_WEIGHTS: ModelWeights = engine.RIDGE_WEIGHTS;
export const MODEL = engine.MODEL;
/** "28–30/10/2026" from the dates in the gallery catalog, so adding photos never leaves a stale range. */
export function galleryDateRange(): string {
  const dates = Object.values(engine.PTNK_TRAYS_CATALOG as Record<string, { date: string }>)
    .map((m) => m.date)
    .sort();
  const day = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
  const [a, b] = [dates[0], dates[dates.length - 1]];
  if (a === b) return day(a) + "/" + a.slice(0, 4);
  return (a.slice(5, 7) === b.slice(5, 7) ? a.slice(8, 10) + "–" + day(b) : day(a) + "–" + day(b)) + "/" + b.slice(0, 4);
}
export const visionKeys: VisionKey[] = ["rice", "main", "veg", "soup"];
export const getRois = engine.getRois;
export const homography: (from: number[][], to: number[][]) => number[] = featuresLib.homography;
export const CANONICAL_TRAY_CORNERS: number[][] = featuresLib.CANONICAL_TRAY_CORNERS;
export const extractFeatures = engine.extractFeatures;
export const evaluateTrayWithTrainedModel = (
  params: EvaluateParams,
): VisionAnalysisResponse =>
  engine.evaluateTrayWithTrainedModel(params) as VisionAnalysisResponse;
export const updateWeights = (
  weights: ModelWeights,
  features: FeatureVectors,
  pcts: Percentages,
): ModelWeights => engine.updateWeights(weights, features, pcts);
export interface VisionFeed {
  ok: true;
  source: "hardware";
  revision: string;
  schoolId: string;
  latestImageUrl: string | null;
  analysis: VisionAnalysisResponse | null;
}
export function isVisionFeed(value: unknown): value is VisionFeed {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<VisionFeed>;
  if (
    v.ok !== true ||
    v.source !== "hardware" ||
    typeof v.revision !== "string" ||
    typeof v.schoolId !== "string"
  )
    return false;
  if (v.analysis === null) return true;
  const a = v.analysis;
  return (
    !!a &&
    typeof a.sampleId === "string" &&
    typeof a.timestamp === "string" &&
    typeof a.decisionLoop?.recommendation === "string" &&
    visionKeys.every(
      (k) =>
        Number.isFinite(a.components?.[k]?.wastePct) &&
        a.components[k].wastePct >= 0 &&
        a.components[k].wastePct <= 100,
    )
  );
}

export interface StationMeasurement {
  pcts: Percentages;
  rois: Record<VisionKey, [number, number, number, number]>;
  orientation: 0 | 180;
  rotation: 0 | 90;
  orientationUncertain: boolean;
  /** `ov2640-area-v1`, or `ov2640-area-v1+empty-ref` when a clean-tray frame was supplied. */
  method?: "ov2640-area-v1" | "ov2640-area-v1+empty-ref";
  /** Only with an empty-tray reference: share (0–100) of each region removed as static tray. */
  staticSuppressedPct?: Record<VisionKey, number>;
}

export interface StationFrame {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export const analyzeStationPixels = station.analyzeStationPixels as unknown as (
  image: {
    width: number;
    height: number;
    data: Uint8Array | Uint8ClampedArray;
  },
  options?: {
    orientation?: "auto" | 0 | 180;
    normalize?: boolean;
    /** Clean-tray frame from the same fixed camera; omit for the plain area reading. */
    reference?: StationFrame | null;
  },
) => StationMeasurement;
