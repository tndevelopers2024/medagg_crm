/**
 * Flatten rows (parent + children) and export as CSV.
 * columns: [{ key, label }], rows: [{ ...data, children?: [...] }]
 */
export function downloadTableCSV(title, columns, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = columns.map((c) => escape(c.label));
  const lines = [headers.join(",")];

  for (const row of rows) {
    const vals = columns.map((c) => {
      const raw = c.csvValue ? c.csvValue(row) : row[c.key];
      return escape(raw);
    });
    lines.push(vals.join(","));

    if (row.children) {
      for (const child of row.children) {
        const childVals = columns.map((c, i) => {
          const raw = c.csvValue ? c.csvValue(child) : child[c.key];
          return escape(i === 0 ? `  ${raw}` : raw);
        });
        lines.push(childVals.join(","));
      }
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Flat table download (BD tables).
 * columns: [{ key, label }], data: [{ ...row }]
 */
export function downloadFlatCSV(title, columns, data) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = columns.map((c) => escape(c.label));
  const lines = [headers.join(",")];

  for (const row of data) {
    const vals = columns.map((c) => escape(c.getValue ? c.getValue(row) : row[c.key]));
    lines.push(vals.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
