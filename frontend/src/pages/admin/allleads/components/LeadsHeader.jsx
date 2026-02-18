import React from "react";
import { Segmented, Button, Dropdown, Space } from "antd";
import { FiCheckCircle, FiList, FiBarChart2, FiDownload, FiEdit2 } from "react-icons/fi";
import FilterTemplateDropdown from "../../../../components/admin/FilterTemplateDropdown";
import ColumnChooser from "../../../../components/admin/leads/ColumnChooser";
import PermissionGate from "../../../../components/PermissionGate";

export default function LeadsHeader({
  viewMode,
  setViewMode,
  filterTemplates,
  applyTemplate,
  handleDeleteTemplate,
  handleSetDefault,
  handleEditTemplate,
  currentTemplateId,
  allColumns,
  visibleIds,
  toggleColumn,
  resetToDefaults,
  onSaveFilter,
  resetFilters,
  onExportCurrentPage,
  onExportAll,
  exporting,
  onBulkEdit,
}) {
  const exportMenuItems = [
    {
      key: "current",
      label: "Export Current Page",
      onClick: onExportCurrentPage,
      disabled: exporting,
    },
    {
      key: "all",
      label: "Export All Filtered Results",
      onClick: onExportAll,
      disabled: exporting,
    },
  ];

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your leads effectively</p>
      </div>
      <Space>
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: <span className="inline-flex items-center gap-1.5"><FiList className="w-4 h-4" /> List</span>, value: "list" },
            { label: <span className="inline-flex items-center gap-1.5"><FiBarChart2 className="w-4 h-4" /> Chart</span>, value: "chart" },
          ]}
        />

        <FilterTemplateDropdown
          templates={filterTemplates}
          onSelect={applyTemplate}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onSetDefault={handleSetDefault}
          currentTemplateId={currentTemplateId}
        />

        <ColumnChooser
          allColumns={allColumns}
          visibleIds={visibleIds}
          toggle={toggleColumn}
          resetToDefaults={resetToDefaults}
        />

        <PermissionGate permission="leads.all.bulkUpdate">
          {onBulkEdit && (
            <Button icon={<FiEdit2 />} onClick={onBulkEdit}>
              Bulk Edit
            </Button>
          )}
        </PermissionGate>

        <PermissionGate permission="leads.all.export">
          <Dropdown menu={{ items: exportMenuItems }} trigger={["click"]}>
            <Button icon={<FiDownload />} loading={exporting}>
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </Dropdown>
        </PermissionGate>

        <Button
          type="primary"
          icon={<FiCheckCircle />}
          onClick={onSaveFilter}
          style={{ backgroundColor: "#E9296A", borderColor: "#E9296A" }}
        >
          Save Filter
        </Button>

        <Button onClick={resetFilters}>
          Reset Filters
        </Button>
      </Space>
    </div>
  );
}
