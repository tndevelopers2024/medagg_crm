import { useState } from "react";
import toast from "react-hot-toast";
import {
  addOpBooking,
  updateOpBooking,
  removeOpBooking,
  addIpBooking,
  updateIpBooking,
  removeIpBooking,
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

export default function useBookings({
  id,
  loadActivities,
  setNewBookingAdded,
  opBookings,
  setOpBookings,
  ipBookings,
  setIpBookings,
}) {
  const [op, setOp] = useState({ ...EMPTY_OP });
  const [ip, setIp] = useState({ ...EMPTY_IP });
  const [showOpForm, setShowOpForm] = useState(false);
  const [showIpForm, setShowIpForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [editingOpId, setEditingOpId] = useState(null);
  const [editingIpId, setEditingIpId] = useState(null);

  const handleAddOp = async () => {
    if (!id) return;
    setBookingSaving(true);
    try {
      const created = await addOpBooking(id, {
        booked: op.status === "booked" || op.status === "done",
        date: op.date || null,
        time: op.time || "",
        hospital: op.hospital || "",
        doctor: op.doctor || "",
        status: op.status || "pending",
        surgery: op.surgery || "",
        payment: op.payment ? Number(op.payment) : 0,
      });
      setOpBookings((arr) => [...arr, created]);
      setOp({ ...EMPTY_OP });
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
    const getBookingField = (fieldName) => {
      if (!booking.fieldData || !Array.isArray(booking.fieldData)) return "";
      const field = booking.fieldData.find((f) => f.name === fieldName);
      return field?.values?.[0] || "";
    };

    setEditingOpId(String(booking.id || booking._id));
    setOp({
      date: booking.date || getBookingField("date") || getBookingField("appointment_date") || "",
      time: booking.time || getBookingField("time") || getBookingField("appointment_time") || "",
      hospital: booking.hospital || getBookingField("hospital") || getBookingField("hospital_name") || "",
      doctor: booking.doctor || getBookingField("doctor") || getBookingField("doctor_name") || "",
      status: booking.status || "pending",
      surgery: booking.surgery || getBookingField("surgery") || getBookingField("procedure") || "",
      payment: booking.payment || getBookingField("payment") || getBookingField("amount") || "",
    });
    setShowOpForm(true);
  };

  const handleUpdateOp = async () => {
    if (!id || !editingOpId) return;
    setBookingSaving(true);
    try {
      const updated = await updateOpBooking(id, editingOpId, {
        booked: op.status === "booked" || op.status === "done",
        date: op.date || null,
        time: op.time || "",
        hospital: op.hospital || "",
        doctor: op.doctor || "",
        status: op.status || "pending",
        surgery: op.surgery || "",
        payment: op.payment ? Number(op.payment) : 0,
      });
      setOpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(editingOpId) ? { ...b, ...updated } : b
        )
      );
      setOp({ ...EMPTY_OP });
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
      const created = await addIpBooking(id, {
        booked: ip.status === "booked" || ip.status === "done",
        date: ip.date || null,
        time: ip.time || "",
        hospital: ip.hospital || "",
        doctor: ip.doctor || "",
        caseType: ip.caseType || "",
        status: ip.status || "pending",
        payment: ip.payment ? Number(ip.payment) : 0,
      });
      setIpBookings((arr) => [...arr, created]);
      setIp({ ...EMPTY_IP });
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
    const getBookingField = (fieldName) => {
      if (!booking.fieldData || !Array.isArray(booking.fieldData)) return "";
      const field = booking.fieldData.find((f) => f.name === fieldName);
      return field?.values?.[0] || "";
    };

    setEditingIpId(String(booking.id || booking._id));
    setIp({
      date: booking.date || getBookingField("date") || getBookingField("admission_date") || "",
      time: booking.time || getBookingField("time") || getBookingField("admission_time") || "",
      hospital: booking.hospital || getBookingField("hospital") || getBookingField("hospital_name") || "",
      doctor: booking.doctor || getBookingField("doctor") || getBookingField("doctor_name") || "",
      caseType: booking.caseType || getBookingField("case") || getBookingField("casetype") || getBookingField("case_type") || "",
      status: booking.status || "pending",
      payment: booking.payment || getBookingField("payment") || getBookingField("amount") || "",
    });
    setShowIpForm(true);
  };

  const handleUpdateIp = async () => {
    if (!id || !editingIpId) return;
    setBookingSaving(true);
    try {
      const updated = await updateIpBooking(id, editingIpId, {
        booked: ip.status === "booked" || ip.status === "done",
        date: ip.date || null,
        time: ip.time || "",
        hospital: ip.hospital || "",
        doctor: ip.doctor || "",
        caseType: ip.caseType || "",
        status: ip.status || "pending",
        payment: ip.payment ? Number(ip.payment) : 0,
      });
      setIpBookings((arr) =>
        arr.map((b) =>
          String(b.id || b._id) === String(editingIpId) ? { ...b, ...updated } : b
        )
      );
      setIp({ ...EMPTY_IP });
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
    bookingSaving,
  };
}
