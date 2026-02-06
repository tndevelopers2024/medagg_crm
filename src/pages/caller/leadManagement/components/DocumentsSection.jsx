import React from "react";
import toast from "react-hot-toast";
import { FiFile, FiImage } from "react-icons/fi";
import { InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { Card, Upload, List, Button, Popconfirm, Empty } from "antd";
import { uploadLeadDocument, deleteLeadDocument } from "../../../../utils/api";

const fileIcon = (name) => {
  if (!name) return FiFile;
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return FiImage;
  return FiFile;
};

export default function DocumentsSection({
  documents,
  leadId,
  onUploadComplete,
  onDeleteComplete,
}) {
  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be < 10MB");
      onError(new Error("File too large"));
      return;
    }
    const toastId = toast.loading("Uploading...");
    try {
      await uploadLeadDocument(leadId, file);
      toast.success("Document uploaded!");
      onSuccess();
      onUploadComplete();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Upload failed");
      onError(err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteLeadDocument(leadId, docId);
      toast.success("Deleted");
      onDeleteComplete(docId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  return (
    <Card title="Documents">
      <Upload.Dragger
        customRequest={handleCustomUpload}
        showUploadList={false}
        accept="application/pdf,image/*,.doc,.docx"
        className="mb-4"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to upload</p>
        <p className="ant-upload-hint">PDF, images, or documents up to 10MB</p>
      </Upload.Dragger>

      {documents && documents.length > 0 ? (
        <List
          dataSource={documents}
          renderItem={(doc) => {
            const Icon = fileIcon(doc.name);
            return (
              <List.Item
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Delete this document?"
                    onConfirm={() => handleDelete(doc._id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Icon className="w-5 h-5 text-gray-400 mt-1" />
                  }
                  title={
                    <a
                      href={`${(
                        import.meta.env.VITE_BASE_URL || "/api/v1"
                      ).replace(/\/api\/v1\/?$/, "")}/uploads/lead_documents/${
                        doc.path
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 hover:text-violet-600"
                    >
                      {doc.name}
                    </a>
                  }
                  description={`${Math.round(doc.size / 1024)} KB`}
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <Empty description="No documents attached" />
      )}
    </Card>
  );
}
