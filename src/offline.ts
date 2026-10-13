import { useEffect, useState } from "react";
import {program} from "./program/catalog";
const sourcePaths=[...new Set(program.sessions.flatMap(s=>[...s.sources,...s.alternativePlans.flatMap(a=>a.sources)]))];
async function sourcesCached(){
 const names=await caches.keys();const paths=new Set<string>();
 for(const name of names)if(name.includes("precache"))for(const req of await(await caches.open(name)).keys())paths.add(new URL(req.url).pathname);
 return sourcePaths.every(p=>paths.has("/"+p));
}
export type OfflineStatus = "preparing" | "ready" | "failed";
export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>("preparing"),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function prepare() {
      try {
        if (!("serviceWorker" in navigator) || !("caches" in window))
          throw Error("Offline storage unsupported");
        if (!navigator.onLine && navigator.serviceWorker.controller) {
          setStatus(await sourcesCached()?"ready":"failed");
          return;
        }
        const check = await fetch("/program/April/April_W1D1.jpg");
        if (!check.ok) throw Error("Source asset unavailable");
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) return;
        if (registration.waiting) setWaiting(registration.waiting);
        const worker = registration.installing ?? registration.active;
        if (!worker) throw Error("No service worker");
        const observe = async () => {
          if (cancelled) return;
          if (worker.state === "activated") {
            clearTimeout(timeout);
            setStatus(await sourcesCached()?"ready":"failed");
          } else if (worker.state === "redundant") {
            clearTimeout(timeout);
            setStatus("failed");
          }
        };
        worker.addEventListener("statechange", observe);
        observe();
        registration.addEventListener("updatefound", () => {
          const update = registration.installing;
          if (update)
            update.addEventListener("statechange", () => {
              if (
                update.state === "installed" &&
                navigator.serviceWorker.controller &&
                !cancelled
              )
                setWaiting(update);
            });
        });
        timeout = setTimeout(() => {
          if (!cancelled && worker.state !== "activated") setStatus("failed");
        }, 20000);
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }
    setStatus("preparing");
    void prepare();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [attempt]);
  function update() {
    if (
      !waiting ||
      !confirm(
        "Apply the update and reload? Save or export any open entry first.",
      )
    )
      return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }
  return {
    status,
    updateReady: !!waiting,
    update,
    retry: () => setAttempt((n) => n + 1),
  };
}
