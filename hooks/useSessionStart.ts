"use client";

import { useState, useEffect } from "react";

/**
 * Returns the timestamp of when the current browser session started.
 * Stable across re-renders. SSR safe (returns 0 on server).
 */
let SESSION_START = 0;

export function useSessionStart(): number {
  const [start, setStart] = useState(SESSION_START);

  useEffect(() => {
    if (SESSION_START === 0) {
      SESSION_START = Date.now();
    }
    setStart(SESSION_START);
  }, []);

  return start;
}
