"use client";

import { useEffect, useMemo, useState } from "react";

type Store<T> = {
  data: T;
  setData: (next: T) => void;
  hydrate: () => void;
  clear: () => void;
};

export function useMobileCache<T>(key: string, initialValue: T): Store<T> {
  const [data, setDataState] = useState<T>(initialValue);

  function hydrate() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      setDataState(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  function setData(next: T) {
    setDataState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore quota
    }
  }

  function clear() {
    try {
      localStorage.removeItem(key);
    } catch {}
    setDataState(initialValue);
  }

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => ({ data, setData, hydrate, clear }), [data]);
}
