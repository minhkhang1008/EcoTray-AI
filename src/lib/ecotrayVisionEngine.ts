import * as station from "../../lib/station-vision.mjs";
import * as engine from "../../lib/ptnk-vision.mjs";
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
  predictionSource: "ridge-pixels" | "manual-calibration" | "ov2640-area";
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
export const PTNK_18_TRAYS_CATALOG = engine.PTNK_18_TRAYS_CATALOG;
export const RIDGE_WEIGHTS: ModelWeights = engine.RIDGE_WEIGHTS;
export const MODEL = engine.MODEL;
export const visionKeys: VisionKey[] = ["rice", "main", "veg", "soup"];
export const getRois = engine.getRois;
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
}

export const analyzeStationPixels = station.analyzeStationPixels as unknown as (
  image: {
    width: number;
    height: number;
    data: Uint8Array | Uint8ClampedArray;
  },
  options?: { orientation?: "auto" | 0 | 180 },
) => StationMeasurement;
