import React from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { Card, Empty, Button, Tag } from "antd";
import { fmtTime, actionMeta, formatActivity } from "../utils/helpers";
import { BASE_URL } from "../../../../utils/api";

export default function ActivityTimeline({
  activities,
  actsLoading,
  onRefresh,
}) {
  const formatValue = (v) => {
    if (v === null || v === undefined || v === "")
      return <span className="text-gray-400 italic">—</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const items =
    activities && activities.length
      ? activities.map((a) => {
        const aid = String(a.id || a._id);
        const at = a.createdAt ? new Date(a.createdAt) : null;
        const dateStr = at ? at.toLocaleDateString() : "";
        const timeStr = at ? fmtTime(at) : "";
        const meta = actionMeta(a.action);

        // Collect diff changes
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

        // Collect meta entries
        const metaEntries = a.meta
          ? Object.entries(a.meta).filter(
            ([k]) => k !== "recordingFilename" && k !== "source"
          )
          : [];

        return { aid, at, dateStr, timeStr, meta, changes, metaEntries, a };
      })
      : [];

  return (
    <Card
      title="Activity Timeline"
      extra={
        <Button
          onClick={onRefresh}
          size="small"
          icon={
            <FiRefreshCcw className={actsLoading ? "animate-spin" : ""} />
          }
        >
          Refresh
        </Button>
      }
      bodyStyle={{ padding: "12px 16px" }}
    >
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(({ aid, dateStr, timeStr, meta, changes, metaEntries, a }) => (
            <div
              key={aid}
              className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0 pt-0.5">
                <div
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${meta.tone}`}
                >
                  <meta.Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 leading-snug">
                    {formatActivity(a)}
                  </span>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                    {dateStr} {timeStr && `· ${timeStr}`}
                  </span>
                </div>

                {/* Recording */}
                {a.action === "recording_uploaded" &&
                  a.meta?.recordingFilename && (
                    <div className="mt-2">
                      <audio
                        controls
                        src={`${BASE_URL.replace("/api/v1", "")}/uploads/recordings/${a.meta.recordingFilename}`}
                        className="w-full max-w-sm h-8"
                      />
                    </div>
                  )}

                {/* Changes & Meta - compact grid */}
                {(changes.length > 0 || metaEntries.length > 0) && (
                  <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs">
                    {/* Diff changes */}
                    {changes.length > 0 && (
                      <div className="space-y-1">
                        {changes.map(({ key, oldVal, newVal }) => (
                          <div key={key} className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-600 capitalize min-w-[80px]">
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

                    {/* Meta entries as tags */}
                    {metaEntries.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 ${changes.length > 0 ? "mt-2 pt-2 border-t border-gray-200" : ""}`}>
                        {metaEntries.map(([mKey, mVal]) => (
                          <Tag key={mKey} className="!text-[11px] !m-0 !border-gray-200 !bg-white">
                            <span className="text-gray-500 capitalize">{mKey}:</span>{" "}
                            <span className="text-gray-700">{String(mVal)}</span>
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          description={actsLoading ? "Loading..." : "No recent activity."}
        />
      )}
    </Card>
  );
}
