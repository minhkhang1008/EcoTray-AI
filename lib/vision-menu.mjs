export const PTNK_STATION_MENU = "Thịt kho tàu + Bắp cải xào + Canh bầu";
export function captureMenuDate(timestamp) {
  const at = new Date(timestamp);
  if (!Number.isFinite(at.getTime())) return null;
  return new Date(at.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
/** No catalog or simulation rows are silently injected into the device cohort.
 * @param {{schoolId:string, comboName?:string, menuDate?:string, capturedAt:string,
 * activeMenu?:{combo:string,date:string}, latestNfc?:{status:string,recordedAt:string,menu?:{name:string}}}} params
 */
export function resolveStationMenu({
  schoolId,
  comboName,
  menuDate,
  capturedAt,
  activeMenu,
  latestNfc,
}) {
  const date = menuDate ?? captureMenuDate(capturedAt);
  const recentNfc =
    latestNfc &&
    ["VALID", "ALLERGY_WARNING"].includes(latestNfc.status) &&
    captureMenuDate(latestNfc.recordedAt) === date &&
    Math.abs(Date.parse(capturedAt) - Date.parse(latestNfc.recordedAt)) <=
      2 * 3600000;
  return {
    comboName:
      comboName ||
      (activeMenu?.date === date ? activeMenu.combo : null) ||
      (recentNfc ? latestNfc.menu?.name : null) ||
      (schoolId === "ptnk" ? PTNK_STATION_MENU : "Thực đơn chưa cấu hình"),
    menuDate: date,
  };
}
