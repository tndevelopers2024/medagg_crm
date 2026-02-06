import React from "react";
import { Tabs, Badge } from "antd";

export default function TabLayout({ activeTab, onTabChange, tabs }) {
  const items = tabs.map((tab) => ({
    key: tab.key,
    label: (
      <span className="inline-flex items-center gap-2">
        {tab.icon && <tab.icon className="w-4 h-4" />}
        {tab.label}
        {tab.count != null && tab.count > 0 && (
          <Badge count={tab.count} size="small" color="#7c3aed" />
        )}
      </span>
    ),
  }));

  return (
    <Tabs
      activeKey={activeTab}
      onChange={onTabChange}
      items={items}
    />
  );
}
