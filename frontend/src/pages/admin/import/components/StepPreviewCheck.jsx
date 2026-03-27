import React from "react";
import { Table, Statistic, Row, Col, Card, Radio, Spin, Typography, Button, Tag, Collapse } from "antd";
import { WarningOutlined, EyeOutlined } from "@ant-design/icons";
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
  const [dupePhones, setDupePhones] = React.useState(new Set());
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
        setDupePhones(dupeSet);
        setDupeStats({ total: rows.length, dupes: dupeSet.size });
      })
      .catch(() => {
        setDupePhones(new Set());
        setDupeStats({ total: rows.length, dupes: 0 });
      })
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

  // Build duplicate rows for the review table
  const dupeRows = React.useMemo(() => {
    if (!dupePhones.size || !rows?.length) return [];
    return rows
      .map((r, i) => {
        const phone = getPhoneFromRow(r, mappings);
        if (!phone || !dupePhones.has(phone)) return null;
        return buildPreviewRow(r, mappings, i);
      })
      .filter(Boolean);
  }, [rows, mappings, dupePhones]);

  // Add phone column with "Duplicate" tag for the review table
  const dupeReviewCols = React.useMemo(() => {
    const cols = [
      { title: "#", dataIndex: "_rowNum", key: "_rowNum", width: 50 },
      {
        title: "Status",
        key: "_dupTag",
        width: 100,
        render: () => <Tag color="orange">Duplicate</Tag>,
      },
    ];
    const seen = new Set(["_rowNum", "_dupTag"]);
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

  const netNew = dupeStats ? dupeStats.total - dupeStats.dupes : 0;
  const hasDupes = (dupeStats?.dupes ?? 0) > 0;

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
                valueStyle={{ color: hasDupes ? "#E9296A" : "#3f8600" }}
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
            <div className="space-y-2">
              <div><Radio value="import_all">Import all leads (including duplicates)</Radio></div>
              <div><Radio value="skip">Skip duplicates</Radio></div>
              <div><Radio value="update">Update existing leads with CSV data</Radio></div>
            </div>
          </Radio.Group>
        </div>
      </div>

      {/* Review Duplicates panel */}
      {hasDupes && !checking && (
        <Collapse
          items={[
            {
              key: "dupes",
              label: (
                <span className="flex items-center gap-2 text-orange-600 font-medium">
                  <WarningOutlined />
                  Review {dupeStats.dupes} duplicate{dupeStats.dupes > 1 ? "s" : ""} found in this file
                </span>
              ),
              children: (
                <div>
                  <Text className="text-xs text-gray-500 block mb-3">
                    These rows match existing leads by phone number. Choose how to handle them above.
                  </Text>
                  <Table
                    dataSource={dupeRows}
                    columns={dupeReviewCols}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    size="small"
                    bordered
                    scroll={{ x: true }}
                  />
                </div>
              ),
            },
          ]}
        />
      )}

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
