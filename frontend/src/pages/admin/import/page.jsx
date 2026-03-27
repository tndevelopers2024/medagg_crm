import React from "react";
import { Steps, Button, Typography, Card, message, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import {
  UploadOutlined,
  ApartmentOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import StepUpload from "./components/StepUpload";
import StepFieldMapping from "./components/StepFieldMapping";
import StepPreviewCheck from "./components/StepPreviewCheck";
import StepResults from "./components/StepResults";
import StepActivityImport from "./components/StepActivityImport";
import { importCsvLeads } from "../../../utils/api";

const { Title, Text } = Typography;

const STEP_TITLES = [
  { title: "Upload File", icon: <UploadOutlined /> },
  { title: "Map Fields", icon: <ApartmentOutlined /> },
  { title: "Preview", icon: <EyeOutlined /> },
  { title: "Import", icon: <CheckOutlined /> },
];

export default function CsvImportPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = React.useState(0);

  // Step 1 state
  const [parsedData, setParsedData] = React.useState(null);
  // { headers: [], rows: [], totalRows: N }

  // Step 2 state
  const [mappings, setMappings] = React.useState({});

  // Step 3 state
  const [duplicateHandling, setDuplicateHandling] = React.useState("import_all");

  // Step 4 state
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [batchProgress, setBatchProgress] = React.useState(null);
  // batchProgress: { current, total, imported, skipped, failed }
  const [importBatchId, setImportBatchId] = React.useState(null);

  const handleNext = async () => {
    if (current === 0 && !parsedData) {
      message.warning("Please upload a file first.");
      return;
    }
    if (current === 1) {
      const hasMapped = Object.values(mappings).some(
        (m) => m && m.targetType !== "skip"
      );
      if (!hasMapped) {
        message.warning("Please map at least one field before continuing.");
        return;
      }
      const hasPhone = Object.values(mappings).some(
        (m) => m?.targetType === "core" && m?.targetField === "phone"
      );
      if (!hasPhone) {
        message.warning("You must map at least one column to 'Phone Number'.");
        return;
      }
    }
    if (current === 2) {
      // Trigger import on step 3 → 4
      await runImport();
      return;
    }
    setCurrent((c) => c + 1);
  };

  const BATCH_SIZE = 300;

  const runImport = async () => {
    if (!parsedData?.rows?.length) return;
    setImporting(true);
    setBatchProgress(null);
    setCurrent(3);

    // Unique ID for this import session — used to filter "View Leads" after import
    const batchId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setImportBatchId(batchId);

    const allRows = parsedData.rows;
    const batches = [];
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      batches.push(allRows.slice(i, i + BATCH_SIZE));
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allErrors = [];

    try {
      for (let b = 0; b < batches.length; b++) {
        setBatchProgress({
          current: b + 1,
          total: batches.length,
          imported: totalImported,
          skipped: totalSkipped,
          failed: totalFailed,
        });

        const res = await importCsvLeads({
          rows: batches[b],
          mappings,
          defaultCampaignId: null,
          defaultStatus: "New Lead",
          defaultPlatform: "telcrm",
          duplicateHandling,
          importBatchId: batchId,
        });

        totalImported += res.imported || 0;
        totalSkipped += res.skipped || 0;
        totalFailed += res.failed || 0;
        // Adjust row numbers to be relative to full file (not just the batch)
        const batchOffset = b * BATCH_SIZE;
        for (const e of res.errors || []) {
          allErrors.push({ ...e, row: (e.row || 0) + batchOffset });
        }
      }

      setResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed, errors: allErrors });
    } catch (err) {
      message.error("Import failed: " + (err?.response?.data?.error || err.message));
      setResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed + (allRows.length - totalImported - totalSkipped - totalFailed), errors: allErrors });
    } finally {
      setImporting(false);
      setBatchProgress(null);
    }
  };

  const handleBack = () => {
    if (current > 0 && current < 3) setCurrent((c) => c - 1);
  };

  const handleReset = () => {
    setCurrent(0);
    setParsedData(null);
    setMappings({});
    setDuplicateHandling("import_all");
    setResult(null);
    setImporting(false);
    setBatchProgress(null);
    setImportBatchId(null);
  };

  const renderStep = () => {
    switch (current) {
      case 0:
        return (
          <StepUpload
            onParsed={(data) => {
              setParsedData(data);
              setMappings({});
            }}
          />
        );
      case 1:
        return (
          <StepFieldMapping
            headers={parsedData?.headers || []}
            sampleRows={(parsedData?.rows || []).slice(0, 3)}
            mappings={mappings}
            onMappingsChange={setMappings}
          />
        );
      case 2:
        return (
          <StepPreviewCheck
            rows={parsedData?.rows || []}
            mappings={mappings}
            duplicateHandling={duplicateHandling}
            onDuplicateHandlingChange={setDuplicateHandling}
          />
        );
      case 3:
        return <StepResults result={result} loading={importing} batchProgress={batchProgress} importBatchId={importBatchId} />;
      default:
        return null;
    }
  };

  const isLastSetupStep = current === 2;
  const isImportStep = current === 3;

  const tabItems = [
    {
      key: "leads",
      label: (
        <span><UnorderedListOutlined /> Import Leads</span>
      ),
      children: (
        <>
          <Steps
            current={current}
            items={STEP_TITLES}
            size="small"
            className="mb-6"
          />

          <Card>
            <div className="min-h-[340px]">{renderStep()}</div>

            <div className="flex justify-between mt-6 pt-4 border-t">
              <div>
                {current > 0 && !isImportStep && (
                  <Button onClick={handleBack}>Back</Button>
                )}
                {isImportStep && result && (
                  <Button onClick={handleReset}>Import Another File</Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => navigate(importBatchId && isImportStep ? `/leads?batch=${encodeURIComponent(importBatchId)}` : "/leads")}>View Leads</Button>
                {!isImportStep && (
                  <Button
                    type="primary"
                    onClick={handleNext}
                    loading={importing}
                  >
                    {isLastSetupStep ? "Start Import" : "Next"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </>
      ),
    },
    {
      key: "activities",
      label: (
        <span><ThunderboltOutlined /> Import Activities</span>
      ),
      children: (
        <Card>
          <StepActivityImport />
        </Card>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Title level={3} className="!mb-1">TelCRM Data Import</Title>
        <Text type="secondary">
          Import leads and activities from TelCRM export files.
        </Text>
      </div>

      <Tabs items={tabItems} defaultActiveKey="leads" />
    </div>
  );
}

