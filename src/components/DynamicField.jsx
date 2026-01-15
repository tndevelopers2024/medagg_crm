import React from "react";

// Dynamic field renderer component
export const DynamicField = ({ field, value, onChange, error }) => {
    const handleChange = (e) => {
        const newValue = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        onChange(field.fieldName, newValue);
    };

    const commonClasses = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-100 placeholder:text-gray-400";
    const errorClasses = error ? "border-red-300 focus:ring-red-100" : "";

    const renderInput = () => {
        switch (field.fieldType) {
            case "text":
                return (
                    <input
                        type="text"
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "phone":
                return (
                    <input
                        type="tel"
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        pattern={field.validation?.pattern}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "email":
                return (
                    <input
                        type="email"
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "number":
                return (
                    <input
                        type="number"
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        min={field.validation?.min}
                        max={field.validation?.max}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "date":
                return (
                    <input
                        type="date"
                        value={value || ""}
                        onChange={handleChange}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "time":
                return (
                    <input
                        type="time"
                        value={value || ""}
                        onChange={handleChange}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            case "dropdown":
                return (
                    <select
                        value={value || ""}
                        onChange={handleChange}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    >
                        <option value="">{field.placeholder || "Select..."}</option>
                        {field.options?.map((option, index) => (
                            <option key={index} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );

            case "textarea":
                return (
                    <textarea
                        rows={4}
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={value || ""}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        required={field.isRequired}
                        className={`${commonClasses} ${errorClasses}`}
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
