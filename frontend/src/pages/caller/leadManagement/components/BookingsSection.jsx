import React from "react";
import {
  FiPlusCircle,
  FiCheckCircle,
  FiTrash2,
  FiEdit2,
  FiCopy,
} from "react-icons/fi";
import { Card, Tag, Button, Badge, Empty, DatePicker, TimePicker, Spin } from "antd";
import toast from "react-hot-toast";
import { fmtDate, readField } from "../utils/helpers";
import { Input, Select, Textarea } from "./FormControls";
import dayjs from "dayjs";

const statusBadge = (s) => {
  const map = {
    done: "green",
    pending: "orange",
    booked: "purple",
    cancelled: "red",
  };
  return map[s] || "default";
};

function BookingCard({ b, type, onDone, onRemove, onEdit, lead, user }) {
  const bid = String(b.id || b._id);

  // Helper to get value from fieldData
  const getVal = (key) => readField(b.fieldData || [], [key]);

  // Core fields for header
  // Try to find them in top-level or standard keys in fieldData
  const date = b.date || getVal("date") || getVal("appointment_date") || getVal("admission_date");
  const time = b.time || getVal("time") || getVal("appointment_time") || getVal("admission_time");
  const hospital = b.hospital || getVal("hospital") || getVal("hospital_name");

  const borderColor =
    b.status === "done"
      ? "border-l-emerald-400"
      : b.status === "pending"
        ? "border-l-amber-400"
        : type === "OP"
          ? "border-l-violet-400"
          : type === "IP"
            ? "border-l-indigo-400"
            : "border-l-pink-400";

  // Filter out fields we already showed in header or are internal
  const HIDDEN_FIELDS = ["date", "time", "hospital", "hospital_name", "status", "booked", "appointment_date", "appointment_time", "admission_date", "admission_time"];

  const displayFields = (b.fieldData || []).filter(
    (f) => f.value && !HIDDEN_FIELDS.includes(f.name?.toLowerCase())
  );

  // Also append payment/doctor if they are top-level but not in fieldData (legacy support)
  if (b.doctor && !displayFields.find(f => f.name === 'doctor')) {
    displayFields.push({ name: 'doctor', value: b.doctor, label: 'Doctor' });
  }
  if (b.payment && !displayFields.find(f => f.name === 'payment')) {
    displayFields.push({ name: 'payment', value: b.payment, label: 'Payment' });
  }

  const handleCopy = () => {
    // Construct the text based on template
    // Patient Name: from lead data
    // Hospital, Doctor, Phone, etc.
    const patientName = lead?.full_name || lead?.name || "";
    const phone = lead?.phone_number || lead?.phone || lead?.alt_phone || "";
    const callerName = user?.name || "Medagg Support";

    // Field values
    const f_hospital = hospital || "N/A";
    const f_doctor = b.doctor || getVal("doctor") || "N/A";
    const f_date = date ? fmtDate(date) : "N/A";
    const f_time = time || "N/A";

    // "Case" field: for IP it's usually Case Type, for OP it might be Surgery or Complaint
    const f_case = getVal("case") || getVal("case_type") || getVal("surgery") || getVal("procedure") || getVal("problem") || getVal("complaint") || b.surgery || b.caseType || "N/A";

    // Notes/Remarks/Short Case Note
    const f_notes = getVal("notes") || getVal("remarks") || getVal("short_case_note") || getVal("short_note") || getVal("case_report") || getVal("description") || b.notes || b.remarks || "N/A";
    const f_remarks = f_notes; // Alias for user's previous manual edit

    let template = "";

    if (type === "IP") {
      template = `Greetings, from Medagg Healthcare!

New Admission:

Patient Name: ${patientName}
Hospital : ${f_hospital}
Doctor: Dr. ${f_doctor}
Ph No: ${phone}
Case: ${f_case}
Admission date: ${f_date}
Admission time: ${f_time}

Kindly confirm the Admission
${f_remarks}

Thank you!
Regards
${callerName}`;
    } else if (type === "DIAGNOSTIC") {
      template = `Greetings, from Medagg Healthcare!

New Diagnostic Booking:

Patient Name: ${patientName}
Center/Hospital: ${f_hospital}
Ph No: ${phone}
Test Details: ${f_case}
Date: ${f_date}
Time: ${f_time}

Kindly confirm the booking
${f_remarks}

Thank you!
Regards
${callerName}`;
    } else {
      template = `Greetings, from Medagg Healthcare!

New Consultation :

Patient Name: ${patientName}
Hospital : ${f_hospital}
Doctor: ${f_doctor}
Ph no: ${phone}
Case: ${f_case}
Appointment date: ${f_date}
Appointment time: ${f_time}

Short Case Note ;
${f_remarks}

Kindly confirm the appointment please.

Thank you!
Regards
${callerName}`;
    }

    navigator.clipboard.writeText(template).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  return (
    <Card
      size="small"
      className={`border-l-4 ${borderColor}`}
      styles={{ body: { padding: 12 } }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-medium text-gray-900 text-sm">
              {date ? fmtDate(date) : "\u2014"} {time ? `\u2022 ${time}` : ""}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {hospital || (
                <span className="italic text-gray-400">No hospital specified</span>
              )}
            </div>
          </div>
          <Tag color={statusBadge(b.status)}>
            {b.status || "pending"}
          </Tag>
        </div>

        {/* Dynamic Fields Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 pt-2 border-t border-gray-50 mt-2">
          {displayFields.map((f, i) => (
            <div key={i} className={f.name === 'remarks' ? 'col-span-2' : ''}>
              <span className="font-medium text-gray-500 mr-1">
                {f.label || f.name?.charAt(0).toUpperCase() + f.name?.slice(1)}:
              </span>
              <span className="text-gray-900">{f.value}</span>
            </div>
          ))}
          {displayFields.length === 0 && (
            <div className="col-span-2 text-gray-400 italic">No additional details</div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
          <Button
            size="small"
            icon={<FiCopy />}
            onClick={() => {
              handleCopy();
              // Optional: Toast success
            }}
            title="Copy Booking Details"
          >
            Copy
          </Button>
          <Button
            size="small"
            icon={<FiEdit2 />}
            onClick={() => onEdit(b)}
            type="default"
          >
            Edit
          </Button>
          {b.status !== "done" && (
            <Button
              size="small"
              icon={<FiCheckCircle />}
              onClick={() => onDone(bid)}
              style={{
                borderColor: "#6ee7b7",
                backgroundColor: "#ecfdf5",
                color: "#047857",
              }}
            >
              Done
            </Button>
          )}
          <Button
            size="small"
            icon={<FiTrash2 />}
            onClick={() => onRemove(bid)}
            danger
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

const DynamicForm = ({ fields, state, onChange, saving, isEditing, onSubmit, onCancel, onAddOption }) => {
  // Sort fields by order if available, or just use index
  const sortedFields = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-4">
        {isEditing ? "Edit Booking" : "Add New Booking"}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Always show Status at the top or bottom? Let's treat it as a special field or let it be generic if configured. 
            Usually Status is managed separately by the UI logic (pending -> done). 
            But 'Booked' vs 'Pending' is input. 
            Let's assume Status IS one of the fields or we add it manually if missing.
        */}

        {sortedFields.map((field) => {
          const type = (field.type || "").toLowerCase();
          const key = field.fieldName || field.key;
          const label = field.label || field.name;
          const val = state[key];

          if (type === "date") {
            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  {label} {field.isRequired && <span className="text-red-500">*</span>}
                </label>
                <DatePicker
                  value={val ? dayjs(val) : null}
                  onChange={(d) => onChange(key, d ? d.format("YYYY-MM-DD") : "")}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder={`Select ${label.toLowerCase()}`}
                />
              </div>
            );
          }

          if (type === "time") {
            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  {label} {field.isRequired && <span className="text-red-500">*</span>}
                </label>
                <TimePicker
                  value={val ? dayjs(val, "HH:mm") : null}
                  onChange={(t) => onChange(key, t ? t.format("HH:mm") : "")}
                  className="w-full"
                  format="HH:mm"
                  placeholder={`Select ${label.toLowerCase()}`}
                />
              </div>
            );
          }

          if (type === "dropdown" || type === "select") {
            const opts = Array.isArray(field.options)
              ? field.options.map(o => (typeof o === 'string' ? { label: o, value: o } : o))
              : [];
            return (
              <Select
                key={key}
                label={label}
                required={field.isRequired}
                value={val}
                onChange={(e) => onChange(key, e.target.value)}
                options={opts}
                onAddOption={onAddOption ? (val) => onAddOption(key, val) : null}
              />
            );
          }

          if (type === "textarea") {
            return (
              <div key={key} className="md:col-span-2">
                <Textarea
                  label={label}
                  required={field.isRequired}
                  value={val || ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              </div>
            );
          }

          return (
            <Input
              key={key}
              label={label}
              required={field.isRequired}
              type={field.type === "number" ? "number" : "text"}
              value={val || ""}
              onChange={(e) => onChange(key, e.target.value)}
            />
          );
        })}

        {/* Ensure Status is available if not in fields */}
        {!sortedFields.find(f => f.fieldName === 'status') && (
          <Select
            label="Status"
            value={state.status || 'pending'}
            onChange={(e) => onChange('status', e.target.value)}
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Booked', value: 'booked' },
              { label: 'Done', value: 'done' },
              { label: 'Cancelled', value: 'cancelled' }
            ]}
          />
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button
          type="primary"
          icon={<FiPlusCircle />}
          onClick={onSubmit}
          loading={saving}
        >
          {saving
            ? isEditing
              ? "Updating..."
              : "Adding..."
            : isEditing
              ? "Update"
              : "Add"}
        </Button>
        <Button
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default function BookingsSection({
  opBookings,
  op,
  setOp,
  showOpForm,
  setShowOpForm,
  onAddOp,
  onRemoveOp,
  onDoneOp,
  editingOpId,
  setEditingOpId,
  onEditOp,
  onUpdateOp,

  ipBookings,
  ip,
  setIp,
  showIpForm,
  setShowIpForm,
  onAddIp,
  onRemoveIp,
  onDoneIp,
  editingIpId,
  setEditingIpId,
  onEditIp,
  onUpdateIp,

  bookingSaving,
  opFields = [],
  ipFields = [],
  diagnosticBookings,
  diagnostic,
  setDiagnostic,
  showDiagnosticForm,
  setShowDiagnosticForm,
  onAddDiagnostic,
  onRemoveDiagnostic,
  onDoneDiagnostic,
  editingDiagnosticId,
  setEditingDiagnosticId,
  onEditDiagnostic,
  onUpdateDiagnostic,
  diagnosticFields = [],
  onAddDiagnosticOption,
  onAddOpOption,
  onAddIpOption,
  fieldsLoading = false,
  lead,
  user,
}) {

  // Generic handler for form changes
  const handleOpChange = (key, val) => setOp(prev => ({ ...prev, [key]: val }));
  const handleIpChange = (key, val) => setIp(prev => ({ ...prev, [key]: val }));
  const handleDiagnosticChange = (key, val) => setDiagnostic(prev => ({ ...prev, [key]: val }));

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* OP Bookings */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>OP Bookings</span>
            {opBookings.length > 0 && (
              <Badge count={opBookings.length} size="small" color="#7c3aed" />
            )}
          </div>
        }
        extra={
          !showOpForm && (
            <Button
              type="primary"
              icon={<FiPlusCircle />}
              onClick={() => setShowOpForm(true)}
            >
              Add OP Booking
            </Button>
          )
        }
      >
        {showOpForm && (
          fieldsLoading ? <div className="p-4 text-center"><Spin /> Loading fields...</div> :
            <DynamicForm
              fields={opFields}
              state={op}
              onChange={handleOpChange}
              saving={bookingSaving}
              isEditing={!!editingOpId}
              onSubmit={editingOpId ? onUpdateOp : onAddOp}
              onCancel={() => {
                setShowOpForm(false);
                setOp({ status: "pending" });
                setEditingOpId(null);
              }}
              onAddOption={onAddOpOption}
            />
        )}

        {opBookings.length ? (
          <div className="space-y-3">
            {opBookings.map((b) => (
              <BookingCard
                key={String(b.id || b._id)}
                b={b}
                type="OP"
                onDone={onDoneOp}
                onRemove={onRemoveOp}
                onEdit={onEditOp}
                lead={lead}
                user={user}
              />
            ))}
          </div>
        ) : (
          <Empty description="No OP bookings yet." />
        )}
      </Card>

      {/* IP Bookings */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>IP Bookings</span>
            {ipBookings.length > 0 && (
              <Badge count={ipBookings.length} size="small" color="#6366f1" />
            )}
          </div>
        }
        extra={
          !showIpForm && (
            <Button
              type="primary"
              icon={<FiPlusCircle />}
              onClick={() => setShowIpForm(true)}
            >
              Add IP Booking
            </Button>
          )
        }
      >
        {showIpForm && (
          fieldsLoading ? <div className="p-4 text-center"><Spin /> Loading fields...</div> :
            <DynamicForm
              fields={ipFields}
              state={ip}
              onChange={handleIpChange}
              saving={bookingSaving}
              isEditing={!!editingIpId}
              onSubmit={editingIpId ? onUpdateIp : onAddIp}
              onCancel={() => {
                setShowIpForm(false);
                setIp({ status: "pending" });
                setEditingIpId(null);
              }}
              onAddOption={onAddIpOption}
            />
        )}

        {ipBookings.length ? (
          <div className="space-y-3">
            {ipBookings.map((b) => (
              <BookingCard
                key={String(b.id || b._id)}
                b={b}
                type="IP"
                onDone={onDoneIp}
                onRemove={onRemoveIp}
                onEdit={onEditIp}
                lead={lead}
                user={user}
              />
            ))}
          </div>
        ) : (
          <Empty description="No IP bookings yet." />
        )}
      </Card>

      {/* Diagnostic Bookings */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>Diagnostic Bookings</span>
            {diagnosticBookings.length > 0 && (
              <Badge count={diagnosticBookings.length} size="small" color="#ec4899" />
            )}
          </div>
        }
        extra={
          !showDiagnosticForm && (
            <Button
              type="primary"
              icon={<FiPlusCircle />}
              onClick={() => setShowDiagnosticForm(true)}
            >
              Add Diagnostic Booking
            </Button>
          )
        }
      >
        {showDiagnosticForm && (
          fieldsLoading ? <div className="p-4 text-center"><Spin /> Loading fields...</div> :
            <DynamicForm
              fields={diagnosticFields}
              state={diagnostic}
              onChange={handleDiagnosticChange}
              saving={bookingSaving}
              isEditing={!!editingDiagnosticId}
              onSubmit={editingDiagnosticId ? onUpdateDiagnostic : onAddDiagnostic}
              onCancel={() => {
                setShowDiagnosticForm(false);
                setDiagnostic({ status: "pending" });
                setEditingDiagnosticId(null);
              }}
              onAddOption={onAddDiagnosticOption}
            />
        )}

        {diagnosticBookings.length ? (
          <div className="space-y-3">
            {diagnosticBookings.map((b) => (
              <BookingCard
                key={String(b.id || b._id)}
                b={b}
                type="DIAGNOSTIC"
                onDone={onDoneDiagnostic}
                onRemove={onRemoveDiagnostic}
                onEdit={onEditDiagnostic}
                lead={lead}
                user={user}
              />
            ))}
          </div>
        ) : (
          <Empty description="No Diagnostic bookings yet." />
        )}
      </Card>
    </section>
  );
}
