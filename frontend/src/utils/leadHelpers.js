/** Parse a date value into a valid Date object, or return null */
const parseDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
};

/** Extract IST date/time parts using official IANA timezone (most reliable) */
const istParts = (date) => {
    const d = parseDate(date);
    if (!d) return null;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find(p => p.type === type)?.value || '00';
    return { dd: get('day'), mm: get('month'), yyyy: get('year'), hh: get('hour'), min: get('minute') };
};

/** Format a date as DD/MM/YYYY in IST */
export const formatDateIN = (date) => {
    const p = istParts(date);
    if (!p) return '—';
    return `${p.dd}/${p.mm}/${p.yyyy}`;
};

/** Format a date+time as DD/MM/YYYY HH:mm in IST (24-hour) */
export const formatDateTimeIN = (date) => {
    const p = istParts(date);
    if (!p) return '—';
    return `${p.dd}/${p.mm}/${p.yyyy} ${p.hh}:${p.min}`;
};

export const formatPhoneNumber = (phone) => {
    if (!phone) return "—";
    const cleaned = String(phone).replace(/\D/g, "");
    return cleaned.length === 10
        ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
        : String(phone);
};

export const readField = (fieldData = [], keys = []) => {
    for (const f of fieldData) {
        const k = (f?.name || "").toLowerCase().replace(/\s+/g, "_");
        if (keys.includes(k)) {
            const v = Array.isArray(f?.values) ? f.values[0] : f?.values || "";
            if (v) return String(v);
        }
    }
    return "";
};

export const parseLead = (lead, campaignMap = new Map()) => {
    const name =
        readField(lead.fieldData, ["full_name", "lead_name", "name"]) ||
        readField(lead.fieldData, ["first_name"]) ||
        "—";

    const phone =
        readField(lead.fieldData, ["phone_number", "phone", "mobile", "contact_number"]) || "—";

    const leadStatus =
        (lead.status && String(lead.status).replace(/_/g, "-")) ||
        readField(lead.fieldData, ["lead_status", "status", "stage", "type"]) ||
        "—";

    // Helper to derive status from bookings
    const deriveStatus = (bookings = []) => {
        if (!bookings || bookings.length === 0) return "—";
        if (bookings.some(b => b.status === "done")) return "done";
        if (bookings.some(b => b.status === "booked")) return "booked";
        if (bookings.some(b => b.status === "pending")) return "pending";
        if (bookings.some(b => b.status === "cancelled")) return "cancelled";
        return "—";
    };

    const opdStatus = deriveStatus(lead.opBookings);
    const ipdStatus = deriveStatus(lead.ipBookings);
    const diagnosticStatus = deriveStatus(lead.diagnosticBookings);
    const diagnostic =
        readField(lead.fieldData, ["diagnostic", "diagnostics", "diagnostic_non", "diagnostic_status"]) ||
        "—";

    const createdTime = lead.createdTime ? new Date(lead.createdTime) : null;
    const lastUpdate =
        (lead.lastCallAt && new Date(lead.lastCallAt)) ||
        (lead.updatedAt && new Date(lead.updatedAt)) ||
        (lead.createdAt && new Date(lead.createdAt)) ||
        createdTime;

    const campaignName = lead.campaignId ? (campaignMap.get(lead.campaignId) || `Campaign ${lead.campaignId}`) : "";

    const source =
        readField(lead.fieldData, ["source"]) ||
        (campaignName ? campaignName : "Unknown");

    const assignedToRaw = lead.assignedTo || null;
    const assignedTo = (assignedToRaw && typeof assignedToRaw === 'object') ? assignedToRaw._id : assignedToRaw;
    const assignedToUser = (assignedToRaw && typeof assignedToRaw === 'object') ? assignedToRaw : null;

    return {
        id: lead._id || lead.id || lead.leadId,
        createdTime,
        lastUpdate,
        assignedTo, // Always ID string or null
        assignedToUser, // Full Object or null
        campaignId: lead.campaignId || null,
        adId: lead.adId || null,
        source,
        campaignName,
        name,
        phone,
        leadStatus,
        opdStatus,
        ipdStatus,
        diagnosticStatus,
        diagnostic,
        followUpAt: lead.followUpAt || null,
        raw: lead,
    };
};

export const getField = (fd = [], name) =>
    fd.find((f) => (f?.name || "").toLowerCase() === String(name).toLowerCase())?.values?.[0] || "";

export const socketPayloadToLead = (p = {}) => {
    const fieldData = p.fieldData || p.field_data || [];
    return {
        _id: p._id || p.id,
        id: p._id || p.id,
        leadId: p.lead_id || p.leadId,
        createdTime:
            p.created_time || p.createdTime || p.created_at || p.createdAt || new Date().toISOString(),
        fieldData,
        status: p.status || "new",
        assignedTo: p.assigned_to || p.assignedTo || null,
        campaignId: p.campaignId || null,
    };
};

export const summarizeSocketLead = (p = {}) => {
    const s = p.summary || {};
    const fd = p.fieldData || p.field_data || [];

    const name =
        s.name || getField(fd, "full_name") || getField(fd, "name") || getField(fd, "lead_name") || "—";
    const phone =
        s.phone || getField(fd, "phone_number") || getField(fd, "phone") || getField(fd, "mobile") || "—";
    const email = s.email || getField(fd, "email") || getField(fd, "email_address") || "—";
    const source = s.source || getField(fd, "source") || getField(fd, "page_name") || "Website";
    const message =
        s.concern ||
        s.message ||
        getField(fd, "concern") ||
        getField(fd, "message") ||
        getField(fd, "comments") ||
        getField(fd, "notes") ||
        "—";

    const createdRaw =
        p.created_time || p.createdTime || p.createdAt || p.created_at || Date.now();
    const createdTime = createdRaw ? new Date(createdRaw) : new Date();

    const id = p.lead_id || p.id || p._id || p.leadId || "";
    return { id, name, phone, email, source, message, createdTime };
};
