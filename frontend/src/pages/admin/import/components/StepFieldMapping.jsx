import React from "react";
import {
  Select,
  Table,
  Button,
  Modal,
  Input,
  Typography,
  Tag,
  Tooltip,
  Space,
  message,
  Form,
} from "antd";
import {
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  fetchImportMappings,
  saveImportMapping,
  deleteImportMapping,
  fetchLeadFields,
  createLeadField,
} from "../../../../utils/api";

const { Text } = Typography;

// Core field options shown in the Map To dropdown
const CORE_FIELD_OPTIONS = [
  { label: "Full Name", value: "core|name" },
  { label: "Phone Number", value: "core|phone" },
  { label: "Email", value: "core|email" },
  { label: "Lead Status", value: "core|status" },
  { label: "Source", value: "core|source" },
  { label: "Notes", value: "core|notes" },
  { label: "Created Date", value: "core|createdTime" },
  { label: "Last Call Outcome", value: "core|lastCallOutcome" },
  { label: "Follow-Up Date", value: "core|followUpAt" },
  { label: "Meta Lead ID", value: "core|metaLeadId" },
  { label: "TelCRM Lead ID", value: "core|telcrmLeadId" },
  { label: "Hospital (OPD & IPD)", value: "core|hospital" },
  { label: "Rating", value: "core|rating" },
];

const SPECIAL_FIELD_OPTIONS = [
  { label: "Campaign", value: "campaign|" },
  { label: "Assigned Caller", value: "caller|" },
];

const OPD_FIELD_OPTIONS = [
  { label: "OPD Booked Date", value: "opBooking|booked_date" },
  { label: "OPD Status", value: "opBooking|status" },
  { label: "OPD Date", value: "opBooking|date" },
  { label: "OPD Sub Status", value: "opBooking|sub_status" },
  { label: "OPD Diagnostics Suggested", value: "opBooking|diagnostics" },
];

const IPD_FIELD_OPTIONS = [
  { label: "IPD Status", value: "ipBooking|status" },
  { label: "IPD Date", value: "ipBooking|date" },
];
// ── Helpers ────────────────────────────────────────────────────────────────────
function mappingToOption(mapping) {
  if (!mapping || mapping.targetType === "skip") return "skip|";
  if (mapping.targetType === "fieldData") return `fieldData|${mapping.targetField || ""}`;
  if (mapping.targetType === "campaign") return "campaign|";
  if (mapping.targetType === "caller") return "caller|";
  if (mapping.targetType === "opBooking") return `opBooking|${mapping.targetField || ""}`;
  if (mapping.targetType === "ipBooking") return `ipBooking|${mapping.targetField || ""}`;
  return `core|${mapping.targetField}`;
}

function optionToMapping(val) {
  if (!val || val === "skip|") return { targetType: "skip", targetField: "" };
  const idx = val.indexOf("|");
  const type = val.slice(0, idx);
  const field = val.slice(idx + 1);
  return { targetType: type, targetField: field };
}

