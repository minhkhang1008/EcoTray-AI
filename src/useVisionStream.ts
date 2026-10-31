import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Intervention } from "../lib/contracts";
import { recordVisionDecision } from "../lib/final-round.mjs";
import {
  evaluateTrayWithTrainedModel,
  isVisionFeed,
  PTNK_TRAYS_CATALOG,
  type VisionAnalysisResponse,
} from "./lib/ecotrayVisionEngine";
export interface StreamTray {
  analysis: VisionAnalysisResponse;
  imageUrl: string | null;
  revision: string;
  source: "hardware" | "reference-fallback";
}
export function useVisionStream(schoolId: string, history: Intervention[], setHistory: Dispatch<SetStateAction<Intervention[]>>) {
  const [hardware, setHardware] = useState<StreamTray | null>(null),
    [fallback, setFallback] = useState<StreamTray | null>(null),
    [online, setOnline] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [editError, setEditError] = useState("");
  const revision = useRef(""),
    sequence = useRef(0),
    editSequence = useRef(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      const generation = editSequence.current;
      try {
        const response = await fetch(
          "/api/ai/analyze-tray?schoolId=" + encodeURIComponent(schoolId),
          {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(4000),
            ]),
          },
        );
        const feed: unknown = await response.json();
        if (!response.ok || !isVisionFeed(feed))
          throw Error("Chưa nhận được luồng Vision hợp lệ.");
        if (feed.schoolId !== schoolId)
          throw Error("Luồng Vision không thuộc trường này.");
        if (alive) {
          setOnline(true);
          setError("");
          if (generation === editSequence.current && feed.analysis && feed.revision !== revision.current) {
            revision.current = feed.revision;
            setHardware({
              analysis: feed.analysis,
              imageUrl: feed.latestImageUrl,
              revision: feed.revision,
              source: "hardware",
            });
          }
        }
      } catch (e) {
        if (alive) {
          setOnline(false);
          setError((e as Error).message);
        }
      } finally {
        if (alive) timer = setTimeout(poll, 1500);
      }
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [schoolId]);
  const active = fallback ?? hardware;
  async function reanalyze(comboName: string, menuDate: string, orientation: "auto" | 0 | 180 = "auto") {
    if (!hardware || fallback || editing) return;
    editSequence.current++;
    setEditing(true); setEditError("");
    try {
      const response = await fetch("/api/ai/analyze-tray?schoolId=" + encodeURIComponent(schoolId), {
        method: "POST", headers: {"content-type":"application/json", "x-school-id":schoolId,"idempotency-key":crypto.randomUUID()},
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({action:"reanalyze", revision:hardware.revision, comboName, menuDate, orientation}),
      });
      const feed: unknown = await response.json();
      if (!response.ok || !isVisionFeed(feed) || feed.schoolId !== schoolId || !feed.analysis)
        throw Error("Chưa cập nhật được ảnh. Có thể trạm vừa gửi ảnh mới; hãy thử lại.");
      revision.current = feed.revision;
      setHardware({analysis:feed.analysis,imageUrl:feed.latestImageUrl,revision:feed.revision,source:"hardware"});
    } catch (e) { setEditError((e as Error).message); }
    finally { setEditing(false); }
  }

  function cycle(allergyFlags: string[] = []) {
    const ids = Object.keys(PTNK_TRAYS_CATALOG),
      sampleId = ids[sequence.current++ % ids.length];
    setFallback({
      analysis: evaluateTrayWithTrainedModel({ sampleId, allergyFlags }),
      imageUrl: "./ptnk-normalized/" + sampleId,
      revision: "reference-" + crypto.randomUUID(),
      source: "reference-fallback",
    });
  }
  function approve() {
    setHistory(old => recordVisionDecision(old, active, new Date().toISOString()));
  }
  function reset() {
    sequence.current = 0;
    setFallback(null);
    setHistory(old => old.filter(entry => entry.source !== "reference-fallback"));
  }
  return {
    active,
    reanalyze, editing, editError,
    hardware,
    online,
    error,
    cycle,
    approve,
    reset,
    usingFallback: !!fallback,
    resume: () => setFallback(null),
    approved: !!active && history.some(entry => entry.id === `vision-${active.source}-${active.revision}`),
  };
}
