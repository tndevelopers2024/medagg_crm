import React from "react";
import { Table, Statistic, Row, Col, Card, Radio, Spin, Typography } from "antd";
import { checkDuplicates } from "../../../../utils/api";

const { Text } = Typography;

function getPhoneFromRow(row, mappings) {
  for (const [csvHeader, mapping] of Object.entries(mappings)) {
    if (mapping?.targetType === "core" && mapping?.targetField === "phone") {
      return String(row[csvHeader] || "").replace(/\D/g, "");
    }
  }
  return null;
}

function buildPreviewRow(row, mappings, idx) {
  const obj = { key: idx + 1, _rowNum: idx + 1 };
  for (const [csvHeader, mapping] of Object.entries(mappings)) {
    if (!mapping || mapping.targetType === "skip") continue;
    let label = csvHeader;
    if (mapping.targetType === "core") label = mapping.targetField;
    else if (mapping.targetType === "campaign") label = "campaign";
    else if (mapping.targetType === "caller") label = "caller";
    else if (mapping.targetType === "fieldData") label = mapping.targetField || csvHeader;
    obj[label] = row[csvHeader];
  }
  return obj;
}

export default function StepPreviewCheck({
  rows,
  mappings,
  duplicateHandling,
  onDuplicateHandlingChange,
}) {
  const [dupeStats, setDupeStats] = React.useState(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    if (!rows?.length || !mappings) return;

    const phones = rows
      .map((r) => getPhoneFromRow(r, mappings))
      .filter(Boolean)
      .map((p) => ({ phone: p }));

    if (!phones.length) {
      setDupeStats({ total: rows.length, dupes: 0 });
      return;
    }

    setChecking(true);
    checkDuplicates(phones)
      .then((res) => {
        const dupeSet = new Set(
          (res.duplicates || []).map((d) => String(d.value).replace(/\D/g, ""))
        );
        setDupeStats({ total: rows.length, dupes: dupeSet.size });
      })
      .catch(() => setDupeStats({ total: rows.length, dupes: 0 }))
      .finally(() => setChecking(false));
  }, [rows, mappings]);

  // Build preview columns from mappings
  const previewCols = React.useMemo(() => {
    const cols = [{ title: "#", dataIndex: "_rowNum", key: "_rowNum", width: 50 }];
    const seen = new Set();
    for (const mapping of Object.values(mappings)) {
      if (!mapping || mapping.targetType === "skip") continue;
      let label = "";
      if (mapping.targetType === "core") label = mapping.targetField;
      else if (mapping.targetType === "campaign") label = "campaign";
      else if (mapping.targetType === "caller") label = "caller";
      else if (mapping.targetType === "fieldData") label = mapping.targetField;
      if (label && !seen.has(label)) {
        seen.add(label);
        cols.push({
          title: label,
          dataIndex: label,
          key: label,
          ellipsis: true,
          width: 140,
          render: (v) => <span className="text-xs">{String(v ?? "")}</span>,
        });
      }
    }
    return cols;
  }, [mappings]);

  const previewRows = React.useMemo(
    () => (rows || []).slice(0, 10).map((r, i) => buildPreviewRow(r, mappings, i)),
    [rows, mappings]
  );

  const netNew = dupeStats ? dupeStats.total - dupeStats.dupes : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Row gutter={16}>
        <Col xs={8}>
          <Card size="small" className="text-center">
            <Statistic title="Total Rows" value={rows?.length ?? 0} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" className="text-center">
            {checking ? (
              <Spin />
            ) : (
              <Statistic
                title="Duplicates Found"
                value={dupeStats?.dupes ?? "—"}
                valueStyle={{ color: dupeStats?.dupes > 0 ? "#E9296A" : "#3f8600" }}
              />
            )}
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" className="text-center">
            <Statistic
              title="Net New Leads"
              value={checking ? "…" : netNew}
              valueStyle={{ color: "#322554" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Duplicate handling */}
      <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
        <Text strong className="text-sm">How to handle duplicates?</Text>
        <div>
          <Radio.Group
            value={duplicateHandling}
            onChange={(e) => onDuplicateHandlingChange(e.target.value)}
          >
            <Radio value="skip">Skip duplicates (recommended)</Radio>
            <Radio value="update">Update existing leads with CSV data</Radio>
          </Radio.Group>
        </div>
      </div>

      {/* Preview table */}
      <div>
        <Text className="text-sm text-gray-600 block mb-2">
          Preview (first 10 rows, with mapped field names):
        </Text>
        <Table
          dataSource={previewRows}
          columns={previewCols}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: true }}
        />
      </div>
    </div>
  );
}
