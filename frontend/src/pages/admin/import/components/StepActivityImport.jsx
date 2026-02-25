import React, { useState, useCallback } from "react";
import {
    Upload, Button, Typography, Alert, Card, Statistic, Row, Col, Table, Tag, message, Spin,
} from "antd";
import {
    UploadOutlined,
    PhoneOutlined,
    MessageOutlined,
    FileTextOutlined,
    SettingOutlined,
    CheckCircleOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { importActivities } from "../../../../utils/api";

const { Title, Text, Paragraph } = Typography;

// Map sheet name → fileType value for auto-detection
const SHEET_TYPE_MAP = {
    "call action": "call",
    "user note": "note",
    "system note": "systemNote",
    "whatsapp action": "whatsapp",
};

const TYPE_META = {
    call: { label: "Call Logs", icon: <PhoneOutlined />, color: "blue" },
    note: { label: "User Notes", icon: <FileTextOutlined />, color: "green" },
    systemNote: { label: "System Notes", icon: <SettingOutlined />, color: "orange" },
    whatsapp: { label: "WhatsApp Messages", icon: <MessageOutlined />, color: "purple" },
};

export default function StepActivityImport() {
    const [rows, setRows] = useState([]);
    const [fileType, setFileType] = useState(null);
    const [fileName, setFileName] = useState("");
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    // Parse uploaded xlsx
    const handleFile = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: "array" });
                const sheetName = wb.SheetNames[0];
                const detectedType = SHEET_TYPE_MAP[sheetName.toLowerCase()] || null;

                if (!detectedType) {
                    message.error(`Unrecognized sheet name: "${sheetName}". Expected: Call Action, User Note, System Note, or Whatsapp Action`);
                    return;
                }

                const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
                // Check for Lead id column
                if (data.length > 0 && !data[0].hasOwnProperty("Lead id")) {
                    message.error('File is missing "Lead id" column. This is required to match activities to leads.');
                    return;
                }

                setRows(data);
                setFileType(detectedType);
                setFileName(file.name);
                setResult(null);
                message.success(`Loaded ${data.length} ${TYPE_META[detectedType]?.label || "activities"} from "${file.name}"`);
            } catch (err) {
                message.error("Failed to read file: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        return false; // prevent upload
    }, []);

    const handleImport = async () => {
        if (!rows.length || !fileType) return;
        setImporting(true);
        try {
            const res = await importActivities({ rows, fileType });
            setResult(res);
            if (res.imported > 0) {
                message.success(`Imported ${res.imported} activities.`);
            }
        } catch (err) {
            message.error("Import failed: " + (err?.response?.data?.error || err.message));
            setResult({ imported: 0, skipped: rows.length, failed: 0, errors: [] });
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setRows([]);
        setFileType(null);
        setFileName("");
        setResult(null);
    };

    const meta = fileType ? TYPE_META[fileType] : null;

    // Preview columns based on file type
    const previewColumns = fileType
        ? getPreviewColumns(fileType)
        : [];

    return (
        <div className="space-y-5">
            {/* Upload area */}
            {!rows.length && (
                <div>
                    <Paragraph type="secondary">
                        Upload a TelCRM activity export file (.xlsx). Supported types:
                        <strong> Call logs, User Notes, System Notes, WhatsApp Messages</strong>.
                        The file type is auto-detected from the sheet name.
                    </Paragraph>
                    <Paragraph type="secondary" style={{ marginTop: 4 }}>
                        <strong>Important:</strong> Import leads from <code>FullExport.csv</code> first with the
                        <code> Lead id</code> → <code>TelCRM Lead ID</code> mapping, so activities can be linked.
                    </Paragraph>
                    <Upload.Dragger
                        accept=".xlsx,.xls"
                        beforeUpload={handleFile}
                        showUploadList={false}
                        style={{ padding: "40px 20px" }}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined style={{ fontSize: 40, color: "#1677ff" }} />
                        </p>
                        <p className="ant-upload-text">Click or drag a TelCRM activity export (.xlsx) here</p>
                    </Upload.Dragger>
                </div>
            )}

            {/* File loaded — show info and preview */}
            {rows.length > 0 && !result && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        icon={meta?.icon}
                        message={
                            <span>
                                <Tag color={meta?.color}>{meta?.label}</Tag>
                                <strong>{fileName}</strong> — {rows.length} activities found
                            </span>
                        }
                    />

                    <Table
                        dataSource={rows.slice(0, 5)}
                        columns={previewColumns}
                        rowKey={(_, i) => i}
                        pagination={false}
                        size="small"
                        scroll={{ x: true }}
                        title={() => <Text type="secondary">Preview (first 5 rows)</Text>}
                    />

                    <div className="flex gap-3 justify-end">
                        <Button onClick={handleReset}>Cancel</Button>
                        <Button
                            type="primary"
                            onClick={handleImport}
                            loading={importing}
                            icon={<CheckCircleOutlined />}
                        >
                            Import {rows.length} Activities
                        </Button>
                    </div>
                </>
            )}

            {/* Importing spinner */}
            {importing && (
                <div className="text-center py-8">
                    <Spin size="large" />
                    <div className="mt-3"><Text type="secondary">Importing activities…</Text></div>
                </div>
            )}

            {/* Results */}
            {result && !importing && (
                <>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Total" value={result.total || rows.length} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Imported" value={result.imported} valueStyle={{ color: "#52c41a" }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Skipped" value={result.skipped} valueStyle={{ color: "#faad14" }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Failed" value={result.failed} valueStyle={{ color: "#ff4d4f" }} />
                            </Card>
                        </Col>
                    </Row>

                    {result.skipped > 0 && (
                        <Alert
                            type="warning"
                            icon={<WarningOutlined />}
                            showIcon
                            message={`${result.skipped} rows skipped — lead not found (no matching TelCRM Lead ID in database). Make sure you imported leads first with the Lead id mapped.`}
                        />
                    )}

                    {result.errors?.length > 0 && (
                        <Table
                            dataSource={result.errors.slice(0, 20)}
                            columns={[
                                { title: "Row", dataIndex: "row", width: 80 },
                                { title: "Error", dataIndex: "reason" },
                            ]}
                            rowKey={(_, i) => i}
                            pagination={false}
                            size="small"
                            title={() => <Text type="danger">Errors (first 20)</Text>}
                        />
                    )}

                    <div className="flex justify-end">
                        <Button type="primary" onClick={handleReset}>Import Another File</Button>
                    </div>
                </>
            )}
        </div>
    );
}

