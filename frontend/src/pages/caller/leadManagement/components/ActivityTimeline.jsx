import React from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { Card, Empty, Button, Tag } from "antd";
import { fmtTime, actionMeta, formatActivity } from "../utils/helpers";
import { BASE_URL } from "../../../../utils/api";

// Format seconds → "1m 23s" / "45s", returns null if ≤ 0
function formatDuration(secs) {
  const s = parseInt(secs, 10);
  if (!s || s <= 0) return null;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

// CamelCase / snake_case → "Human Label"
function fmtKey(k) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Keys always excluded from generic meta rendering
const SKIP_ALWAYS = new Set(["recordingFilename", "source"]);

function MetaSection({ a }) {
  const m = a.meta || {};
  const action = a.action;

  // ── WhatsApp: render as a message bubble ──────────────────────────────
  if (action === "telcrm_whatsapp") {
    const fullMsg = m.FullMessage || m.fullMessage || m.message || "";
    const dir = (m.MessageType || m.messageType || "").toLowerCase();
    if (!fullMsg) return null;
    return (
      <p
        className={`mt-2 text-xs leading-relaxed rounded-lg px-3 py-2 border ${
          dir === "outgoing"
            ? "bg-emerald-50 border-emerald-100 text-gray-700"
            : "bg-blue-50 border-blue-100 text-gray-700"
        }`}
      >
        {fullMsg}
      </p>
    );
  }

  // ── Calls: only show meaningful fields ────────────────────────────────
  if (action === "call_logged" || action === "telcrm_call") {
    const dur = m.duration ?? m.Duration;
    const durStr = formatDuration(dur);
    const callType = m.callType || m.CallType || "";
    const feedback = m.feedback || m.Feedback || "";
    const note = m.note || m.Note || "";

    const hasContent = durStr || feedback || note;
    if (!hasContent) return null;

    return (
      <div className="mt-2 flex flex-wrap items-start gap-1.5">
        {durStr && (
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {durStr}
          </span>
        )}
        {feedback && (
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <span className="font-medium mr-1">Feedback:</span> {feedback}
          </span>
        )}
        {note && (
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span className="font-medium mr-1">Note:</span> {note}
          </span>
        )}
      </div>
    );
  }

  // ── Generic: filter empty / zero / skip-listed keys ──────────────────
  const entries = Object.entries(m).filter(([k, v]) => {
    if (SKIP_ALWAYS.has(k)) return false;
    if (v === null || v === undefined || v === "" || v === 0 || v === "0") return false;
    if (typeof v === "number" && v < 0) return false;
    return true;
  });

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <Tag key={k} className="!text-[11px] !m-0 !border-gray-200 !bg-white">
          <span className="text-gray-500">{fmtKey(k)}:</span>{" "}
          <span className="text-gray-700">{String(v)}</span>
        </Tag>
      ))}
    </div>
  );
}

export default function ActivityTimeline({ activities, actsLoading, onRefresh }) {
  const formatValue = (v) => {
    if (v === null || v === undefined || v === "")
      return <span className="text-gray-400 italic">—</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const items = activities?.length
    ? activities.map((a) => {
        const aid = String(a.id || a._id);
        const at = a.createdAt ? new Date(a.createdAt) : null;
        const dateStr = at ? at.toLocaleDateString("en-GB") : "";
        const timeStr = at ? fmtTime(at) : "";
        const meta = actionMeta(a.action);

        const changes = [];
        if (a.diff?.before || a.diff?.after) {
          const allKeys = Object.keys({ ...a.diff?.before, ...a.diff?.after });
          allKeys.forEach((key) => {
            if (key === "_id" || key === "updatedAt") return;
            const oldVal = a.diff?.before?.[key];
            const newVal = a.diff?.after?.[key];
            if (!oldVal && !newVal) return;
            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return;
            changes.push({ key, oldVal, newVal });
          });
        }

        return { aid, dateStr, timeStr, meta, changes, a };
      })
    : [];

  return (
    <Card
      title="Activity Timeline"
      extra={
        <Button
          onClick={onRefresh}
          size="small"
          icon={<FiRefreshCcw className={actsLoading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      }
      bodyStyle={{ padding: "12px 16px" }}
    >
      {items.length > 0 ? (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[17px] top-6 bottom-6 w-px bg-gray-100 pointer-events-none" />

          <div className="space-y-0.5">
            {items.map(({ aid, dateStr, timeStr, meta, changes, a }) => (
              <div key={aid} className="relative flex gap-3 py-2.5">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${meta.tone}`}
                  >
                    <meta.Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1.5">
                  {/* Title + timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                      {formatActivity(a)}
                    </p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                      {dateStr}
                      {timeStr && ` · ${timeStr}`}
                    </span>
                  </div>

                  {/* Recording */}
                  {a.action === "recording_uploaded" && a.meta?.recordingFilename && (
                    <div className="mt-2">
                      <audio
                        controls
                        src={`${BASE_URL.replace("/api/v1", "")}/uploads/recordings/${a.meta.recordingFilename}`}
                        className="w-full max-w-sm h-8"
                      />
                    </div>
                  )}

                  {/* Diff changes */}
                  {changes.length > 0 && (
                    <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs space-y-1">
                      {changes.map(({ key, oldVal, newVal }) => (
                        <div key={key} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-500 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim().replace(/_/g, " ")}:
                          </span>
                          {oldVal !== undefined && oldVal !== null && oldVal !== "" && (
                            <>
                              <span className="text-red-400 line-through">
                                {formatValue(oldVal)}
                              </span>
                              <span className="text-gray-300">→</span>
                            </>
                          )}
                          <span className="text-emerald-600 font-medium">
                            {formatValue(newVal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Smart meta */}
                  <MetaSection a={a} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Empty description={actsLoading ? "Loading..." : "No recent activity."} />
      )}
    </Card>
  );
}
