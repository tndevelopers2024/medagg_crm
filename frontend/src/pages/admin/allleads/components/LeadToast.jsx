// LeadToast.jsx — now uses Ant Design notification
// This file re-exports a hook that wraps Ant's notification API for backward compatibility.
import { useCallback } from "react";
import { notification, Button } from "antd";
import { FiPhoneCall, FiUser, FiInfo } from "react-icons/fi";
import { formatPhoneNumber } from "../../../../utils/leadHelpers";

function LeadDescription({ details }) {
  if (!details) return null;
  return (
    <div className="space-y-1.5 text-xs mt-1">
      {details.phone && (
        <div className="flex items-center gap-2">
          <FiPhoneCall className="opacity-60" />
          <span>{formatPhoneNumber(details.phone)}</span>
        </div>
      )}
      {details.email && details.email !== "—" && (
        <div className="flex items-center gap-2">
          <FiUser className="opacity-60" />
          <span className="truncate">{details.email}</span>
        </div>
      )}
      {details.source && (
        <div className="flex items-center gap-2">
          <FiInfo className="opacity-60" />
          <span>From: {details.source}</span>
        </div>
      )}
    </div>
  );
}

export function useToasts() {
  const [notificationApi, contextHolder] = notification.useNotification();

  const push = useCallback(
    (t) => {
      const method =
        t.tone === "success" ? "success"
          : t.tone === "warning" ? "warning"
            : t.tone === "error" ? "error"
              : "info";

      notificationApi[method]({
        message: (
          <span>
            {t.title}
            {t.leadName && (
              <span className="ml-2 text-xs font-normal bg-black/10 px-2 py-0.5 rounded-full">
                {t.leadName}
              </span>
            )}
          </span>
        ),
        description: (
          <>
            {t.message && <div className="text-sm">{t.message}</div>}
            <LeadDescription details={t.leadDetails} />
          </>
        ),
        placement: "bottomRight",
        duration: (t.timeout ?? 10000) / 1000,
        btn: t.action ? (
          <Button
            type="link"
            size="small"
            onClick={() => t.action.onClick?.()}
          >
            {t.action.label}
          </Button>
        ) : undefined,
      });
    },
    [notificationApi]
  );

  return { push, contextHolder };
}
