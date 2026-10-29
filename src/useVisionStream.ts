import { useEffect, useRef, useState } from "react";
import {
  evaluateTrayWithTrainedModel,
  isVisionFeed,
  PTNK_18_TRAYS_CATALOG,
  type VisionAnalysisResponse,
} from "./lib/ecotrayVisionEngine";
export interface StreamTray {
  analysis: VisionAnalysisResponse;
  imageUrl: string | null;
  revision: string;
  source: "hardware" | "reference-fallback";
}
export function useVisionStream(schoolId: string) {
  const [hardware, setHardware] = useState<StreamTray | null>(null),
    [fallback, setFallback] = useState<StreamTray | null>(null),
    [online, setOnline] = useState(false),
    [error, setError] = useState(""),
    [approvals, setApprovals] = useState<
      { revision: string; source: string; at: string; recommendation: string }[]
    >([]);
  const revision = useRef(""),
    sequence = useRef(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
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
          if (feed.analysis && feed.revision !== revision.current) {
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
  function cycle(allergyFlags: string[] = []) {
    const ids = Object.keys(PTNK_18_TRAYS_CATALOG),
      sampleId = ids[sequence.current++ % ids.length];
    setFallback({
      analysis: evaluateTrayWithTrainedModel({ sampleId, allergyFlags }),
      imageUrl: "./ptnk-normalized/" + sampleId,
      revision: "reference-" + sequence.current,
      source: "reference-fallback",
    });
  }
  function approve() {
    if (!active || active.analysis.referenceOnly) return;
    setApprovals((old) =>
      old.some((a) => a.revision === active.revision)
        ? old
        : [
            {
              revision: active.revision,
              source: active.source,
              at: new Date().toISOString(),
              recommendation: active.analysis.decisionLoop.recommendation,
            },
            ...old,
          ].slice(0, 100),
    );
  }
  function reset() {
    sequence.current = 0;
    setFallback(null);
    setApprovals((a) => a.filter((v) => v.source === "hardware"));
  }
  return {
    active,
    hardware,
    online,
    error,
    cycle,
    approve,
    reset,
    approvals,
    usingFallback: !!fallback,
    resume: () => setFallback(null),
    approved: !!active && approvals.some((a) => a.revision === active.revision),
  };
}
