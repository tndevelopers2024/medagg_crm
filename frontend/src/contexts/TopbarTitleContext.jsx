import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

const TopbarCtx = createContext(null);

export const TopbarTitleProvider = ({ children }) => {
  const [title, setTitle] = useState(null);
  const [subtitle, setSubtitle] = useState(null);

  const setTopbar = useCallback((payload) => {
    if (!payload) { // reset
      setTitle(null);
      setSubtitle(null);
      return;
    }
    if ("title" in payload) setTitle(payload.title ?? null);
    if ("subtitle" in payload) setSubtitle(payload.subtitle ?? null);
  }, []);

  const value = useMemo(
    () => ({ title, subtitle, setTitle, setSubtitle, setTopbar }),
    [title, subtitle, setTopbar]
  );

  return <TopbarCtx.Provider value={value}>{children}</TopbarCtx.Provider>;
};

export const useTopbarTitle = () => {
  const ctx = useContext(TopbarCtx);
  if (!ctx) throw new Error("useTopbarTitle must be used within TopbarTitleProvider");
  return ctx;
};

// Optional convenience hook for pages
export const usePageTitle = (t, s) => {
  const { setTopbar } = useTopbarTitle();
  useEffect(() => {
    setTopbar({ title: t, subtitle: s });
    return () => setTopbar(null); // cleanup on unmount
  }, [t, s, setTopbar]);
};
