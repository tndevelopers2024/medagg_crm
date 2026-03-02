const parseDate = (raw) => {
    if (raw == null || raw === "") return null;

    const sanitize = (dt) => {
        if (!dt) return null;
        if (isNaN(dt)) throw new Error(`Could not parse date from value: "${raw}"`);
        const y = dt.getFullYear();
        if (y < 1970 || y > 2100) throw new Error(`Year ${y} is out of bounds (1970-2100) for value: "${raw}"`);
        return dt;
    };

    const s = String(raw).trim();
    if (!s) return null;

    const parts = s.split(/\s+/);
    const datePart = parts[0];
    const timePart = parts[1];

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

    const dmySlash = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmySlash) {
        const result = buildDate(dmySlash[1], dmySlash[2], dmySlash[3], timePart);
        if (result) return result;
    }
    return null;
};

console.log(parseDate("02/03/2026"));
console.log(parseDate("02/12/2026"));
console.log(parseDate("02/11/2026"));
