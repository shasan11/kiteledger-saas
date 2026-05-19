import React from "react";
import { notification } from "antd";

export const isPlainObject = (x) => x && typeof x === "object" && !Array.isArray(x);

export const getIn = (obj, path) => {
  if (!obj || !path) return undefined;

  const parts = String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

export const pathExistsInValues = (values, path) => getIn(values, path) !== undefined;

export const flattenDrfErrors = (data, prefix = "", out = []) => {
  if (!data) return out;

  if (typeof data === "string") {
    out.push({ path: prefix, message: data });
    return out;
  }

  if (Array.isArray(data)) {
    if (data.every((x) => typeof x === "string")) {
      out.push({ path: prefix, message: data.join(" ") });
      return out;
    }

    data.forEach((item, idx) => {
      const p = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      flattenDrfErrors(item, p, out);
    });
    return out;
  }

  if (isPlainObject(data)) {
    Object.entries(data).forEach(([k, v]) => {
      const p = prefix ? `${prefix}.${k}` : k;
      flattenDrfErrors(v, p, out);
    });
    return out;
  }

  out.push({ path: prefix, message: String(data) });
  return out;
};

export const parseBackendErrors = (err, formValues) => {
  const data = err?.response?.data;

  if (!data) {
    return {
      fieldErrors: {},
      globalErrors: ["Request failed."],
      allErrors: ["Request failed."],
      validationWarnings: null,
    };
  }

  if (data?.__validation_warnings) {
    return {
      fieldErrors: {},
      globalErrors: [],
      allErrors: [],
      validationWarnings: data.__validation_warnings,
    };
  }

  if (typeof data === "string") {
    return { fieldErrors: {}, globalErrors: [data], allErrors: [data], validationWarnings: null };
  }

  if (data?.detail) {
    const msg = String(data.detail);
    return { fieldErrors: {}, globalErrors: [msg], allErrors: [msg], validationWarnings: null };
  }

  const flat = flattenDrfErrors(data);

  const fieldErrors = {};
  const globalErrors = [];

  flat.forEach(({ path, message }) => {
    const key = (path || "").trim();

    if (!key || key === "non_field_errors" || key === "__all__") {
      globalErrors.push(message);
      return;
    }

    if (!pathExistsInValues(formValues, key)) {
      globalErrors.push(`${key}: ${message}`);
      return;
    }

    fieldErrors[key] = fieldErrors[key]
      ? `${fieldErrors[key]} ${message}`
      : message;
  });

  const allErrors = [
    ...globalErrors,
    ...Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`),
  ];

  return { fieldErrors, globalErrors, allErrors, validationWarnings: null };
};

export const showGlobalErrorsNotification = (globalErrors) => {
  if (!globalErrors?.length) return;

  notification.error({
    message: "Validation error",
    description: (
      <div>
        {globalErrors.map((x, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            • {x}
          </div>
        ))}
      </div>
    ),
    placement: "topRight",
    duration: 6,
  });
};
