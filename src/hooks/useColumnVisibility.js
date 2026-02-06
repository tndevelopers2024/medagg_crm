import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "medagg_column_visibility";

/**
 * Manages column visibility state with localStorage persistence.
 *
 * @param {Array} allColumns - Full list of column definitions (static + dynamic)
 * @returns {{ visibleIds: Set, toggle: (id) => void, resetToDefaults: () => void, isVisible: (id) => boolean }}
 */
export default function useColumnVisibility(allColumns) {
  const columnsRef = useRef(allColumns);
  columnsRef.current = allColumns;

  const getDefaults = useCallback(() => {
    const set = new Set();
    columnsRef.current.forEach((col) => {
      if (col.defaultVisible || col.sticky) set.add(col.id);
    });
    return set;
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;

      // Build a set of known IDs to filter stale entries
      const knownIds = new Set(columnsRef.current.map((c) => c.id));
      const set = new Set();

      // Always include sticky columns
      columnsRef.current.forEach((col) => {
        if (col.sticky) set.add(col.id);
      });

      // Add stored IDs that still exist
      parsed.forEach((id) => {
        if (knownIds.has(id)) set.add(id);
      });

      return set;
    } catch {
      return null;
    }
  }, []);

  const [visibleIds, setVisibleIds] = useState(() => {
    return loadFromStorage() || getDefaults();
  });

  const persist = useCallback((ids) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // storage full or unavailable — silently ignore
    }
  }, []);

  const toggle = useCallback(
    (id) => {
      // Don't allow toggling sticky columns off
      const col = columnsRef.current.find((c) => c.id === id);
      if (col?.sticky) return;

      setVisibleIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaults();
    setVisibleIds(defaults);
    persist(defaults);
  }, [getDefaults, persist]);

  const isVisible = useCallback(
    (id) => visibleIds.has(id),
    [visibleIds]
  );

  return { visibleIds, toggle, resetToDefaults, isVisible };
}
