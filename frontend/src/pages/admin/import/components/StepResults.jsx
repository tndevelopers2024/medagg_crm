import React from "react";
import { Progress, Statistic, Row, Col, Card, Table, Button, Typography, Alert } from "antd";
import { DownloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Text } = Typography;

function downloadErrorReport(errors) {
  const rows = errors.map((e) => ({ Row: e.row, Reason: e.reason }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, "import_errors.csv");
}

export default function StepResults({ result, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 space-y-4">
        <Progress type="circle" percent={99} status="active" />
        <Text className="text-gray-500">Importing leads, please wait…</Text>
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

      {imported > 0 && failed === 0 && (
        <Alert
          type="success"
          message={`All ${imported} leads imported successfully! You can view them in the Leads section.`}
          showIcon
        />
      )}
    </div>
  );
}
