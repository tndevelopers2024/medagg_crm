import { useEffect, useRef, useState } from "react";

export default function useLeadSelection(leads, serverMeta) {
  // Initialize from sessionStorage if available
  const [selected, setSelected] = useState(() => {
    try {
      const stored = sessionStorage.getItem("medagg_selected_leads");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (err) {
      console.error("Failed to parse stored selected leads", err);
    }
    return new Set();
  });
  const headerCheckboxRef = useRef(null);

  // Sync back to sessionStorage whenever `selected` changes
  useEffect(() => {
    try {
      sessionStorage.setItem("medagg_selected_leads", JSON.stringify(Array.from(selected)));
    } catch (err) {
      console.error("Failed to save selected leads to session storage", err);
    }
  }, [selected]);

  // Server already paginates — currentRows = leads as-is
  const currentRows = leads;
  const totalPages = serverMeta?.totalPages || 1;
  const pageSize = serverMeta?.limit || 20;

  const toggleAllCurrentPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = currentRows.every((r) => next.has(r.id));
      if (allSelected) {
        currentRows.forEach((r) => next.delete(r.id));
      } else {
        currentRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const isAllCurrentSelected = currentRows.length > 0 && currentRows.every((r) => selected.has(r.id));
  const isSomeCurrentSelected =
    currentRows.some((r) => selected.has(r.id)) && !isAllCurrentSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentSelected;
    }
  }, [isSomeCurrentSelected]);

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return {
    selected,
    setSelected,
    pageSize,
    totalPages,
    currentRows,
    toggleOne,
    toggleAllCurrentPage,
    isAllCurrentSelected,
    isSomeCurrentSelected,
    headerCheckboxRef,
  };
}
