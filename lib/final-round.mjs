/** @type {import('./contracts.ts').ComponentKey[]} */
export const componentKeys = ["rice", "vegetables", "main"];
export const componentLabels = {
  rice: "Cơm",
  vegetables: "Rau",
  main: "Món chính",
};
export const adapters = {
  lite: {
    name: "EcoTray Lite",
    description: "Mọi trường phổ thông",
    input: "Nhập thực đơn Excel/Form",
    portal: false,
    nfc: false,
    allergy: false,
  },
  standard: {
    name: "EcoTray Standard",
    description: "Quản lý theo lớp",
    input: "Báo sĩ số theo lớp",
    portal: false,
    nfc: false,
    allergy: false,
  },
  pro: {
    name: "EcoTray Pro",
    description: "Cấu hình đề xuất cho PTNK",
    input: "Đồng bộ Portal",
    portal: true,
    nfc: true,
    allergy: true,
  },
};
const quantile = (a, p) => {
  const x = (a.length - 1) * p,
    i = Math.floor(x);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (x - i);
};
/** Statistical flags are not medical diagnoses. Sparse samples cannot establish an IQR fence. */
export function trimOutliers(rows) {
  const fences = Object.fromEntries(
    componentKeys.map((k) => {
      const a = rows
        .filter((r) => !r.allergyFlags?.length)
        .map((r) => r[k])
        .filter((v) => typeof v === "number" && Number.isFinite(v))
        .sort((a, b) => a - b);
      if (a.length < 10) return [k, Infinity];
      const q1 = quantile(a, 0.25),
        q3 = quantile(a, 0.75);
      return [k, q3 + 1.5 * (q3 - q1)];
    }),
  );
  let flagged = 0,
    statistical = 0;
  const kept = rows.filter((r) => {
    if (r.allergyFlags?.length) {
      flagged++;
      return false;
    }
    if (
      componentKeys.some((k) => typeof r[k] === "number" && r[k] > fences[k])
    ) {
      statistical++;
      return false;
    }
    return true;
  });
  return {
    rows: kept,
    flagged,
    statistical,
    removed: flagged + statistical,
    total: rows.length,
    fences,
  };
}
/** @param {{registered?:number,served?:number,values?:Partial<import('./contracts.ts').Values>,isOutlier?:boolean,sampleCount?:number}} input */
export function operationalDecision({
  registered,
  served,
  values = {},
  isOutlier = false,
  sampleCount = 0,
}) {
  if (isOutlier)
    return {
      kind: "outlier",
      title: "Mẫu ngoại lai · cần xác minh",
      text: "Tách mẫu này khỏi công thức chung. Kiểm tra cờ dị ứng/cơ địa; không giảm khẩu phần của các học sinh khác.",
    };
  if (sampleCount < 10)
    return {
      kind: "insufficient",
      title: "Cần thêm dữ liệu",
      text: "Cần ít nhất 10 quan sát hợp lệ mỗi thành phần. Chưa đủ cơ sở để chỉnh khẩu phần.",
    };
  if (
    Number.isFinite(registered) &&
    registered > 0 &&
    Number.isFinite(served) &&
    served < registered * 0.9
  )
    return {
      kind: "quantity",
      title: "Chênh lệch số suất",
      text: "Thực nhận thấp hơn đăng ký trên 10%. Kiểm tra vắng học và điều chỉnh số suất chuẩn bị hoặc hệ số dự phòng.",
    };
  const high = componentKeys.filter(
    (k) => typeof values[k] === "number" && values[k] >= 20,
  );
  if (high.length)
    return {
      kind: "portion",
      title: "Điều chỉnh thành phần, giữ số suất",
      text: `${high.map((k) => componentLabels[k]).join(", ")} thừa cao. Đề xuất thử giảm 12% định lượng thành phần này và khảo sát cách chế biến. Giữ nguyên tổng số suất nấu; bếp duyệt rồi đo lại mức đủ ăn.`,
    };
  return {
    kind: "keep",
    title: "Giữ nguyên",
    text: "Đăng ký gần thực nhận và phần thừa thấp. Giữ nguyên định lượng, tiếp tục theo dõi.",
  };
}
/** @returns {import('./contracts.ts').StageState} */
export function initialStage() {
  return {
    served: 1015,
    savedTickets: 0,
    nfc: null,
    capture: null,
    analyzed: false,
    approved: false,
    history: [],
    redeemed: [],
    sequence: 0,
  };
}
/** @param {import('./contracts.ts').StageState} state @param {import('./contracts.ts').StageAction} action @returns {import('./contracts.ts').StageState} */
export function stageReducer(state, action) {
  if (action.type === "reset") return initialStage();
  if (action.type === "scan") {
    const card = action.scenario;
    const status =
      action.scenario === "unknown"
        ? "UNKNOWN_CARD"
        : state.redeemed.includes(card)
          ? "ALREADY_REDEEMED"
          : action.scenario === "allergy"
            ? "ALLERGY_WARNING"
            : "VALID";
    const accepted = status === "VALID" || status === "ALLERGY_WARNING";
    const served = state.served + (accepted ? 1 : 0);
    return {
      ...state,
      served,
      savedTickets: state.savedTickets + (accepted ? 1 : 0),
      redeemed: accepted ? [...state.redeemed, card] : state.redeemed,
      nfc: {
        eventId: `stage-nfc-${state.sequence + 1}`,
        status,
        servedCount: served,
        cardUidHash:
          action.cardHash ??
          (action.scenario === "allergy"
            ? "b"
            : action.scenario === "unknown"
              ? "c"
              : "a"
          ).repeat(64),
        studentCode:
          action.scenario === "allergy"
            ? "DEMO-250919"
            : action.scenario === "unknown"
              ? "DEMO-CHUA-DANG-KY"
              : "DEMO-250918",
        menu:
          action.scenario === "unknown"
            ? null
            : {
                menuId: action.scenario === "allergy" ? "vit" : "chay",
                name:
                  action.scenario === "allergy"
                    ? "Vịt kho gừng"
                    : "Heo lát chay kho thơm",
              },
        allergyFlags:
          action.scenario === "allergy"
            ? ["Đậu phộng / hải sản · Không múc sốt chứa chất gây dị ứng"]
            : [],
        recordedAt: "2026-10-22T04:00:00.000Z",
      },
      sequence: state.sequence + 1,
    };
  }
  if (action.type === "capture")
    return {
      ...state,
      capture: {
        captureId: `stage-${state.sequence + 1}`,
        status: "COMPLETED",
        capturedAt: "2026-10-22T04:00:00.000Z",
        imageUrl: "./tray-demo/portal.ptnk.png",
        menuName: state.nfc?.menu?.name ?? "Heo lát chay kho thơm",
        result: {
          rice: 8,
          vegetables: 62,
          main: state.nfc?.allergyFlags.length ? 100 : 5,
          isOutlier: !!state.nfc?.allergyFlags.length,
          recommendation: "",
        },
      },
      sequence: state.sequence + 1,
      analyzed: false,
      approved: false,
    };
  if (action.type === "analyze" && state.capture)
    return { ...state, analyzed: true };
  if (
    action.type === "approve" &&
    state.analyzed &&
    state.capture &&
    !state.approved
  ) {
    const d = operationalDecision({
      registered: 1017,
      served: state.served,
      values: state.capture.result,
      isOutlier: state.capture.result?.isOutlier,
      sampleCount: 64,
    });
    return {
      ...state,
      approved: true,
      history: [
        {
          id: `approval-${state.capture.captureId}`,
          at: action.at ?? "2026-10-22T04:00:00.000Z",
          menu: state.capture.menuName,
          kind: d.kind,
          text: d.text,
          source: "simulation",
          captureId: state.capture.captureId,
        },
        ...state.history,
      ],
    };
  }
  return state;
}
/** Planning scenario anchored to README, not a current AWS quote or invoice. */
export function cloudEstimate(students, days = 20) {
  if (
    !Number.isFinite(students) ||
    students < 1 ||
    students > 100000 ||
    !Number.isFinite(days) ||
    days < 1 ||
    days > 31
  )
    throw Error("Quy mô không hợp lệ.");
  const scale = ((students / 1017) * days) / 20,
    storage = Math.round(500 * scale),
    inference = Math.round(38000 * scale);
  return {
    images: students * days,
    api: 0,
    lambda: 0,
    storage,
    inference,
    total: storage + inference,
    days,
    scale,
  };
}
/** Zero-intercept least squares: grams = fullPortionGrams * percent / 100. */
export function calibrateWeights(samples) {
  if (
    !samples.length ||
    samples.some(
      (s) =>
        !Number.isFinite(s.percent) ||
        s.percent <= 0 ||
        s.percent > 100 ||
        !Number.isFinite(s.grams) ||
        s.grams < 0 ||
        s.grams > 3000,
    )
  )
    throw Error("Cần % diện tích >0 và khối lượng 0–3.000 g.");
  return (
    samples.reduce((s, r) => s + (r.percent / 100) * r.grams, 0) /
    samples.reduce((s, r) => s + (r.percent / 100) ** 2, 0)
  );
}
export function estimateGrams(percent, fullPortionGrams) {
  return Number.isFinite(percent) &&
    percent >= 0 &&
    percent <= 100 &&
    Number.isFinite(fullPortionGrams) &&
    fullPortionGrams > 0
    ? Math.round((percent / 100) * fullPortionGrams)
    : null;
}
