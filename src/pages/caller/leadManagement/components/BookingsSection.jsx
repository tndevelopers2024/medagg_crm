import React from "react";
import {
  FiPlusCircle,
  FiCheckCircle,
  FiTrash2,
  FiEdit2,
} from "react-icons/fi";
import { Card, Tag, Button, Badge, Empty, DatePicker, TimePicker } from "antd";
import { fmtDate, readField } from "../utils/helpers";
import { Input, Select } from "./FormControls";
import { BOOKING_STATUSES } from "../../../../utils/api";
import dayjs from "dayjs";

const statusBadge = (s) => {
  const map = {
    done: "green",
    pending: "orange",
    booked: "purple",
  };
  return map[s] || "default";
};

function BookingCard({ b, type, onDone, onRemove, onEdit }) {
  const bid = String(b.id || b._id);
  const getBookingField = (fieldName) =>
    readField(b.fieldData || [], [fieldName]);

  const isOp = type === "OP";

  const date =
    b.date ||
    getBookingField("date") ||
    getBookingField(isOp ? "appointment_date" : "admission_date");
  const time =
    b.time ||
    getBookingField("time") ||
    getBookingField(isOp ? "appointment_time" : "admission_time");
  const hospital =
    b.hospital || getBookingField("hospital") || getBookingField("hospital_name");
  const doctor =
    b.doctor || getBookingField("doctor") || getBookingField("doctor_name");
  const payment =
    b.payment || getBookingField("payment") || getBookingField("amount");
  const remarks =
    b.remarks || getBookingField("remarks") || getBookingField("notes");

  const surgery = isOp
    ? b.surgery || getBookingField("surgery") || getBookingField("procedure")
    : null;
  const caseType = !isOp
    ? b.caseType ||
    getBookingField("case") ||
    getBookingField("casetype") ||
    getBookingField("case_type")
    : null;

  const borderColor =
    b.status === "done"
      ? "border-l-emerald-400"
      : b.status === "pending"
        ? "border-l-amber-400"
        : isOp
          ? "border-l-violet-400"
          : "border-l-indigo-400";

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
              {hospital || "No hospital specified"}
            </div>
          </div>
          <Tag color={statusBadge(b.status)}>
            {b.status || "pending"}
          </Tag>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {doctor && (
            <div>
              <span className="font-medium">Doctor:</span> {doctor}
            </div>
          )}
          {surgery && (
            <div>
              <span className="font-medium">Surgery:</span> {surgery}
            </div>
          )}
          {caseType && (
            <div>
              <span className="font-medium">Case:</span> {caseType}
            </div>
          )}
          {payment && (
            <div>
              <span className="font-medium">Payment:</span>{" "}
              ₹{Number(payment).toLocaleString()}
            </div>
          )}
          {remarks && (
            <div className="col-span-2">
              <span className="font-medium">Remarks:</span> {remarks}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
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
}) {
  const bookingStatusOpts = BOOKING_STATUSES.map((s) => ({
    value: s,
    label: s[0].toUpperCase() + s.slice(1),
  }));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/30 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {editingOpId ? "Edit OP Booking" : "Add New OP Booking"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">OP Date</label>
                <DatePicker
                  value={op.date ? dayjs(op.date) : null}
                  onChange={(date) => setOp((s) => ({ ...s, date: date ? date.format("YYYY-MM-DD") : "" }))}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">OP Time</label>
                <TimePicker
                  value={op.time ? dayjs(op.time, "HH:mm") : null}
                  onChange={(time) => setOp((s) => ({ ...s, time: time ? time.format("HH:mm") : "" }))}
                  className="w-full"
                  format="HH:mm"
                  placeholder="Select time"
                />
              </div>
              <Input
                label="Hospital Name"
                value={op.hospital || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, hospital: e.target.value }))
                }
              />
              <Input
                label="Doctor Name"
                value={op.doctor || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, doctor: e.target.value }))
                }
              />
              <Select
                label="OP Status"
                value={op.status}
                onChange={(e) =>
                  setOp((s) => ({ ...s, status: e.target.value }))
                }
                options={bookingStatusOpts}
              />
              <Input
                label="Surgery"
                value={op.surgery || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, surgery: e.target.value }))
                }
              />
              <Input
                label="Payment"
                type="number"
                value={op.payment || ""}
                onChange={(e) =>
                  setOp((s) => ({ ...s, payment: e.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="primary"
                icon={<FiPlusCircle />}
                onClick={editingOpId ? onUpdateOp : onAddOp}
                loading={bookingSaving}
              >
                {bookingSaving
                  ? editingOpId
                    ? "Updating..."
                    : "Adding..."
                  : editingOpId
                    ? "Update OP"
                    : "Add OP"}
              </Button>
              <Button
                onClick={() => {
                  setShowOpForm(false);
                  setOp({
                    date: "",
                    time: "",
                    hospital: "",
                    doctor: "",
                    surgery: "",
                    payment: "",
                    status: "pending",
                  });
                  setEditingOpId(null);
                }}
                disabled={bookingSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
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
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {editingIpId ? "Edit IP Booking" : "Add New IP Booking"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">IP Date</label>
                <DatePicker
                  value={ip.date ? dayjs(ip.date) : null}
                  onChange={(date) => setIp((s) => ({ ...s, date: date ? date.format("YYYY-MM-DD") : "" }))}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">IP Time</label>
                <TimePicker
                  value={ip.time ? dayjs(ip.time, "HH:mm") : null}
                  onChange={(time) => setIp((s) => ({ ...s, time: time ? time.format("HH:mm") : "" }))}
                  className="w-full"
                  format="HH:mm"
                  placeholder="Select time"
                />
              </div>
              <Input
                label="Hospital Name"
                value={ip.hospital || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, hospital: e.target.value }))
                }
              />
              <Input
                label="Doctor Name"
                value={ip.doctor || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, doctor: e.target.value }))
                }
              />
              <Input
                label="Case"
                value={ip.caseType || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, caseType: e.target.value }))
                }
              />
              <Select
                label="IP Status"
                value={ip.status}
                onChange={(e) =>
                  setIp((s) => ({ ...s, status: e.target.value }))
                }
                options={bookingStatusOpts}
              />
              <Input
                label="Payment"
                type="number"
                value={ip.payment || ""}
                onChange={(e) =>
                  setIp((s) => ({ ...s, payment: e.target.value }))
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="primary"
                icon={<FiPlusCircle />}
                onClick={editingIpId ? onUpdateIp : onAddIp}
                loading={bookingSaving}
              >
                {bookingSaving
                  ? editingIpId
                    ? "Updating..."
                    : "Adding..."
                  : editingIpId
                    ? "Update IP"
                    : "Add IP"}
              </Button>
              <Button
                onClick={() => {
                  setShowIpForm(false);
                  setIp({
                    date: "",
                    time: "",
                    hospital: "",
                    doctor: "",
                    caseType: "",
                    payment: "",
                    status: "pending",
                  });
                  setEditingIpId(null);
                }}
                disabled={bookingSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
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
              />
            ))}
          </div>
        ) : (
          <Empty description="No IP bookings yet." />
        )}
      </Card>
    </section>
  );
}
