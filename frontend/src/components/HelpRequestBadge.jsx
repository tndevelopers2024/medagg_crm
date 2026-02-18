import React, { useState } from "react";
import { Badge, Button, Drawer, List, Tag, Empty, Tooltip } from "antd";
import { FiUsers, FiCheck, FiX } from "react-icons/fi";

export default function HelpRequestBadge({ incoming = [], onRespond, loading }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendingCount = incoming.length;

  return (
    <>
      <Tooltip title="Help Requests">
        <Badge count={pendingCount} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            icon={<FiUsers size={18} />}
            onClick={() => setDrawerOpen(true)}
            style={{ color: pendingCount > 0 ? "#e91e63" : "#999" }}
          />
        </Badge>
      </Tooltip>

      <Drawer
        title={`Incoming Help Requests (${pendingCount})`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {pendingCount === 0 ? (
          <Empty description="No pending requests" />
        ) : (
          <List
            dataSource={incoming}
            loading={loading}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Button
                    key="accept"
                    type="primary"
                    size="small"
                    icon={<FiCheck />}
                    onClick={() => onRespond(item.id, "accept")}
                    style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
                  >
                    Accept
                  </Button>,
                  <Button
                    key="reject"
                    size="small"
                    danger
                    icon={<FiX />}
                    onClick={() => onRespond(item.id, "reject")}
                  >
                    Reject
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      {item.lead?.name || "Unknown Lead"}{" "}
                      <Tag color={item.type === "transfer" ? "orange" : "blue"} className="ml-1">
                        {item.type === "transfer" ? "Transfer" : "Help"}
                      </Tag>
                    </span>
                  }
                  description={
                    <div>
                      <div className="text-xs text-gray-500">
                        From: <strong>{item.fromCaller?.name || "Unknown"}</strong>
                      </div>
                      {item.reason && (
                        <div className="text-xs text-gray-400 mt-1 italic">
                          "{item.reason}"
                        </div>
                      )}
                      <div className="text-xs text-gray-300 mt-1">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : ""}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
