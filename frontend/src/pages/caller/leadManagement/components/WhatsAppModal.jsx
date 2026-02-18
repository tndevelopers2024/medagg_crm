import { useState, useEffect, useRef, useCallback } from "react";
import {
  FiMessageCircle,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiSave,
  FiChevronLeft,
  FiGlobe,
  FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { Modal, Input, Button, List, Tag, Checkbox, Empty } from "antd";
import {
  fetchWaTemplates,
  createWaTemplate,
  updateWaTemplate,
  deleteWaTemplate,
} from "../../../../utils/api";
import { useAuth } from "../../../../contexts/AuthContext";

// Replace {{field_name}} placeholders with actual lead data values
const interpolate = (text, leadData) => {
  if (!text) return "";
  return text.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    const key = fieldName.toLowerCase();
    const val = leadData[key] ?? leadData[fieldName];
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
  phoneNumber,
  leadName,
  leadData = {},
  combinedFields = [],
}) {
  const { user } = useAuth();
  const userRoleName = user?.role && typeof user.role === "object" ? (user.role.name || "").toLowerCase() : String(user?.role || "").toLowerCase();
  const isAdmin = ["admin", "superadmin", "owner"].includes(userRoleName);
  const textareaRef = useRef(null);

  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

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
    }
  }, [open, loadTemplates]);

  // Build available field names from combinedFields + leadData keys
  const availableFields = (() => {
    const fieldsFromConfig = combinedFields.map((f) => ({
      key: f.fieldName,
      label: f.displayLabel || f.fieldName,
    }));
    const configKeys = new Set(fieldsFromConfig.map((f) => f.key.toLowerCase()));

    // Add any leadData keys not already covered
    Object.keys(leadData).forEach((k) => {
      if (!configKeys.has(k.toLowerCase())) {
        fieldsFromConfig.push({
          key: k,
          label: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        });
      }
    });
    return fieldsFromConfig;
  })();

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

  const handleSend = () => {
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    const finalMessage = interpolate(message, leadData);

    let num = String(phoneNumber || "").replace(/[^\d+]/g, "");
    if (num.startsWith("0")) num = num.slice(1);
    if (!num.startsWith("+") && !num.startsWith("91") && num.length === 10) {
      num = "91" + num;
    }

    if (num.length < 10) {
      toast.error("No valid phone number found for this lead.");
      return;
    }

    const waUrl = `https://wa.me/${num}?text=${encodeURIComponent(finalMessage)}`;
    window.open(waUrl, "_blank");
    setMessage("");
    onClose();
  };

  const applyTemplate = (tpl) => {
    setMessage(tpl.body);
  };

  // ---- Template CRUD ----
  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormBody("");
    setFormGlobal(false);
    setView(VIEW_FORM);
  };

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

        {loading ? (
          <div className="text-xs text-gray-400 py-2">
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <Empty
            description="No templates yet. Create one to get started."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={templates}
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
        <label className="text-xs text-gray-600">Insert Field</label>
        <div className="flex flex-wrap gap-1.5">
          {availableFields.slice(0, 12).map((f) => (
            <Tag
              key={f.key}
              className="cursor-pointer hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
              onClick={() =>
                insertField(f.key, setMessage, message)
              }
            >
              {f.label}
            </Tag>
          ))}
          {availableFields.length > 12 && (
            <span className="text-xs text-gray-400 self-center">
              +{availableFields.length - 12} more
            </span>
          )}
        </div>
      </div>

      {/* Live preview */}
      {message && (
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Preview</label>
          <div className="rounded-xl border border-green-100 bg-green-50/50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
            {interpolate(message, leadData)}
          </div>
        </div>
      )}
    </Modal>
  );
}
