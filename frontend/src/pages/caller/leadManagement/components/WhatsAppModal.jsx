import { useState, useEffect, useRef, useCallback } from "react";
import { FiMessageCircle, FiPlus, FiEdit3, FiTrash2, FiSave, FiChevronLeft, FiGlobe, FiUser, FiSearch, FiUpload, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { Modal, Input, Button, List, Tag, Checkbox, Empty, Tooltip, Popover } from "antd";
import {
  fetchWaTemplates,
  createWaTemplate,
  updateWaTemplate,
  deleteWaTemplate,
  bulkCreateWaTemplates,
  logWhatsAppSend,
} from "../../../../utils/api";
import { useAuth } from "../../../../contexts/AuthContext";

// Replace {{field_name}} or {{field name}} placeholders with actual lead data values
const interpolate = (text, data) => {
  if (!text) return "";
  // Allow word chars + spaces inside {{ }}
  return text.replace(/\{\{([\w ]+)\}\}/g, (match, fieldName) => {
    const raw = fieldName.trim();
    const lower = raw.toLowerCase();
    const underscored = raw.toLowerCase().replace(/\s+/g, "_");
    // Try: exact, lowercased, underscore-normalised
    const val = data[raw] ?? data[lower] ?? data[underscored] ?? data[fieldName];
    if (val === undefined || val === null || val === "") return match;
    return String(val);
  });
};

// Extract all {{field}} tokens from text
const extractFields = (text) => {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
};

// ---- Sub-views ----
const VIEW_MAIN = "main";
const VIEW_FORM = "form"; // create or edit

export default function WhatsAppModal({
  open,
  onClose,
  onSuccess,
  phoneNumber,
  leadName,
  leadData = {},
  combinedFields = [],
}) {
  const { user } = useAuth();
  const userRoleName = user?.role && typeof user.role === "object" ? (user.role.name || "").toLowerCase() : String(user?.role || "").toLowerCase();
  const isAdmin = ["admin", "superadmin", "owner"].includes(userRoleName);
  const textareaRef = useRef(null);
  const uploadRef = useRef(null);

  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  // Track which template was applied (for logging)
  const [activeTemplateName, setActiveTemplateName] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [fieldPickerSearch, setFieldPickerSearch] = useState("");
  const [pinnedCallerKeys, setPinnedCallerKeys] = useState(new Set());

  // Template form state
  const [view, setView] = useState(VIEW_MAIN);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formGlobal, setFormGlobal] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWaTemplates();
      if (res.success) setTemplates(res.data || []);
    } catch (e) {
      console.error("fetchWaTemplates error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setView(VIEW_MAIN);
      setShowAllFields(false);
      setFieldPickerOpen(false);
      setFieldPickerSearch("");
      setPinnedCallerKeys(new Set());
    }
  }, [open, loadTemplates]);

  // user object is { success, data: { name, email, phone } } from getMe()
  const userData = user?.data || user || {};
  const callerName = userData.name || "";

  // Caller / user info fields — resolved from the logged-in user
  const callerFields = [
    { key: "CALLER_NAME",  label: "Caller Name",  value: callerName },
    { key: "CALLER_EMAIL", label: "Caller Email", value: userData.email || "" },
    { key: "CALLER_PHONE", label: "Caller Phone", value: userData.phone || "" },
  ];
  const interpolationContext = {
    ...leadData,
    ...Object.fromEntries(callerFields.map((f) => [f.key, f.value])),
    "MY NAME": callerName,
    "MY_NAME": callerName,
    "my name": callerName,
    "my_name": callerName,
  };

  // Build available field names from combinedFields + leadData keys
  const leadFields = (() => {
    const fields = combinedFields.map((f) => ({
      key: f.fieldName,
      label: f.displayLabel || f.fieldName,
    }));
    const configKeys = new Set(fields.map((f) => f.key.toLowerCase()));
    Object.keys(leadData).forEach((k) => {
      if (!configKeys.has(k.toLowerCase())) {
        fields.push({
          key: k,
          label: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        });
      }
    });
    return fields;
  })();

  // What's shown as tags in Insert Field = lead fields + pinned caller fields
  const availableFields = [
    ...leadFields,
    ...callerFields
      .filter((f) => pinnedCallerKeys.has(f.key))
      .map((f) => ({ key: f.key, label: f.label, isCaller: true })),
  ];

  const getTextAreaEl = () => {
    const ref = textareaRef.current;
    if (!ref) return null;
    // Ant Design TextArea wraps a native textarea
    return ref?.resizableTextArea?.textArea || ref;
  };

  const insertField = (fieldKey, setter, currentVal) => {
    const tag = `{{${fieldKey}}}`;
    const el = getTextAreaEl();
    if (el) {
      const start = el.selectionStart ?? currentVal.length;
      const end = el.selectionEnd ?? start;
      const next = currentVal.slice(0, start) + tag + currentVal.slice(end);
      setter(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      setter(currentVal + tag);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const finalMessage = interpolate(message, interpolationContext);

    let num = String(phoneNumber || "").replace(/[^\d+]/g, "");
    if (num.startsWith("0")) num = num.slice(1);
    if (!num.startsWith("+") && !num.startsWith("91") && num.length === 10) {
      num = "91" + num;
    }

    if (num.length < 10) {
      toast.error("No valid phone number found for this lead.");
      return;
    }

    const leadId = leadData._id || leadData.id;
    if (leadId) {
      try {
        await logWhatsAppSend({ leadId, message: finalMessage, templateName: activeTemplateName || undefined });
        if (onSuccess) onSuccess();
      } catch (err) {
        console.warn("Failed to log WhatsApp activity:", err);
      }
    }

    const waUrl = `https://wa.me/${num}?text=${encodeURIComponent(finalMessage)}`;
    window.open(waUrl, "_blank");

    setMessage("");
    setActiveTemplateName("");
    onClose();
  };

  const applyTemplate = (tpl) => {
    setMessage(tpl.body);
    setActiveTemplateName(tpl.name);
  };

  // ---- Template file upload (JSON or CSV) ----
  const parseUploadedFile = (text, filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'json') {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        throw new Error("Invalid JSON file");
      }
    }
    // CSV: name,body[,isGlobal]
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    return lines.slice(1).map(line => {
      const fields = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
        cur += ch;
      }
      fields.push(cur);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (fields[i] || '').trim(); });
      return obj;
    });
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseUploadedFile(text, file.name);
      const valid = parsed.filter(t => t.name && t.body);
      if (valid.length === 0) throw new Error("No valid templates found (name and body required)");
      const res = await bulkCreateWaTemplates(valid);
      toast.success(`Uploaded ${res.count} template${res.count !== 1 ? 's' : ''}`);
      await loadTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---- Template CRUD ----
  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormBody("");
    setFormGlobal(false);
    setView(VIEW_FORM);
  };

  const filteredTemplates = templates.filter((tpl) =>
    tpl.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditForm = (tpl) => {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormBody(tpl.body);
    setFormGlobal(tpl.isGlobal || false);
    setView(VIEW_FORM);
  };

  const handleFormSave = async () => {
    if (!formName.trim() || !formBody.trim()) {
      toast.error("Name and body are required.");
      return;
    }
    setFormSaving(true);
    try {
      if (editingTemplate) {
        await updateWaTemplate(editingTemplate._id, {
          name: formName,
          body: formBody,
          isGlobal: formGlobal,
        });
        toast.success("Template updated");
      } else {
        await createWaTemplate({
          name: formName,
          body: formBody,
          isGlobal: formGlobal,
        });
        toast.success("Template created");
      }
      await loadTemplates();
      setView(VIEW_MAIN);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save template");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      await deleteWaTemplate(tpl._id);
      toast.success("Template deleted");
      await loadTemplates();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to delete template");
    }
  };

  const canEdit = (tpl) => {
    if (tpl.userId === user?._id || tpl.userId === user?.id) return true;
    if (isAdmin && tpl.isGlobal) return true;
    return false;
  };

  // ---- Template Form View ----
  if (view === VIEW_FORM) {
    return (
      <Modal
        open={open}
        onCancel={() => setView(VIEW_MAIN)}
        title={
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<FiChevronLeft />}
              size="small"
              onClick={() => setView(VIEW_MAIN)}
            />
            {editingTemplate ? "Edit Template" : "Create Template"}
          </div>
        }
        footer={[
          <Button key="cancel" onClick={() => setView(VIEW_MAIN)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<FiSave />}
            loading={formSaving}
            onClick={handleFormSave}
            style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
          >
            {formSaving ? "Saving..." : "Save Template"}
          </Button>,
        ]}
        destroyOnHidden
        width={520}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Template Name</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Appointment Reminder"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Message Body</label>
              <span className="text-xs text-gray-400">
                Use {"{{field_name}}"} to insert lead data
              </span>
            </div>
            <Input.TextArea
              ref={textareaRef}
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={5}
              placeholder={`Hi {{full_name}}, this is a reminder for your appointment...`}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {/* Field insert buttons */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Insert Field</label>
            <div className="flex flex-wrap gap-1.5">
              {availableFields.map((f) => (
                <Tag
                  key={f.key}
                  className="cursor-pointer hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
                  onClick={() =>
                    insertField(f.key, setFormBody, formBody)
                  }
                >
                  {f.label}
                </Tag>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formBody && (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Preview</label>
              <div className="rounded-xl border border-green-100 bg-green-50/50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                {interpolate(formBody, leadData)}
              </div>
            </div>
          )}

          {isAdmin && (
            <Checkbox
              checked={formGlobal}
              onChange={(e) => setFormGlobal(e.target.checked)}
            >
              Make available to all users (Global template)
            </Checkbox>
          )}
        </div>
      </Modal>
    );
  }

  // ---- Main View ----
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <FiMessageCircle className="text-green-600 w-5 h-5" />
          <span>Send WhatsApp Message</span>
        </div>
      }
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setMessage("");
            onClose();
          }}
        >
          Cancel
        </Button>,
        <Button
          key="send"
          type="primary"
          icon={<FiMessageCircle />}
          onClick={handleSend}
          style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
        >
          Send WhatsApp
        </Button>,
      ]}
      destroyOnHidden
      width={520}
    >
      <p className="text-sm text-gray-600 mb-4">
        To <span className="font-medium">{leadName || "Lead"}</span>
        {phoneNumber && (
          <span className="text-gray-400 ml-1">({phoneNumber})</span>
        )}
      </p>

      {/* Templates section */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">
            Templates
          </label>
          <div className="flex items-center gap-1">
            <Tooltip title="Upload templates from JSON or CSV file">
              <Button
                type="text"
                size="small"
                icon={<FiUpload className="w-3.5 h-3.5" />}
                loading={uploading}
                onClick={() => uploadRef.current?.click()}
                style={{ color: "#6b7280" }}
              >
                Upload
              </Button>
            </Tooltip>
            <input
              ref={uploadRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleUploadFile}
            />
            <Button
              type="link"
              size="small"
              icon={<FiPlus className="w-3.5 h-3.5" />}
              onClick={openCreateForm}
              style={{ color: "#15803d" }}
            >
              New Template
            </Button>
          </div>
        </div>

        <Input
          placeholder="Search templates..."
          prefix={<FiSearch className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className="mb-2"
        />

        {loading ? (
          <div className="text-xs text-gray-400 py-2">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Empty
            description={searchTerm ? "No templates match your search." : "No templates yet. Create one to get started."}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={filteredTemplates}
            style={{ maxHeight: 160, overflowY: "auto" }}
            renderItem={(tpl) => {
              const fields = extractFields(tpl.body);
              return (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => applyTemplate(tpl)}
                  actions={
                    canEdit(tpl)
                      ? [
                        <Button
                          key="edit"
                          type="text"
                          size="small"
                          icon={<FiEdit3 className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(tpl);
                          }}
                        />,
                        <Button
                          key="delete"
                          type="text"
                          danger
                          size="small"
                          icon={<FiTrash2 className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl);
                          }}
                        />,
                      ]
                      : undefined
                  }
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {tpl.name}
                        </span>
                        {tpl.isGlobal ? (
                          <FiGlobe
                            className="w-3 h-3 text-blue-500 flex-shrink-0"
                            title="Global template"
                          />
                        ) : (
                          <FiUser
                            className="w-3 h-3 text-gray-400 flex-shrink-0"
                            title="Personal template"
                          />
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <p className="text-xs text-gray-500 truncate">
                          {tpl.body.length > 80
                            ? tpl.body.slice(0, 80) + "..."
                            : tpl.body}
                        </p>
                        {fields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {fields.map((f) => (
                              <Tag
                                key={f}
                                color="purple"
                                style={{ fontSize: 10 }}
                              >
                                {f}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Message input */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">Message</label>
          <span className="text-xs text-gray-400">
            {"{{field}}"} will be replaced with lead data
          </span>
        </div>
        <Input.TextArea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your message or select a template above..."
          style={{ fontFamily: "monospace" }}
        />
      </div>

      {/* Insert field buttons */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600">Insert Field</label>
          <Popover
            open={fieldPickerOpen}
            onOpenChange={setFieldPickerOpen}
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ width: 260 }}>
                <Input
                  size="small"
                  prefix={<FiSearch className="text-gray-400 w-3 h-3" />}
                  placeholder="Search fields..."
                  value={fieldPickerSearch}
                  onChange={(e) => setFieldPickerSearch(e.target.value)}
                  className="mb-2"
                  allowClear
                  autoFocus
                />
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {/* Lead Info group */}
                  {(() => {
                    const filtered = leadFields.filter((f) =>
                      f.label.toLowerCase().includes(fieldPickerSearch.toLowerCase()) ||
                      f.key.toLowerCase().includes(fieldPickerSearch.toLowerCase())
                    );
                    if (!filtered.length) return null;
                    return (
                      <>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Lead Info</p>
                        {filtered.map((f) => (
                          <div
                            key={f.key}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-violet-50 cursor-pointer group"
                            onClick={() => {
                              insertField(f.key, setMessage, message);
                              setFieldPickerOpen(false);
                              setFieldPickerSearch("");
                            }}
                          >
                            <span className="text-sm text-gray-700">{f.label}</span>
                            <code className="text-[10px] text-violet-500 opacity-0 group-hover:opacity-100">{`{{${f.key}}}`}</code>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {/* Caller / User Info group */}
                  {(() => {
                    const filtered = callerFields.filter((f) =>
                      f.label.toLowerCase().includes(fieldPickerSearch.toLowerCase()) ||
                      f.key.toLowerCase().includes(fieldPickerSearch.toLowerCase())
                    );
                    if (!filtered.length) return null;
                    return (
                      <>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1 mt-2">Caller Info</p>
                        {filtered.map((f) => (
                          <div
                            key={f.key}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-blue-50 cursor-pointer group"
                            onClick={() => {
                              setPinnedCallerKeys((prev) => new Set([...prev, f.key]));
                              insertField(f.key, setMessage, message);
                              setFieldPickerOpen(false);
                              setFieldPickerSearch("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{f.label}</span>
                              {f.value && (
                                <span className="text-[10px] text-gray-400">{f.value}</span>
                              )}
                            </div>
                            <code className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100">{`{{${f.key}}}`}</code>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {/* Empty state */}
                  {fieldPickerSearch &&
                    !leadFields.some((f) => f.label.toLowerCase().includes(fieldPickerSearch.toLowerCase()) || f.key.toLowerCase().includes(fieldPickerSearch.toLowerCase())) &&
                    !callerFields.some((f) => f.label.toLowerCase().includes(fieldPickerSearch.toLowerCase()) || f.key.toLowerCase().includes(fieldPickerSearch.toLowerCase())) && (
                      <p className="text-xs text-gray-400 text-center py-3">No fields found</p>
                    )}
                </div>
              </div>
            }
          >
            <Button
              type="link"
              size="small"
              icon={<FiPlus className="w-3 h-3" />}
              style={{ color: "#7c3aed", padding: 0, height: "auto" }}
            >
              Select Field
            </Button>
          </Popover>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(showAllFields ? availableFields : availableFields.slice(0, 12)).map((f) => (
            <Tag
              key={f.key}
              className="cursor-pointer hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
              color={f.isCaller ? "blue" : undefined}
              onClick={() => insertField(f.key, setMessage, message)}
            >
              {f.label}
              {f.isCaller && (
                <FiX
                  className="inline ml-1 w-2.5 h-2.5 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedCallerKeys((prev) => {
                      const next = new Set(prev);
                      next.delete(f.key);
                      return next;
                    });
                  }}
                />
              )}
            </Tag>
          ))}
          {availableFields.length > 12 && (
            <Tag
              className="cursor-pointer border-dashed border-gray-300 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
              onClick={() => setShowAllFields(p => !p)}
            >
              {showAllFields ? "Show less" : `+${availableFields.length - 12} more`}
            </Tag>
          )}
        </div>
      </div>

      {/* Live preview */}
      {message && (
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Preview</label>
          <div className="rounded-xl border border-green-100 bg-green-50/50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
            {interpolate(message, interpolationContext)}
          </div>
        </div>
      )}
    </Modal>
  );
}
