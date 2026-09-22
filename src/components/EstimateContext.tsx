"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Estimate } from "@/lib/schemas";

type NeedValue = "rental" | "catering" | "both";

type EstimateContextValue = {
  estimate: Estimate | null;
  attach: (estimate: Estimate) => void;
  clear: () => void;
  need: NeedValue;
  setNeed: (need: NeedValue) => void;
};

const EstimateCtx = createContext<EstimateContextValue | null>(null);

/**
 * Shares the catering estimator's result with the inquiry form further down the page
 * (§5.3). Both live under this provider on /private-events; elsewhere the hook returns
 * null and the form behaves normally.
 */
export function EstimateProvider({ children }: { children: React.ReactNode }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [need, setNeed] = useState<NeedValue>("rental");

  const attach = useCallback((next: Estimate) => {
    setEstimate(next);
    // "Send this with my request" implies catering — upgrade a rental-only choice.
    setNeed((current) => (current === "rental" ? "both" : "catering"));
  }, []);

  const clear = useCallback(() => setEstimate(null), []);

  const value = useMemo(
    () => ({ estimate, attach, clear, need, setNeed }),
    [estimate, attach, clear, need],
  );

  return <EstimateCtx.Provider value={value}>{children}</EstimateCtx.Provider>;
}

export function useEstimate(): EstimateContextValue | null {
  return useContext(EstimateCtx);
}
