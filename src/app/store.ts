import { useEffect, useState } from "react";
import { loadState } from "../storage/db";
import type { AthleteState } from "../domain/schema";
export function useAthleteStore() {
  const [state, setState] = useState<AthleteState | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  async function refresh() {
    try {
      setState(await loadState());
      setError("");
    } catch (e) {
      setError("Could not read local records: " + String(e));
    }
  }
  useEffect(() => {
    void refresh();
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
