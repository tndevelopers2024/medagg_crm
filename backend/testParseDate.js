const parseDate = (raw) => {
  if (raw == null || raw === "") return null;

  const sanitize = (dt) => {
    if (!dt) return null;
    if (isNaN(dt)) throw new Error(`Could not parse date from value: "${raw}"`);
    const y = dt.getFullYear();
    if (y < 1970 || y > 2100) throw new Error(`Year ${y} is out of bounds (1970-2100) for value: "${raw}"`);
    return dt;
  };

  // Excel serial number (days since 1900-01-01, off-by-two corrected)
  if (typeof raw === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + raw * 86400000);
    return sanitize(d);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Split into date part and optional time part: "13/12/2025 07:30:37" → ["13/12/2025", "07:30:37"]
  const parts = s.split(/\s+/);
  const datePart = parts[0];
  const timePart = parts[1]; // may be undefined

  const buildDate = (d, m, y, time) => {
    const year = String(y).length === 2
      ? (Number(y) > 50 ? 1900 + Number(y) : 2000 + Number(y))
      : Number(y);
    let h = 0, min = 0, sec = 0;
    if (time) {
      const tp = String(time).split(":");
      h = Number(tp[0]) || 0;
      min = Number(tp[1]) || 0;
      sec = Number(tp[2]) || 0;
    }
    const dt = new Date(year, Number(m) - 1, Number(d), h, min, sec);
    return sanitize(dt);
  };

  // DD/MM/YYYY or D/M/YY
  const dmySlash = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmySlash) {
    const result = buildDate(dmySlash[1], dmySlash[2], dmySlash[3], timePart);
    if (result) return result;
  }

  // DD-MM-YYYY or D-M-YY
  const dmyDash = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dmyDash) {
    const result = buildDate(dmyDash[1], dmyDash[2], dmyDash[3], timePart);
    if (result) return result;
  }

  // DD.MM.YYYY
  const dmyDot = datePart.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dmyDot) {
    const result = buildDate(dmyDot[1], dmyDot[2], dmyDot[3], timePart);
    if (result) return result;
  }

  // Last-resort: try native parse (handles ISO, RFC 2822, etc.)
  const native = new Date(s);
  return sanitize(native);
};

console.log("Empty string:", parseDate(""));
console.log("Null:", parseDate(null));
console.log("Date ok:", parseDate("2026-02-24T15:22:56+05:30"));
