import { useEffect, useState, useRef } from "react";
import { loadState, storageNamespace } from "../storage/db";
import type { AthleteState } from "../domain/schema";
export function useAthleteStore() {
  const [state, setState] = useState<AthleteState | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const sequence = useRef(0),
    visibleNamespace = useRef(storageNamespace());
  async function refresh() {
    const ticket = ++sequence.current,
      ns = storageNamespace();
    if (visibleNamespace.current !== ns) {
      visibleNamespace.current = ns;
      setState(null);
    }
    try {
      const next = await loadState();
      if (ticket !== sequence.current || ns !== storageNamespace()) return;
      setState(next);
      setError("");
    } catch (e) {
      setError("Could not read local records: " + String(e));
    }
  }
  useEffect(() => {
    void refresh();
    window.addEventListener("pet-storage-changed", refresh);
    return () => window.removeEventListener("pet-storage-changed", refresh);
  }, []);
  async function perform(action: () => Promise<void>) {
    setSaving(true);
    setMessage("");
    try {
      await action();
      setState(await loadState());
      setError("");
      setMessage("Saved on this device");
      return true;
    } catch (e) {
      setError(
        "Save failed. Your current entry is retained. Retry or export a backup. " +
          String(e),
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { state, error, saving, message, perform, refresh, setError };
}
