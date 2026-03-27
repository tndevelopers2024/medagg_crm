import React from "react";
import { Spin, Progress, Statistic, Row, Col, Card, Table, Button, Typography, Alert } from "antd";
import { DownloadOutlined, CheckCircleOutlined, LoadingOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const { Text } = Typography;

function downloadErrorReport(errors) {
  const rows = errors.map((e) => ({ Row: e.row, Reason: e.reason }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, "import_errors.csv");
}

export default function StepResults({ result, loading, batchProgress, importBatchId }) {
  const navigate = useNavigate();
  if (loading) {
    const batchPct = batchProgress
      ? Math.round((batchProgress.current / batchProgress.total) * 100)
      : 0;
    return (
      <div className="flex flex-col items-center py-12 space-y-5 max-w-sm mx-auto">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        {batchProgress ? (
          <>
            <Text className="text-gray-600 font-medium">
              Processing batch {batchProgress.current} of {batchProgress.total}…
            </Text>
            <Progress percent={batchPct} status="active" className="w-full" />
            <div className="flex gap-6 text-sm text-gray-500">
              <span className="text-green-600 font-medium">✓ {batchProgress.imported} imported</span>
              {batchProgress.skipped > 0 && <span className="text-yellow-600">⊘ {batchProgress.skipped} skipped</span>}
              {batchProgress.failed > 0 && <span className="text-red-500">✕ {batchProgress.failed} failed</span>}
            </div>
          </>
        ) : (
          <Text className="text-gray-500">Starting import…</Text>
        )}
      </div>
    );
  }

  if (!result) return null;

  const { imported = 0, skipped = 0, failed = 0, errors = [] } = result;
  const total = imported + skipped + failed;
  const pct = total > 0 ? Math.round((imported / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-center">
        <Progress
          type="circle"
          percent={pct}
          status={failed > 0 ? "exception" : "success"}
          format={() => (
            <span className="text-lg font-bold text-[#322554]">{imported} / {total}</span>
          )}
        />
      </div>

      <Row gutter={16}>
        <Col xs={8}>
          <Card size="small" className="text-center border-green-200 bg-green-50">
            <Statistic
              title="Imported"
              value={imported}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" className="text-center border-yellow-200 bg-yellow-50">
            <Statistic
              title="Skipped (Dupes)"
              value={skipped}
              valueStyle={{ color: "#d48806" }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" className="text-center border-red-200 bg-red-50">
            <Statistic
              title="Failed"
              value={failed}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>

      {errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Text strong className="text-sm text-red-600">
              {errors.length} row(s) had errors:
            </Text>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => downloadErrorReport(errors)}
            >
              Download error report
            </Button>
          </div>
          <Table
            dataSource={errors.map((e, i) => ({ key: i, ...e }))}
            columns={[
              { title: "Row #", dataIndex: "row", key: "row", width: 80 },
              { title: "Reason", dataIndex: "reason", key: "reason" },
            ]}
            size="small"
            pagination={{ pageSize: 10 }}
            bordered
          />
        </div>
      )}

      {imported > 0 && (
        <Alert
          type="success"
          showIcon
          message={
            <div className="flex items-center justify-between gap-4">
              <span>
                {failed === 0
                  ? `All ${imported} leads imported successfully!`
                  : `${imported} leads imported successfully.`}
              </span>
              {importBatchId && (
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/leads?batch=${encodeURIComponent(importBatchId)}`)}
                >
                  View Imported Leads
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
