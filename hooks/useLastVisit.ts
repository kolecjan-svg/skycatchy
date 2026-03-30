"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "skycatchy-last-visit";

/**
 * Returns the timestamp of the previous visit (0 if first visit).
 * Updates localStorage to now on mount — SSR safe.
 */
export function useLastVisit(): number {
  const [previousVisit, setPreviousVisit] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setPreviousVisit(Number(stored));
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  return previousVisit;
}
