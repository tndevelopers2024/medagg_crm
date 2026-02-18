import React, { useState, useMemo } from "react";
import { Popover, Input, Checkbox, Button } from "antd";
import { FiColumns, FiRotateCcw } from "react-icons/fi";

export default function ColumnChooser({ allColumns, visibleIds, toggle, resetToDefaults }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const lq = query.toLowerCase();
    const map = new Map();

    allColumns.forEach((col) => {
      if (col.sticky) return;
      if (lq && !col.label.toLowerCase().includes(lq)) return;
      if (!map.has(col.category)) map.set(col.category, []);
      map.get(col.category).push(col);
    });

    return map;
  }, [allColumns, query]);

  const totalToggleable = allColumns.filter((c) => !c.sticky).length;
  const visibleCount = allColumns.filter((c) => !c.sticky && visibleIds.has(c.id)).length;

  const content = (
    <div style={{ width: 260 }}>
      <div className="mb-2">
        <Input
          placeholder="Search columns..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
          size="small"
        />
      </div>

      <div className="max-h-72 overflow-y-auto">
        {grouped.size === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">No columns match "{query}"</p>
        )}

        {[...grouped.entries()].map(([category, cols]) => (
          <div key={category} className="mb-2 last:mb-0">
            <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {category}
            </div>
            {cols.map((col) => (
              <div key={col.id} className="px-1 py-0.5">
                <Checkbox
                  checked={visibleIds.has(col.id)}
                  onChange={() => toggle(col.id)}
                >
                  <span className="text-sm">{col.label}</span>
                </Checkbox>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {visibleCount} of {totalToggleable} visible
        </span>
        <Button
          type="text"
          size="small"
          icon={<FiRotateCcw className="w-3 h-3" />}
          onClick={resetToDefaults}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Button icon={<FiColumns />}>
        Columns <span className="text-xs text-gray-400 ml-1">{visibleCount}/{totalToggleable}</span>
      </Button>
    </Popover>
  );
}
