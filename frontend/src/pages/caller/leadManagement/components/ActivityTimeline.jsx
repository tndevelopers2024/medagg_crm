import React from "react";
import { FiRefreshCcw } from "react-icons/fi";
import { Card, Timeline, Empty, Button } from "antd";
import { fmtTime, actionMeta, formatActivity } from "../utils/helpers";
import { BASE_URL } from "../../../../utils/api";

export default function ActivityTimeline({
  activities,
  actsLoading,
  onRefresh,
}) {
  const formatValue = (v) => {
    if (v === null || v === undefined || v === "")
      return <span className="text-gray-400 italic">Empty</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const timelineItems =
    activities && activities.length
      ? activities.map((a) => {
          const aid = String(a.id || a._id);
          const at = a.createdAt ? new Date(a.createdAt) : null;
          const when = at
            ? `${at.toLocaleDateString()} • ${fmtTime(at)}`
            : "";
          const meta = actionMeta(a.action);

          return {
            key: aid,
            dot: (
              <div
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${meta.tone}`}
              >
                <meta.Icon className="w-3.5 h-3.5" />
              </div>
            ),
            children: (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatActivity(a)}
                  </span>
                  <span className="text-xs text-gray-500">{when}</span>
                </div>

                {a.action === "recording_uploaded" &&
                  a.meta?.recordingFilename && (
                    <div className="mt-2">
                      <audio
                        controls
                        src={`${BASE_URL.replace(
                          "/api/v1",
                          ""
                        )}/uploads/recordings/${a.meta.recordingFilename}`}
                        className="w-full max-w-md h-8"
                      />
                    </div>
                  )}

                {((a.diff && (a.diff.before || a.diff.after)) ||
                  (a.meta && Object.keys(a.meta).length > 0)) && (
                  <div className="mt-2 text-xs">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
                      {(a.diff?.before || a.diff?.after) && (
                        <div className="space-y-1">
                          {Object.keys({
                            ...a.diff?.before,
                            ...a.diff?.after,
                          }).map((key) => {
                            if (key === "_id" || key === "updatedAt")
                              return null;
                            const oldVal = a.diff?.before?.[key];
                            const newVal = a.diff?.after?.[key];
                            if (!oldVal && !newVal) return null;
                            if (
                              JSON.stringify(oldVal) ===
                              JSON.stringify(newVal)
                            )
                              return null;

                            return (
                              <div
                                key={key}
                                className="flex flex-wrap items-baseline gap-2"
                              >
                                <span className="font-medium text-gray-700 capitalize">
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .trim()
                                    .replace(/_/g, " ")}
                                  :
                                </span>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="line-through opacity-75 text-red-600/70">
                                    {formatValue(oldVal)}
                                  </span>
                                  <span>&rarr;</span>
                                  <span className="font-semibold text-emerald-700">
                                    {formatValue(newVal)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {a.meta && Object.keys(a.meta).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          {Object.entries(a.meta).map(([mKey, mVal]) => {
                            if (mKey === "recordingFilename") return null;
                            return (
                              <div
                                key={mKey}
                                className="flex gap-2 text-gray-500"
                              >
                                <span className="capitalize">{mKey}:</span>
                                <span>{String(mVal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ),
          };
        })
      : [];

  return (
    <Card
      title="Activity Timeline"
      extra={
        <Button
          onClick={onRefresh}
          icon={
            <FiRefreshCcw className={actsLoading ? "animate-spin" : ""} />
          }
        >
          Refresh
        </Button>
      }
    >
      {timelineItems.length > 0 ? (
        <Timeline items={timelineItems} />
      ) : (
        <Empty
          description={actsLoading ? "Loading..." : "No recent activity."}
        />
      )}
    </Card>
  );
}
