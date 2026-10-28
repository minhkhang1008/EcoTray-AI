import type { Capture, IotStatus, NfcEvent } from "../lib/contracts";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const count = (v: unknown) => finite(v) && Number.isInteger(v);
const optionalString = (v: unknown) => v === undefined || typeof v === "string";
const timestamp = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
function nfc(v: unknown): v is NfcEvent {
  return (
    object(v) &&
    typeof v.eventId === "string" &&
    ["VALID", "ALLERGY_WARNING", "ALREADY_REDEEMED", "UNKNOWN_CARD"].includes(
      String(v.status),
    ) &&
    count(v.servedCount) &&
    timestamp(v.recordedAt) &&
    Array.isArray(v.allergyFlags) &&
    v.allergyFlags.every((f) => typeof f === "string") &&
    optionalString(v.cardUidHash) &&
    optionalString(v.studentCode) &&
    (v.menu === null ||
      (object(v.menu) &&
        typeof v.menu.name === "string" &&
        typeof v.menu.menuId === "string"))
  );
}
function captureResult(v: unknown) {
  return (
    object(v) &&
    ["rice", "vegetables", "main"].every(
      (k) => finite(v[k]) && Number(v[k]) <= 100,
    ) &&
    (v.soup === undefined || (finite(v.soup) && v.soup <= 100)) &&
    typeof v.isOutlier === "boolean" &&
    typeof v.recommendation === "string"
  );
}
function capture(v: unknown): v is Capture {
  return (
    object(v) &&
    typeof v.captureId === "string" &&
    ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"].includes(
      String(v.status),
    ) &&
    timestamp(v.capturedAt) &&
    optionalString(v.dishId) &&
    optionalString(v.menuName) &&
    optionalString(v.errorMessage) &&
    (v.latencyMs === undefined || finite(v.latencyMs)) &&
    (v.imageUrl === undefined ||
      (typeof v.imageUrl === "string" &&
        (v.imageUrl.startsWith("/api/iot/image?") ||
          v.imageUrl.startsWith("https://")))) &&
    (v.result === undefined || captureResult(v.result)) &&
    (v.status !== "COMPLETED" || captureResult(v.result))
  );
}
export function parseIotStatus(v: unknown): IotStatus {
  if (
    !object(v) ||
    v.source !== "hardware" ||
    typeof v.online !== "boolean" ||
    !count(v.servedCount) ||
    (v.lastUpdatedAt !== null && !timestamp(v.lastUpdatedAt)) ||
    (v.latestNfc !== null && !nfc(v.latestNfc)) ||
    (v.latestCapture !== null && !capture(v.latestCapture)) ||
    (v.captures !== undefined &&
      (!Array.isArray(v.captures) ||
        v.captures.length > 100 ||
        !v.captures.every(capture)))
  )
    throw Error("Phản hồi IoT chưa đúng hợp đồng.");
  return v as unknown as IotStatus;
}
export async function responseJson(response: Response): Promise<unknown> {
  const data: unknown = await response.json();
  if (!response.ok)
    throw Error(
      object(data) &&
        object(data.error) &&
        typeof data.error.message === "string"
        ? data.error.message
        : "Không kết nối được trạm IoT.",
    );
  return data;
}
