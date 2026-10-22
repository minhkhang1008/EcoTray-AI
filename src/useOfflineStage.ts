import { useEffect, useState } from "react";
export function useOfflineStage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let alive = true;
    const check = () => {
      if (navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (alive && event.data?.ready === true) setReady(true);
          channel.port1.close();
        };
        navigator.serviceWorker.controller.postMessage("OFFLINE_READY", [
          channel.port2,
        ]);
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", check);
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(check)
      .catch(() => {
        if (alive) setReady(false);
      });
    return () => {
      alive = false;
      navigator.serviceWorker.removeEventListener("controllerchange", check);
    };
  }, []);
  return ready;
}