/* Column configs for preview table per file type */
function getPreviewColumns(fileType) {
    const leadCols = [
        { title: "Name", dataIndex: "Name", width: 120, ellipsis: true },
        { title: "Phone", dataIndex: "Phone", width: 120 },
        { title: "Lead id", dataIndex: "Lead id", width: 180, ellipsis: true },
    ];

    switch (fileType) {
        case "call":
            return [
                { title: "Date", dataIndex: "Call Start Time", width: 100 },
                { title: "Type", dataIndex: "Call Type", width: 120 },
                { title: "Duration (s)", dataIndex: "Duration(in sec)", width: 90 },
                { title: "Feedback", dataIndex: "Feedback", width: 120 },
                { title: "Caller", dataIndex: "Caller name", width: 100 },
                ...leadCols,
            ];
        case "note":
            return [
                { title: "Date", dataIndex: "Action Created At", width: 100 },
                { title: "Created By", dataIndex: "Action Created By name", width: 100 },
                { title: "Note", dataIndex: "User Note", width: 300, ellipsis: true },
                ...leadCols,
            ];
        case "systemNote":
            return [
                { title: "Date", dataIndex: "Action Created At", width: 100 },
                { title: "System Note", dataIndex: "System Note", width: 400, ellipsis: true },
                ...leadCols,
            ];
        case "whatsapp":
            return [
                { title: "Date", dataIndex: "Action Created At", width: 100 },
                { title: "Type", dataIndex: "WhatsApp Message Type", width: 130 },
                { title: "Message", dataIndex: "WhatsApp Message", width: 300, ellipsis: true },
                ...leadCols,
            ];
        default:
            return leadCols;
    }
}
