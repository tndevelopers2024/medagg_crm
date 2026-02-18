import React from "react";
import { Input as AntInput, Select as AntSelect, Button, Divider, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";

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

export const Select = ({ label, value, onChange, options = [], onAddOption, ...rest }) => {
  const [name, setName] = React.useState('');
  const inputRef = React.useRef(null);

  const onNameChange = (event) => {
    setName(event.target.value);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (name.trim() && onAddOption) {
      onAddOption(name.trim());
      setName('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
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
        dropdownRender={(menu) => (
          <>
            {menu}
            {onAddOption && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <AntInput
                    placeholder="New item"
                    ref={inputRef}
                    value={name}
                    onChange={onNameChange}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                    Add
                  </Button>
                </Space>
              </>
            )}
          </>
        )}
        {...rest}
      />
    </div>
  );
};

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
