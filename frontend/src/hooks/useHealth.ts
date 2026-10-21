import { useState, useEffect, useCallback } from "react";
import { fetchHealth, HealthResponse } from "../api/health";

export type HealthState =
  | { status: "loading"; data: null; error: null }
  | { status: "ok"; data: HealthResponse; error: null }
  | { status: "error"; data: null; error: string };

export function useHealth() {
  const [state, setState] = useState<HealthState>({
    status: "loading",
    data: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await fetchHealth();
      setState({ status: "ok", data, error: null });
    } catch (err) {
      setState({
        status: "error",
        data: null,
        error: err instanceof Error ? err.message : "Unknown error connecting to API",
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { state, refetch: checkHealth };
}
