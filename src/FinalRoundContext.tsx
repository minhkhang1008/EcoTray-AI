import { useVisionStream } from "./useVisionStream";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  adapters,
  initialStage,
  stageReducer,
  operationalDecision,
  trimOutliers,
  calibrateWeights,
} from "../lib/final-round.mjs";
import { summarize } from "../lib/core.mjs";
import type {
  Adapter,
  CalibrationSample,
  ComponentKey,
  Intervention,
  IotStatus,
  StageState,
  TrayRow,
} from "../lib/contracts";
import { parseIotStatus, responseJson } from "./iotClient";
import { useOfflineStage } from "./useOfflineStage";

function useStored<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      return validate(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageError("");
    } catch {
      setStorageError(
        "Không thể lưu trên thiết bị. Hãy xuất CSV để giữ bản ghi.",
      );
    }
  }, [key, value]);
  return [value, setValue, storageError] as const;
}
const validAdapter = (v: unknown): v is Adapter =>
  v === "lite" || v === "standard" || v === "pro";
const validSamples = (v: unknown): v is CalibrationSample[] =>
  Array.isArray(v) &&
  v.length < 10000 &&
  v.every(
    (s) =>
      s &&
      typeof s.id === "string" &&
      typeof s.at === "string" &&
      Number.isFinite(Date.parse(s.at)) &&
      ["rice", "vegetables", "main"].includes(s.component) &&
      Number.isFinite(s.percent) &&
      s.percent > 0 &&
      s.percent <= 100 &&
      Number.isFinite(s.grams) &&
      s.grams >= 0 &&
      s.grams <= 3000 &&
      s.source === "measured-reference",
  );
const validHistory = (v: unknown): v is Intervention[] =>
  Array.isArray(v) &&
  v.length <= 500 &&
  v.every(
    (r) =>
      r &&
      typeof r.id === "string" &&
      typeof r.at === "string" &&
      Number.isFinite(Date.parse(r.at)) &&
      typeof r.text === "string" &&
      typeof r.menu === "string" &&
      ["simulation", "hardware"].includes(r.source),
  );
