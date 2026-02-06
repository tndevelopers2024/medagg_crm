import React from "react";
import { Select, DatePicker, Space } from "antd";
import dayjs from "dayjs";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

export default function DateRangeFilter({
  datePreset,
  setDatePreset,
  customRange,
  setCustomRange,
}) {
  const rangeValue =
    customRange.from && customRange.to
      ? [dayjs(customRange.from), dayjs(customRange.to)]
      : null;

  return (
    <Space size="small">
      <Select
        value={datePreset}
        onChange={setDatePreset}
        options={PRESETS}
        style={{ minWidth: 160 }}
      />
      {datePreset === "custom" && (
        <DatePicker.RangePicker
          value={rangeValue}
          onChange={(dates) => {
            if (dates) {
              setCustomRange({
                from: dates[0].format("YYYY-MM-DD"),
                to: dates[1].format("YYYY-MM-DD"),
              });
            } else {
              setCustomRange({ from: "", to: "" });
            }
          }}
          allowClear
        />
      )}
    </Space>
  );
}