function toFieldName(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function StepFieldMapping({ headers, sampleRows, mappings, onMappingsChange }) {
  const [savedTemplates, setSavedTemplates] = React.useState([]);
  const [saveModalOpen, setSaveModalOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [leadFields, setLeadFields] = React.useState([]);
  const [createModal, setCreateModal] = React.useState({ open: false, forHeader: null });
  const [createForm] = Form.useForm();
  const [creating, setCreating] = React.useState(false);

  // Keep a ref to mappings so effects can read current value without becoming stale
  const mappingsRef = React.useRef(mappings);
  mappingsRef.current = mappings;

  // Load lead fields + saved templates once
  React.useEffect(() => {
    fetchLeadFields({ active: true })
      .then((res) => setLeadFields(res?.data || []))
      .catch(() => { });
    fetchImportMappings()
      .then((res) => setSavedTemplates(res.data || []))
      .catch(() => { });
  }, []);

  // ── Initialize unmapped fields to "skip" — runs when a new file is loaded ──────────
  React.useEffect(() => {
    if (!headers?.length) return;
    const cur = mappingsRef.current;
    const updates = {};
    headers.forEach((h) => {
      if (cur[h] && cur[h].targetType !== "skip") return; // already mapped by user/template
      updates[h] = { targetType: "skip", targetField: "" };
    });
    if (Object.keys(updates).length > 0) {
      onMappingsChange({ ...cur, ...updates });
    }
  }, [headers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map-To select change ───────────────────────────────────────────────────
  const handleSelectChange = (header, optVal) => {
    onMappingsChange({ ...mappings, [header]: optionToMapping(optVal) });
  };

  // ── Custom field select (fieldData column) ─────────────────────────────────
  const handleCustomFieldSelect = (header, fieldName) => {
    onMappingsChange({
      ...mappings,
      [header]: { targetType: "fieldData", targetField: fieldName },
    });
  };

  // ── Create new field inline ────────────────────────────────────────────────
  const openCreateModal = (forHeader) => {
    createForm.setFieldsValue({
      displayLabel: forHeader,
      fieldName: toFieldName(forHeader),
    });
    setCreateModal({ open: true, forHeader });
  };

  const handleCreateField = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const res = await createLeadField({
        fieldName: values.fieldName,
        displayLabel: values.displayLabel,
        fieldType: "text",
      });
      const newField = res?.data;
      setLeadFields((prev) => [...prev, newField]);
      if (createModal.forHeader) {
        onMappingsChange({
          ...mappings,
          [createModal.forHeader]: { targetType: "fieldData", targetField: newField.fieldName },
        });
      }
      message.success(`Field "${values.displayLabel}" created and selected.`);
      setCreateModal({ open: false, forHeader: null });
      createForm.resetFields();
    } catch (err) {
      message.error("Failed to create field: " + (err?.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  // ── Template controls ──────────────────────────────────────────────────────
  const handleLoadTemplate = (templateId) => {
    const tpl = savedTemplates.find((t) => t._id === templateId);
    if (tpl) onMappingsChange(tpl.mappings || {});
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return message.error("Enter a template name.");
    try {
      await saveImportMapping({ name: templateName.trim(), mappings });
      message.success("Template saved.");
      setSaveModalOpen(false);
      setTemplateName("");
      const res = await fetchImportMappings();
      setSavedTemplates(res.data || []);
    } catch {
      message.error("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteImportMapping(id);
      setSavedTemplates((prev) => prev.filter((t) => t._id !== id));
      message.success("Template deleted.");
    } catch {
      message.error("Failed to delete.");
    }
  };

  // ── Build option groups for Map To select ──────────────────────────────────
  const customFieldOptions = React.useMemo(
    () => leadFields.map((f) => ({ label: f.displayLabel, value: `fieldData|${f.fieldName}` })),
    [leadFields]
  );

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: "CSV Column",
      dataIndex: "header",
      key: "header",
      width: 180,
      render: (h) => <Text strong className="text-sm">{h}</Text>,
    },
    {
      title: "Sample Values",
      dataIndex: "samples",
      key: "samples",
      width: 220,
      render: (samples) => (
        <div className="flex flex-wrap gap-1">
          {(samples || []).filter((s) => s !== "" && s != null).slice(0, 3).map((s, i) => (
            <Tag key={i} className="text-xs max-w-[120px] truncate" title={String(s)}>
              {String(s).slice(0, 30)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Map To",
      dataIndex: "header",
      key: "mapTo",
      width: 260,
      render: (header) => {
        const currentOptVal = mappingToOption(mappings[header]);
        return (
          <Select
            value={currentOptVal}
            onChange={(v) => handleSelectChange(header, v)}
            style={{ width: "100%" }}
            size="small"
            options={[
              { label: "── Skip this field ──", value: "skip|" },
              { label: "── Core Fields ──", options: CORE_FIELD_OPTIONS },
              { label: "── Special Fields ──", options: SPECIAL_FIELD_OPTIONS },
              { label: "── OPD Booking Fields ──", options: OPD_FIELD_OPTIONS },
              { label: "── IPD Booking Fields ──", options: IPD_FIELD_OPTIONS },
              {
                label: "── Custom Field (fieldData) ──",
                options: customFieldOptions.length > 0
                  ? customFieldOptions
                  : [{ label: "No fields yet — create one →", value: "fieldData|", disabled: true }],
              },
            ]}
          />
        );
      },
    },
    {
      title: "Custom Field",
      dataIndex: "header",
      key: "customName",
      width: 230,
      render: (header) => {
        const currentMapping = mappings[header];
        if (currentMapping?.targetType !== "fieldData") return null;

        return (
          <Select
            size="small"
            style={{ width: "100%" }}
            placeholder="Select or create field…"
            showSearch
            value={currentMapping.targetField || undefined}
            onChange={(v) => handleCustomFieldSelect(header, v)}
            filterOption={(input, opt) =>
              opt.label?.toLowerCase().includes(input.toLowerCase())
            }
            dropdownRender={(menu) => (
              <>
                {menu}
                <div className="border-t mt-1 pt-1 px-2 pb-1">
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openCreateModal(header)}
                    className="text-[#322554] font-medium w-full text-left p-0"
                  >
                    + Create new field
                  </Button>
                </div>
              </>
            )}
            options={leadFields.map((f) => ({ label: f.displayLabel, value: f.fieldName }))}
          />
        );
      },
    },
  ];

  const tableData = (headers || []).map((h) => ({
    key: h,
    header: h,
    samples: (sampleRows || []).map((r) => r[h]),
  }));

  return (
    <div className="space-y-4">
      {/* Template controls */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-gray-50 rounded-lg border">
        <Text className="text-sm font-medium text-gray-700">Mapping templates:</Text>
        <Select
          placeholder="Load saved template…"
          style={{ minWidth: 200 }}
          size="small"
          options={savedTemplates.map((t) => ({ label: t.name, value: t._id }))}
          onChange={handleLoadTemplate}
          allowClear
        />
        {savedTemplates.map((t) => (
          <Tooltip key={t._id} title={`Delete "${t.name}"`}>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTemplate(t._id)}
            />
          </Tooltip>
        ))}
        <Button size="small" icon={<SaveOutlined />} onClick={() => setSaveModalOpen(true)}>
          Save as template
        </Button>
      </div>

      {/* Mapping table */}
      <Table
        dataSource={tableData}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 900 }}
      />

      {/* Save template modal */}
      <Modal
        title="Save mapping template"
        open={saveModalOpen}
        onOk={handleSaveTemplate}
        onCancel={() => { setSaveModalOpen(false); setTemplateName(""); }}
        okText="Save"
      >
        <Input
          placeholder="Template name (e.g. TelCRM Export 2024)"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onPressEnter={handleSaveTemplate}
        />
      </Modal>

      {/* Create new field modal */}
      <Modal
        title="Create new field"
        open={createModal.open}
        onOk={handleCreateField}
        onCancel={() => { setCreateModal({ open: false, forHeader: null }); createForm.resetFields(); }}
        okText="Create & use"
        confirmLoading={creating}
      >
        <Form form={createForm} layout="vertical" className="mt-2">
          <Form.Item
            label="Display Label"
            name="displayLabel"
            rules={[{ required: true, message: "Enter a display label" }]}
            help="How this field appears in the UI (e.g. 'Department')"
          >
            <Input
              placeholder="e.g. Department"
              onChange={(e) =>
                createForm.setFieldValue("fieldName", toFieldName(e.target.value))
              }
            />
          </Form.Item>
          <Form.Item
            label="Field Name (internal key)"
            name="fieldName"
            rules={[
              { required: true, message: "Enter a field name" },
              { pattern: /^[a-z0-9_]+$/, message: "Only lowercase letters, numbers, underscores" },
            ]}
            help="Stored in fieldData with this key (e.g. 'department')"
          >
            <Input placeholder="e.g. department" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
