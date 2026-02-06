import React from "react";
import { cls } from "../utils/helpers";

export default function InfoCards({ currentCampaign }) {
  return (
    <>
      {currentCampaign && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            Campaign Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-xs text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-900 text-right">
                {currentCampaign.name}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-xs text-gray-500">Platform</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {currentCampaign.platform}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Status</span>
              <span
                className={cls(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  currentCampaign.status === "active"
                    ? "bg-green-100 text-green-800"
                    : currentCampaign.status === "paused"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                )}
              >
                {currentCampaign.status
                  ? currentCampaign.status.toUpperCase()
                  : "UNKNOWN"}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
