import React from "react";
import { Card, Tag, Skeleton } from "antd";
import { toneChip } from "../utils/helpers";
import { DynamicField } from "../../../../components/DynamicField";

const STATUS_TAG_COLORS = {
  new: "purple",
  hot: "red",
  "hot-ip": "green",
  prospective: "blue",
  recapture: "orange",
  dnp: "default",
  opd_booked: "green",
};

export default function LeadDetailsCard({
  combinedFields,
  leadData,
  fieldsLoading,
  status,
  onFieldChange,
  onAddOption,
  disabled,
}) {
  return (
    <Card
      className="lg:col-span-2"
      title={
        <div className="flex items-center gap-2">
          <span>Lead Details</span>
          {/* <Tag color={STATUS_TAG_COLORS[status] || STATUS_TAG_COLORS["new"]}>
            {status.toUpperCase()}
          </Tag> */}
        </div>
      }
    >
      {fieldsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton.Input active size="small" style={{ width: 80 }} />
              <Skeleton.Input active block />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combinedFields.map((field) => (
            <DynamicField
              key={field._id}
              field={field}
              value={leadData[field.fieldName]}
              onChange={onFieldChange}
              onAddOption={onAddOption}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
