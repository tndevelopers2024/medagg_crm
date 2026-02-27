import React from "react";
import { Input, Select, DatePicker, TimePicker, Button, Divider, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Try to parse a date string in many formats.
 * Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO, Excel serial numbers, etc.
 * Returns a valid dayjs object or null.
 */
export const smartParseDayjs = (raw) => {
    if (!raw) return null;
    // Already a dayjs object
    if (dayjs.isDayjs(raw) && raw.isValid()) return raw;

    const s = String(raw).trim();
    if (!s) return null;

    // Excel serial number (e.g. "46056.00011574074" or 46056)
    const num = Number(s);
    if (!isNaN(num) && num > 25000 && num < 100000) {
        // Excel epoch: Dec 30, 1899 (accounting for Lotus 123 bug)
        const epochMs = new Date(1899, 11, 30).getTime();
        const d = dayjs(new Date(epochMs + num * 86400000));
        if (d.isValid()) return d;
    }

    // Try common formats in order of likelihood
    const formats = [
        "DD/MM/YYYY",
        "DD-MM-YYYY",
        "DD.MM.YYYY",
        "DD/MM/YYYY HH:mm:ss",
        "DD-MM-YYYY HH:mm:ss",
        "DD/MM/YYYY HH:mm",
        "DD-MM-YYYY HH:mm",
        "YYYY-MM-DD",
        "YYYY-MM-DD HH:mm:ss",
        "YYYY-MM-DDTHH:mm:ss",
        "YYYY-MM-DDTHH:mm:ss.SSSZ",
        "MM/DD/YYYY",
        "D/M/YYYY",
        "D-M-YYYY",
    ];

    for (const fmt of formats) {
        const d = dayjs(s, fmt, true); // strict mode
        if (d.isValid()) return d;
    }

    // Last resort: let dayjs try native parsing (handles ISO strings)
    const fallback = dayjs(s);
    if (fallback.isValid()) return fallback;

    return null;
};

// Dynamic field renderer component
export const DynamicField = ({ field, value, onChange, error, onAddOption, disabled }) => {
    const [newName, setNewName] = React.useState('');
    const inputRef = React.useRef(null);
    const handleChange = (val) => {
        onChange(field.fieldName, val);
    };

    const handleInputChange = (e) => {
        onChange(field.fieldName, e.target.value);
    };

    const handleCheckboxChange = (e) => {
        onChange(field.fieldName, e.target.checked);
    };

    const renderInput = () => {
        const type = (field.fieldType || "").toLowerCase();
        switch (type) {
            case "text":
                return (
                    <Input
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "phone":
                return (
                    <Input
                        type="tel"
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "email":
                return (
                    <Input
                        type="email"
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "number":
                return (
                    <Input
                        type="number"
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        min={field.validation?.min}
                        max={field.validation?.max}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "date":
                return (
                    <DatePicker
                        value={value ? smartParseDayjs(value) : null}
                        onChange={(d) => handleChange(d ? d.format("YYYY-MM-DD") : "")}
                        className="w-full"
                        format="DD/MM/YYYY"
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "time":
                return (
                    <TimePicker
                        value={value ? dayjs(value, "HH:mm") : null}
                        onChange={(t) => handleChange(t ? t.format("HH:mm") : "")}
                        className="w-full"
                        format="HH:mm"
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            case "dropdown":
            case "select":
                return (
                    <Select
                        value={value || undefined}
                        onChange={(val) => handleChange(val)}
                        placeholder={field.placeholder || "Select..."}
                        className="w-full"
                        status={error ? "error" : undefined}
                        allowClear
                        showSearch
                        disabled={disabled}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={field.options?.map((option) => ({
                            label: option,
                            value: option,
                        }))}
                        dropdownRender={(menu) => (
                            <>
                                {menu}
                                {onAddOption && !disabled && (
                                    <>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Space style={{ padding: '0 8px 4px' }}>
                                            <Input
                                                placeholder="New item"
                                                ref={inputRef}
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                            <Button
                                                type="text"
                                                icon={<PlusOutlined />}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (newName.trim()) {
                                                        onAddOption(field, newName.trim());
                                                        setNewName('');
                                                    }
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </Space>
                                    </>
                                )}
                            </>
                        )}
                    />
                );

            case "textarea":
                return (
                    <Input.TextArea
                        rows={4}
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );

            default:
                return (
                    <Input
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
                        disabled={disabled}
                    />
                );
        }
    };

    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
                {field.displayLabel}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
};

// Helper to convert fieldData array to object
export const fieldDataToObject = (fieldData) => {
    const obj = {};
    if (Array.isArray(fieldData)) {
        fieldData.forEach(({ name, values }) => {
            const key = (name || "").toLowerCase().trim();
            if (key) obj[key] = values?.[0] || "";
        });
    }
    return obj;
};

// Helper to convert object to fieldData array
export const objectToFieldData = (obj) => {
    return Object.entries(obj)
        .filter(([_, value]) => value !== "" && value !== null && value !== undefined)
        .map(([name, value]) => ({
            name,
            values: [String(value)],
        }));
};
