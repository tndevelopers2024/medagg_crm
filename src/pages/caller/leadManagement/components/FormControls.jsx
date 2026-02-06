import React from "react";
import { Input as AntInput, Select as AntSelect } from "antd";

export const Input = ({ label, className, onChange, ...p }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{label}</label>
    <AntInput
      {...p}
      onChange={onChange}
      className={className}
    />
  </div>
);

export const Select = ({ label, value, onChange, options = [], ...rest }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{label}</label>
    <AntSelect
      value={value}
      onChange={(val) => onChange({ target: { value: val } })}
      options={options}
      className="w-full"
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      {...rest}
    />
  </div>
);

export const Textarea = ({ label, className, ...p }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-600">{label}</label>
    <AntInput.TextArea
      {...p}
      rows={6}
      className={className}
    />
  </div>
);
