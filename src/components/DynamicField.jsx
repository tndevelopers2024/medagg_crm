import React from "react";
import { Input, Select, DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";

// Dynamic field renderer component
export const DynamicField = ({ field, value, onChange, error }) => {
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
        switch (field.fieldType) {
            case "text":
                return (
                    <Input
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
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
                    />
                );

            case "date":
                return (
                    <DatePicker
                        value={value ? dayjs(value) : null}
                        onChange={(d) => handleChange(d ? d.format("YYYY-MM-DD") : "")}
                        className="w-full"
                        status={error ? "error" : undefined}
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
                    />
                );

            case "dropdown":
                return (
                    <Select
                        value={value || undefined}
                        onChange={(val) => handleChange(val)}
                        placeholder={field.placeholder || "Select..."}
                        className="w-full"
                        status={error ? "error" : undefined}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={field.options?.map((option) => ({
                            label: option,
                            value: option,
                        }))}
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
                    />
                );

            default:
                return (
                    <Input
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        status={error ? "error" : undefined}
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
            obj[name] = values?.[0] || "";
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
