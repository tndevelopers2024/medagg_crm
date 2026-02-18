import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  addOpBooking,
  updateOpBooking,
  removeOpBooking,
  addIpBooking,
  updateIpBooking,
  removeIpBooking,
  addDiagnosticBooking,
  updateDiagnosticBooking,
  removeDiagnosticBooking,
  updateBookingField,
} from "../../../../utils/api";

const EMPTY_OP = {
  date: "",
  time: "",
  hospital: "",
  doctor: "",
  status: "pending",
  surgery: "",
  payment: "",
};

const EMPTY_IP = {
  date: "",
  time: "",
  hospital: "",
  doctor: "",
  caseType: "",
  status: "pending",
  payment: "",
};

const EMPTY_DIAGNOSTIC = {
  date: "",
  time: "",
  hospital: "",
  doctor: "",
  test_name: "",
  status: "pending",
  payment: "",
};

export default function useBookings({
  id,
  loadActivities,
  setNewBookingAdded,
  opBookings,
  setOpBookings,
  ipBookings,
  setIpBookings,
  diagnosticBookings,
  setDiagnosticBookings,
}) {
  const [op, setOp] = useState({ status: "pending" });
  const [ip, setIp] = useState({ status: "pending" });
  const [diagnostic, setDiagnostic] = useState({ status: "pending" });
  const [showOpForm, setShowOpForm] = useState(false);
  const [showIpForm, setShowIpForm] = useState(false);
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [editingOpId, setEditingOpId] = useState(null);
  const [editingIpId, setEditingIpId] = useState(null);
  const [editingDiagnosticId, setEditingDiagnosticId] = useState(null);

  const [bookingFields, setBookingFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Fetch booking fields on mount
  useEffect(() => {
    const loadFields = async () => {
      setFieldsLoading(true);
      try {
        const { data } = await import("../../../../utils/api").then((mod) =>
          mod.fetchBookingFields()
        );
        setBookingFields(data || []);
      } catch (err) {
        console.error("Failed to load booking fields", err);
      } finally {
        setFieldsLoading(false);
      }
    };
    loadFields();
  }, []);

  // Process fields: relax allow undefined isEnabled, and infer type if missing
  const processFields = (fields) => {
    return fields
      .filter((f) => f.isEnabled !== false) // Treat undefined as true
      .map((f) => {
        let inferType = f.type || f.fieldType || "text";
        if (!f.type && !f.fieldType) {
          const name = (f.fieldName || f.key || "").toLowerCase();
          if (name.includes("date")) inferType = "date";
          else if (name.includes("time")) inferType = "time";
          else if (name === "payment" || name === "amount") inferType = "number";
        }
        return {
          ...f,
          type: String(inferType).toLowerCase(),
          label: f.label || f.displayLabel || f.fieldName || f.key, // Normalize label
          name: f.fieldName || f.key, // Normalize name
        };
      });
  };

  const opFields = processFields(bookingFields.filter((f) => f.bookingType === "OP"));
  const ipFields = processFields(bookingFields.filter((f) => f.bookingType === "IP"));
  const diagnosticFields = processFields(bookingFields.filter((f) => f.bookingType === "DIAGNOSTIC"));

  // Helper to build payload from dynamic state
  const buildPayload = (state, fields) => {
    // 1. Identify core fields likely expected by backend (if any)
    // Common convention: date, time, status, payment might be top-level.
    // Everything else (or everything) goes into fieldData.
    // For this system, let's assume we maintain top-level keys for backward compat
    // AND put everything into fieldData for dynamic rendering.

    const fieldData = fields.map((f) => ({
      name: f.fieldName || f.key,
      label: f.label,
      values: [String(state[f.fieldName || f.key] || "")],
      type: f.type,
    }));

    // Extract- **Improved Analytics Tabs**: Replaced "Rating" and "Number of Calls" with "City" and "State" analytics in the Leads Management chart view, with full drill-down support.
    // - **"Add Option" Feature**: Admins can now add new values to dropdown fields (Lead Details, OP/IP Bookings) directly from the form UI.
    // - **Bug Fixes**:
    //     - Resolved `ReferenceError` in Lead Management page.
    //     - Fixed Ant Design deprecation warnings for `Drawer` (`width` to `size`) and `Modal` (`destroyOnClose` to `destroyOnHidden`).
    // - **Dynamic Fields in Bookings**: Fixed issues where dynamic fields like "Hospital" and "Short Case Note" were not saving or rendering correctly in the OP/IP forms.
    // - **Form Intelligence**: Updated the booking edit form to intelligently map legacy data to the current dynamic field configuration.
    const payload = {
      status: state.status || "pending",
      booked: state.status === "booked" || state.status === "done",
      payment: Number(state.payment || 0),
      fieldData, // The all-important array
    };

    // Try to map specific dynamic fields to top-level legacy keys if found
    // (e.g. if there is a dynamic field named 'hospital', put it in payload.hospital)
    // This ensures old backend logic (stats, etc.) still works if it relies on these cols.
    const legacyKeys = ["date", "time", "hospital", "doctor", "surgery", "caseType", "test_name"];
    legacyKeys.forEach(k => {
      if (state[k]) payload[k] = state[k];
    });

    return payload;
  };

  const handleAddOp = async () => {
    if (!id) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(op, opFields);
      // Ensure date/time/hospital/doctor are present if they are in state
      // (buildPayload does this via legacyKeys)

      const created = await addOpBooking(id, payload);
      setOpBookings((arr) => [...arr, created]);
      setOp({ status: "pending" });
      setShowOpForm(false);
      setNewBookingAdded(true);
      await loadActivities();
      toast.success("OP booking added");
    } catch (e) {
      toast.error("Failed to add OP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleRemoveOp = async (bid) => {
    if (!id || !bid) return;
    if (!window.confirm("Delete this OP booking?")) return;
    setBookingSaving(true);
    try {
      await removeOpBooking(id, bid);
      setOpBookings((arr) =>
        arr.filter((b) => String(b.id || b._id) !== String(bid))
      );
      await loadActivities();
      toast.success("OP booking removed");
    } catch (e) {
      toast.error("Failed to remove OP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleDoneOp = async (bid) => {
    if (!id || !bid) return;
    setBookingSaving(true);
    try {
      const updated = await updateOpBooking(id, bid, {
        status: "done",
        doneDate: new Date().toISOString(),
        booked: true,
      });
      setOpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(bid) ? { ...b, ...updated } : b
        )
      );
      await loadActivities();
      toast.success("OP booking marked as done");
    } catch (e) {
      toast.error("Failed to update OP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleEditOp = (booking) => {
    setEditingOpId(String(booking.id || booking._id));

    const newState = { status: booking.status || "pending" };

    // Map values to the keys defined in opFields
    opFields.forEach(field => {
      const key = field.fieldName || field.key;
      if (!key) return;
      const lowerKey = key.toLowerCase();

      // 1. Try finding in fieldData
      let val = booking.fieldData?.find(f => f.name === key)?.values?.[0]
        || booking.fieldData?.find(f => f.name === key)?.value;

      // 2. Fallback to legacy top-level properties if not found in fieldData
      if (!val) {
        if (lowerKey === 'date' || lowerKey.includes('date')) val = booking.date;
        else if (lowerKey === 'time' || lowerKey.includes('time')) val = booking.time;
        else if (lowerKey === 'hospital' || lowerKey === 'hospital_name') val = booking.hospital;
        else if (lowerKey === 'doctor') val = booking.doctor;
        else if (lowerKey === 'surgery' || lowerKey === 'procedure' || lowerKey === 'treatment') val = booking.surgery;
        else if (lowerKey === 'payment' || lowerKey === 'amount') val = booking.payment;
        else if (lowerKey === 'notes' || lowerKey === 'remarks') val = booking.remarks || booking.notes;
      }

      if (val !== undefined && val !== null) {
        newState[key] = val;
      }
    });

    setOp(newState);
    setShowOpForm(true);
  };

  const handleUpdateOp = async () => {
    if (!id || !editingOpId) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(op, opFields);
      const updated = await updateOpBooking(id, editingOpId, payload);
      setOpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(editingOpId) ? { ...b, ...updated } : b
        )
      );
      setOp({ status: "pending" });
      setShowOpForm(false);
      setEditingOpId(null);
      await loadActivities();
      toast.success("OP booking updated");
    } catch (e) {
      toast.error("Failed to update OP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleAddIp = async () => {
    if (!id) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(ip, ipFields);
      const created = await addIpBooking(id, payload);
      setIpBookings((arr) => [...arr, created]);
      setIp({ status: "pending" });
      setShowIpForm(false);
      setNewBookingAdded(true);
      await loadActivities();
      toast.success("IP booking added");
    } catch (e) {
      toast.error("Failed to add IP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleRemoveIp = async (bid) => {
    if (!id || !bid) return;
    if (!window.confirm("Delete this IP booking?")) return;
    setBookingSaving(true);
    try {
      await removeIpBooking(id, bid);
      setIpBookings((arr) =>
        arr.filter((b) => String(b.id || b._id) !== String(bid))
      );
      await loadActivities();
      toast.success("IP booking removed");
    } catch (e) {
      toast.error("Failed to remove IP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleDoneIp = async (bid) => {
    if (!id || !bid) return;
    setBookingSaving(true);
    try {
      const updated = await updateIpBooking(id, bid, {
        status: "done",
        doneDate: new Date().toISOString(),
        booked: true,
      });
      setIpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(bid) ? { ...b, ...updated } : b
        )
      );
      await loadActivities();
      toast.success("IP booking marked as done");
    } catch (e) {
      toast.error("Failed to update IP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleEditIp = (booking) => {
    setEditingIpId(String(booking.id || booking._id));

    const newState = { status: booking.status || "pending" };

    // Map values to the keys defined in ipFields
    ipFields.forEach(field => {
      const key = field.fieldName || field.key;
      if (!key) return;
      const lowerKey = key.toLowerCase();

      // 1. Try finding in fieldData
      let val = booking.fieldData?.find(f => f.name === key)?.values?.[0]
        || booking.fieldData?.find(f => f.name === key)?.value;

      // 2. Fallback to legacy top-level properties if not found in fieldData
      if (!val) {
        if (lowerKey === 'date' || lowerKey.includes('date')) val = booking.date;
        else if (lowerKey === 'time' || lowerKey.includes('time')) val = booking.time;
        else if (lowerKey === 'hospital' || lowerKey === 'hospital_name') val = booking.hospital;
        else if (lowerKey === 'doctor') val = booking.doctor;
        else if (lowerKey === 'casetype' || lowerKey === 'case_type' || lowerKey === 'surgery') val = booking.caseType || booking.surgery;
        else if (lowerKey === 'payment' || lowerKey === 'amount') val = booking.payment;
        else if (lowerKey === 'notes' || lowerKey === 'remarks') val = booking.remarks || booking.notes;
      }

      if (val !== undefined && val !== null) {
        newState[key] = val;
      }
    });

    setIp(newState);
    setShowIpForm(true);
  };

  const handleUpdateIp = async () => {
    if (!id || !editingIpId) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(ip, ipFields);
      const updated = await updateIpBooking(id, editingIpId, payload);
      setIpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(editingIpId) ? { ...b, ...updated } : b
        )
      );
      setIp({ status: "pending" });
      setShowIpForm(false);
      setEditingIpId(null);
      await loadActivities();
      toast.success("IP booking updated");
    } catch (e) {
      toast.error("Failed to update IP booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleAddOpOption = async (key, newValue) => {
    try {
      const field = bookingFields.find(f => f.bookingType === 'OP' && (f.fieldName || f.key) === key);
      if (!field?._id) return;

      const updatedOptions = [...(field.options || []), newValue];
      const res = await updateBookingField(field._id, { options: updatedOptions });

      if (res.success) {
        setBookingFields(prev => prev.map(f => f._id === field._id ? { ...f, options: updatedOptions } : f));
        setOp(prev => ({ ...prev, [key]: newValue }));
        toast.success(`Option "${newValue}" added and selected`);
      }
    } catch (err) {
      console.error("Error adding OP option:", err);
      toast.error("Failed to add option");
    }
  };

  const handleAddIpOption = async (key, newValue) => {
    try {
      const field = bookingFields.find(f => f.bookingType === 'IP' && (f.fieldName || f.key) === key);
      if (!field?._id) return;

      const updatedOptions = [...(field.options || []), newValue];
      const res = await updateBookingField(field._id, { options: updatedOptions });

      if (res.success) {
        setBookingFields(prev => prev.map(f => f._id === field._id ? { ...f, options: updatedOptions } : f));
        setIp(prev => ({ ...prev, [key]: newValue }));
        toast.success(`Option "${newValue}" added and selected`);
      }
    } catch (err) {
      console.error("Error adding IP option:", err);
      toast.error("Failed to add option");
    }
  };

  const handleAddDiagnostic = async () => {
    if (!id) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(diagnostic, diagnosticFields);
      const created = await addDiagnosticBooking(id, payload);
      setDiagnosticBookings((arr) => [...arr, created]);
      setDiagnostic({ status: "pending" });
      setShowDiagnosticForm(false);
      setNewBookingAdded(true);
      await loadActivities();
      toast.success("Diagnostic booking added");
    } catch (e) {
      toast.error("Failed to add diagnostic booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleRemoveDiagnostic = async (bid) => {
    if (!id || !bid) return;
    if (!window.confirm("Delete this Diagnostic booking?")) return;
    setBookingSaving(true);
    try {
      await removeDiagnosticBooking(id, bid);
      setDiagnosticBookings((arr) =>
        arr.filter((b) => String(b.id || b._id) !== String(bid))
      );
      await loadActivities();
      toast.success("Diagnostic booking removed");
    } catch (e) {
      toast.error("Failed to remove diagnostic booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleDoneDiagnostic = async (bid) => {
    if (!id || !bid) return;
    setBookingSaving(true);
    try {
      const updated = await updateDiagnosticBooking(id, bid, {
        status: "done",
        doneDate: new Date().toISOString(),
        booked: true,
      });
      setDiagnosticBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(bid) ? { ...b, ...updated } : b
        )
      );
      await loadActivities();
      toast.success("Diagnostic booking marked as done");
    } catch (e) {
      toast.error("Failed to update diagnostic booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleEditDiagnostic = (booking) => {
    setEditingDiagnosticId(String(booking.id || booking._id));
    const newState = { status: booking.status || "pending" };
    diagnosticFields.forEach(field => {
      const key = field.fieldName || field.key;
      if (!key) return;
      const lowerKey = key.toLowerCase();
      let val = booking.fieldData?.find(f => f.name === key)?.values?.[0]
        || booking.fieldData?.find(f => f.name === key)?.value;
      if (!val) {
        if (lowerKey === 'date' || lowerKey.includes('date')) val = booking.date;
        else if (lowerKey === 'time' || lowerKey.includes('time')) val = booking.time;
        else if (lowerKey === 'hospital' || lowerKey === 'hospital_name') val = booking.hospital;
        else if (lowerKey === 'doctor') val = booking.doctor;
        else if (lowerKey === 'test_name' || lowerKey === 'testname' || lowerKey === 'surgery') val = booking.test_name || booking.surgery;
        else if (lowerKey === 'payment' || lowerKey === 'amount') val = booking.payment;
        else if (lowerKey === 'notes' || lowerKey === 'remarks') val = booking.remarks || booking.notes;
      }
      if (val !== undefined && val !== null) {
        newState[key] = val;
      }
    });
    setDiagnostic(newState);
    setShowDiagnosticForm(true);
  };

  const handleUpdateDiagnostic = async () => {
    if (!id || !editingDiagnosticId) return;
    setBookingSaving(true);
    try {
      const payload = buildPayload(diagnostic, diagnosticFields);
      const updated = await updateDiagnosticBooking(id, editingDiagnosticId, payload);
      setDiagnosticBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(editingDiagnosticId) ? { ...b, ...updated } : b
        )
      );
      setDiagnostic({ status: "pending" });
      setShowDiagnosticForm(false);
      setEditingDiagnosticId(null);
      await loadActivities();
      toast.success("Diagnostic booking updated");
    } catch (e) {
      toast.error("Failed to update diagnostic booking");
      console.error(e);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleAddDiagnosticOption = async (key, newValue) => {
    try {
      const field = bookingFields.find(f => f.bookingType === 'DIAGNOSTIC' && (f.fieldName || f.key) === key);
      if (!field?._id) return;
      const updatedOptions = [...(field.options || []), newValue];
      const res = await updateBookingField(field._id, { options: updatedOptions });
      if (res.success) {
        setBookingFields(prev => prev.map(f => f._id === field._id ? { ...f, options: updatedOptions } : f));
        setDiagnostic(prev => ({ ...prev, [key]: newValue }));
        toast.success(`Option "${newValue}" added and selected`);
      }
    } catch (err) {
      console.error("Error adding Diagnostic option:", err);
      toast.error("Failed to add option");
    }
  };

  return {
    op,
    setOp,
    showOpForm,
    setShowOpForm,
    handleAddOp,
    handleRemoveOp,
    handleDoneOp,
    editingOpId,
    setEditingOpId,
    handleEditOp,
    handleUpdateOp,

    ip,
    setIp,
    showIpForm,
    setShowIpForm,
    handleAddIp,
    handleRemoveIp,
    handleDoneIp,
    editingIpId,
    setEditingIpId,
    handleEditIp,
    handleUpdateIp,

    diagnostic,
    setDiagnostic,
    showDiagnosticForm,
    setShowDiagnosticForm,
    handleAddDiagnostic,
    handleRemoveDiagnostic,
    handleDoneDiagnostic,
    editingDiagnosticId,
    setEditingDiagnosticId,
    handleEditDiagnostic,
    handleUpdateDiagnostic,

    bookingSaving,
    opFields,
    ipFields,
    diagnosticFields,
    fieldsLoading,
    onAddOpOption: handleAddOpOption,
    onAddIpOption: handleAddIpOption,
    onAddDiagnosticOption: handleAddDiagnosticOption,
  };
}
