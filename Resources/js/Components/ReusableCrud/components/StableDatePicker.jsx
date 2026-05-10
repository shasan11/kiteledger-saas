import React, { useMemo } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const StableDatePicker = React.memo(function StableDatePicker({
  value,
  onChange,
  disabled,
  placeholder,
  format = "YYYY-MM-DD",
  ...props
}) {
  const parsed = useMemo(() => {
    if (!value) return null;
    if (dayjs.isDayjs(value)) return value;
    const d = dayjs(value, format, true);
    if (d.isValid()) return d;
    const d2 = dayjs(value);
    return d2.isValid() ? d2 : null;
  }, [value, format]);

  return (
    <DatePicker
      size="large"
      style={{ width: "100%" }}
      disabled={disabled}
      value={parsed}
      format={format}
      placeholder={placeholder || "Select date"}
      onChange={(d) => onChange(d ? d.format(format) : null)}
      {...props}
    />
  );
});


export default StableDatePicker;
