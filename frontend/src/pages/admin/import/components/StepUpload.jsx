import React from "react";
import { Upload, Button, Typography, Alert, Table } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Dragger } = Upload;
const { Text } = Typography;

export default function StepUpload({ onParsed }) {
  const [error, setError] = React.useState(null);
  const [preview, setPreview] = React.useState(null);

  const parseFile = (file) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rawRows.length < 2) {
          setError("CSV must have at least a header row and one data row.");
          return;
        }

        const headers = rawRows[0].map(String);
        const dataRows = rawRows.slice(1).filter((r) =>
          r.some((cell) => cell !== "" && cell != null)
        );

        // Build row objects
        const rowObjects = dataRows.map((r) => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = r[i] !== undefined ? r[i] : "";
          });
          return obj;
        });

        const previewRows = dataRows.slice(0, 5).map((r, idx) => {
          const obj = { key: idx };
          headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ""; });
          return obj;
        });

        setPreview({ headers, totalRows: rowObjects.length, previewRows });
        onParsed({ headers, rows: rowObjects, totalRows: rowObjects.length });
      } catch (err) {
        setError("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent antd auto-upload
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Dragger
        accept=".csv,.xlsx,.xls"
        beforeUpload={parseFile}
        showUploadList={false}
        multiple={false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag a CSV / Excel file here</p>
        <p className="ant-upload-hint text-gray-400 text-sm">
          Supports .csv, .xlsx, .xls — first sheet only
        </p>
      </Dragger>

      {error && <Alert type="error" message={error} showIcon />}

      {preview && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex gap-6 text-sm">
            <span>
              <Text strong>Columns detected:</Text>{" "}
              <Text>{preview.headers.length}</Text>
            </span>
            <span>
              <Text strong>Total data rows:</Text>{" "}
              <Text>{preview.totalRows}</Text>
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table
              size="small"
              dataSource={preview.previewRows}
              columns={preview.headers.map((h) => ({
                title: h,
                dataIndex: h,
                key: h,
                ellipsis: true,
                width: 150,
                render: (v) => (
                  <span className="text-xs text-gray-600">
                    {String(v ?? "").slice(0, 40)}
                  </span>
                ),
              }))}
              pagination={false}
              scroll={{ x: true }}
              bordered
            />
          </div>
          <Text type="secondary" className="text-xs">
            Showing first {preview.previewRows.length} rows as preview.
          </Text>
        </div>
      )}
    </div>
  );
}