function useFinalState() {
  const offlineReady = useOfflineStage();
  const schoolId = import.meta.env.VITE_IOT_SCHOOL_ID || "ptnk";
  const vision = useVisionStream(schoolId);
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || "PTNK";
  const [adapter, setAdapter, adapterError] = useStored(
    "ecotray-adapter-v1",
    "pro" as Adapter,
    validAdapter,
  );
  const [samples, setSamples, sampleError] = useStored<CalibrationSample[]>(
    "ecotray-calibration-v1",
    [],
    validSamples,
  );
  const [history, setHistory, historyError] = useStored<Intervention[]>(
    "ecotray-interventions-v1",
    [],
    validHistory,
  );
  const [stage, dispatch] = useReducer(stageReducer, undefined, initialStage);
  const [source, setSource] = useState<"simulation" | "hardware">("hardware");
  const [watching, setWatching] = useState(true),
    [remote, setRemote] = useState<IotStatus | null>(null),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [notice, setNotice] = useState("");
  const [hardwareApproved, setHardwareApproved] = useState<string[]>([]);
  useEffect(() => {
    if (source !== "hardware" || !watching) {
      setConnected(false);
      return;
    }
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      try {
        const r = await fetch(
          `/api/iot/status?schoolId=${encodeURIComponent(schoolId)}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(4500),
            ]),
            cache: "no-store",
          },
        );
        const status = parseIotStatus(await responseJson(r));
        if (alive) {
          setRemote(status);
          setConnected(true);
          setError("");
        }
      } catch (e) {
        if (alive) {
          setConnected(false);
          setError((e as Error).message);
        }
      } finally {
        if (alive) timer = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, watching]);
  useEffect(() => {
    setRemote(null);
    setError("");
  }, [source]);
  const hardwareRows: TrayRow[] = (remote?.captures ?? [])
    .filter((c) => c.status === "COMPLETED" && c.result)
    .map((c) => ({
      id: c.captureId,
      date: c.capturedAt.slice(0, 10),
      menu: c.menuName ?? c.dishId ?? "Chưa gắn món",
      source: "hardware",
      rice: c.result!.rice,
      vegetables: c.result!.vegetables,
      main: c.result!.main,
      allergyFlags: c.result!.isOutlier ? ["Cờ ngoại lai từ trạm"] : [],
    }));
  const hardware: StageState = {
    served: remote?.servedCount ?? 0,
    savedTickets: remote?.servedCount ?? 0,
    nfc: remote?.latestNfc ?? null,
    capture: remote?.latestCapture ?? null,
    analyzed: remote?.latestCapture?.status === "COMPLETED",
    approved: hardwareApproved.includes(remote?.latestCapture?.captureId ?? ""),
    history: history.filter((h) => h.source === "hardware"),
    redeemed: [],
    sequence: 0,
  };
  const state = source === "simulation" ? stage : hardware;
  const activeRows = hardwareRows.filter(
    (r) =>
      !!state.capture?.dishId &&
      r.date === state.capture?.capturedAt.slice(0, 10) &&
      r.menu ===
        (state.capture?.menuName ?? state.capture?.dishId ?? "Chưa gắn món"),
  );
  const trimmed = trimOutliers(activeRows),
    stats = summarize(trimmed.rows);
  const isDemo = source === "simulation";
  const isOutlier = isDemo
    ? !!stage.capture?.result?.isOutlier
    : !!hardware.capture?.result?.isOutlier ||
      (!!hardware.capture &&
        activeRows.some((r) => r.id === hardware.capture!.captureId) &&
        !trimmed.rows.some((r) => r.id === hardware.capture!.captureId));
  const decision = operationalDecision({
    registered: isDemo ? 1017 : undefined,
    served: state.served,
    values: isDemo
      ? {
          rice: 12.5,
          vegetables: state.capture?.result?.vegetables ?? 46.5,
          main: 9.5,
        }
      : {
          rice: stats.rice.mean,
          vegetables: stats.vegetables.mean,
          main: stats.main.mean,
        },
    isOutlier,
    vegetableServedGrams: isDemo ? state.capture?.result?.vegetableServedGrams : undefined,
    sampleCount: isDemo
      ? 64
      : Math.min(stats.rice.n, stats.vegetables.n, stats.main.n),
  });
  function approve() {
    if (!state.analyzed || !state.capture || state.approved) return;
    const intervention: Intervention = {
      id: `${source}-${state.capture.captureId}`,
      captureId: state.capture.captureId,
      at: new Date().toISOString(),
      menu: state.capture.menuName ?? state.capture.dishId ?? "Chưa gắn món",
      kind: decision.kind,
      text: decision.text,
      source,
    };
    setHistory((old) =>
      old.some((h) => h.id === intervention.id)
        ? old
        : [intervention, ...old].slice(0, 500),
    );
    if (isDemo) dispatch({ type: "approve", at: intervention.at });
    else setHardwareApproved((ids) => [...ids, state.capture!.captureId]);
    setNotice(
      decision.kind === "outlier"
        ? "Đã xác nhận tách mẫu ngoại lai; giữ nguyên khẩu phần chung."
        : decision.kind === "insufficient"
          ? "Đã ghi nhận yêu cầu thu thập thêm mẫu."
          : "Bếp đã phê duyệt và ghi vào lịch sử trên thiết bị này.",
    );
  }
  function resetStage() {
    dispatch({ type: "reset" });
    setHistory((h) => h.filter((x) => x.source !== "simulation"));
    setNotice("Đã đặt lại dữ liệu dự phòng.");
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || target.closest('input,select,textarea,[contenteditable=true]') || document.querySelector('dialog[open]')) return;
      if (['1','2','3'].includes(event.key)) {
        event.preventDefault(); setSource('simulation');
        dispatch({type:'scan',scenario:({'1':'normal','2':'allergy','3':'unknown'} as const)[event.key as '1'|'2'|'3']});
      } else if (event.key === '4' || event.key === ' ') {
        if (event.key === ' ' && target.closest('button,summary,a')) return;
        event.preventDefault(); setSource('simulation'); vision.cycle(stage.nfc?.allergyFlags ?? []);
      } else if (event.key === '5') { event.preventDefault(); vision.approve(); }
      else if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetStage(); vision.reset(); setSource('hardware'); }
    };
    window.addEventListener('keydown',listener);
    return () => window.removeEventListener('keydown',listener);
  });
  const fullPortion = (component: ComponentKey) => {
    const subset = samples.filter((s) => s.component === component);
    return subset.length ? calibrateWeights(subset) : null;
  };
  return {
    offlineReady,
    vision,
    schoolId,
    schoolName,
    adapter,
    setAdapter,
    adapterInfo: adapters[adapter],
    samples,
    setSamples,
    fullPortion,
    history,
    stage,
    dispatch,
    source,
    setSource,
    state,
    remote,
    watching,
    setWatching,
    connected,
    error,
    notice,
    setNotice,
    decision,
    isOutlier,
    approve,
    resetStage,
    hardwareRows,
    trimmed,
    storageError: adapterError || sampleError || historyError,
  };
}
type FinalContext = ReturnType<typeof useFinalState>;
const Context = createContext<FinalContext | null>(null);
export function FinalRoundProvider({ children }: { children: ReactNode }) {
  return (
    <Context.Provider value={useFinalState()}>{children}</Context.Provider>
  );
}
export function useFinalRound() {
  const value = useContext(Context);
  if (!value) throw Error("Thiếu FinalRoundProvider");
  return value;
}
