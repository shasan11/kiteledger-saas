import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Modal,
  Button,
  Form,
  Input,
  Switch,
  Upload,
  Radio,
  message,
  Row,
  Col,
  Select,
  InputNumber,
  DatePicker,
  Drawer,
  Checkbox,
  Collapse,
  Dropdown,
  notification,
  Pagination,
  AutoComplete,
  Transfer,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  SearchOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  ClockCircleOutlined,
  ColumnHeightOutlined,
  FilterOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Formik, Form as FormikForm, Field, FieldArray } from "formik";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import moment from "moment";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

const { Panel } = Collapse;
const { Dragger } = Upload;

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */
const isFileLike = (v) => typeof File !== "undefined" && v instanceof File;

const hasAnyFile = (obj) => {
  const walk = (x) => {
    if (isFileLike(x)) return true;
    if (Array.isArray(x)) return x.some(walk);
    if (x && typeof x === "object") return Object.values(x).some(walk);
    return false;
  };
  return walk(obj);
};

const appendFormDataValue = (fd, key, value) => {
  if (value === undefined || value === null) return;

  if (dayjs.isDayjs(value)) {
    fd.append(key, value.format("YYYY-MM-DD"));
    return;
  }

  if (moment.isMoment(value)) {
    fd.append(key, value.format("YYYY-MM-DD"));
    return;
  }

  if (isFileLike(value)) {
    fd.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length && value.every((item) => isFileLike(item))) {
      value.forEach((file) => fd.append(key, file));
      return;
    }

    fd.append(key, JSON.stringify(value));
    return;
  }

  if (typeof value === "object") {
    fd.append(key, JSON.stringify(value));
    return;
  }

  fd.append(key, value);
};

const buildFormData = (values) => {
  const fd = new FormData();

  Object.entries(values || {}).forEach(([k, v]) => {
    appendFormDataValue(fd, k, v);
  });

  return fd;
};

const normalizeOption = (opt) => ({
  id: opt?.id ?? opt?.value,
  value: opt?.value ?? opt?.id,
  label: opt?.label ?? opt?.name ?? String(opt?.value ?? opt?.id ?? ""),
  raw: opt?.raw ?? opt,
});

const getAuthToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ""));

const resolveUrl = (u) => {
  const domain = import.meta.env.VITE_APP_BACKEND_URL || "";
  if (!u) return "";
  return isAbsoluteUrl(u) ? u : `${domain}${u}`;
};

const cleanUrl = (url = "") => String(url || "").replace(/\/+$/, "");

const buildResourceUrl = (baseUrl, id = null) => {
  const cleanBaseUrl = cleanUrl(resolveUrl(baseUrl));

  if (id === null || id === undefined || id === "") {
    return cleanBaseUrl;
  }

  return `${cleanBaseUrl}/${id}`;
};

const getUploadUrlFromValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return resolveUrl(value);

  if (typeof value === "object" && !isFileLike(value)) {
    return resolveUrl(value.url || value.image || value.file || value.path || "");
  }

  return "";
};

const getUploadNameFromValue = (value, fallback = "file") => {
  if (!value) return fallback;

  if (isFileLike(value)) return value.name;

  if (typeof value === "string") {
    return value.split("/").pop() || fallback;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      String(value.url || value.image || value.file || value.path || "")
        .split("/")
        .pop() ||
      fallback
    );
  }

  return fallback;
};

const getSingleUploadFileList = (value, fieldName = "file") => {
  if (!value) return [];

  if (isFileLike(value)) {
    return [
      {
        uid: `${fieldName}-new`,
        name: value.name,
        status: "done",
        originFileObj: value,
      },
    ];
  }

  const url = getUploadUrlFromValue(value);
  if (url) {
    return [
      {
        uid: `${fieldName}-existing`,
        name: getUploadNameFromValue(value, "file"),
        status: "done",
        url,
      },
    ];
  }

  return [];
};

const openUploadPreview = (file) => {
  const src =
    file?.url ||
    file?.thumbUrl ||
    (file?.originFileObj ? URL.createObjectURL(file.originFileObj) : "");

  if (!src) return;

  window.open(src, "_blank", "noopener,noreferrer");
};

const validateUploadFile = ({ file, field, mode = "file" }) => {
  const maxSizeMB = field?.maxSizeMB ?? 5;
  const allowedMimeTypes = field?.allowedMimeTypes || [];
  const accept = field?.accept || "";

  if (mode === "image" && !file.type?.startsWith("image/")) {
    message.error("Only image files are allowed.");
    return Upload.LIST_IGNORE;
  }

  if (allowedMimeTypes.length && !allowedMimeTypes.includes(file.type)) {
    message.error("This file type is not allowed.");
    return Upload.LIST_IGNORE;
  }

  if (accept && !allowedMimeTypes.length && mode !== "image") {
    const acceptList = accept
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    if (acceptList.length) {
      const fileName = String(file.name || "").toLowerCase();
      const mime = String(file.type || "").toLowerCase();

      const accepted = acceptList.some((rule) => {
        if (rule.startsWith(".")) return fileName.endsWith(rule);
        if (rule.endsWith("/*")) return mime.startsWith(rule.replace("/*", "/"));
        return mime === rule;
      });

      if (!accepted) {
        message.error("This file type is not allowed.");
        return Upload.LIST_IGNORE;
      }
    }
  }

  const sizeInMB = file.size / 1024 / 1024;
  if (sizeInMB > maxSizeMB) {
    message.error(`File must be smaller than ${maxSizeMB} MB.`);
    return Upload.LIST_IGNORE;
  }

  return false;
};

const getResponsiveColProps = (field) => ({
  xs: field?.xs ?? 24,
  sm: field?.sm ?? 24,
  md: field?.md ?? field?.col ?? 24,
  lg: field?.lg ?? field?.col ?? 24,
  xl: field?.xl ?? field?.col ?? 24,
});

const appendQueryParams = (url, params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
};

const cleanupQueryParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

const resolveDynamicParams = (rawParams, context = EMPTY_OBJECT) => {
  try {
    const resolved =
      typeof rawParams === "function"
        ? rawParams(
          context.values || EMPTY_OBJECT,
          context.row ?? null,
          context.rowIndex ?? null,
          context.field ?? null,
          context.parentFieldName ?? null
        )
        : rawParams;

    return cleanupQueryParams(resolved || EMPTY_OBJECT);
  } catch (error) {
    console.error("Failed to resolve dynamic FK params:", error);
    return EMPTY_OBJECT;
  }
};

const safeHashGet = () => {
  if (typeof window === "undefined") return "";
  return (window.location.hash || "").replace("#", "").trim();
};

const safeHashSet = (key) => {
  if (typeof window === "undefined") return;
  const next = `#${key}`;
  if (window.location.hash !== next) window.location.hash = next;
};

const isPlainObject = (x) => x && typeof x === "object" && !Array.isArray(x);

const getIn = (obj, path) => {
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

const pathExistsInValues = (values, path) => getIn(values, path) !== undefined;

const flattenDrfErrors = (data, prefix = "", out = []) => {
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

const parseBackendErrors = (err, formValues) => {
  const data = err?.response?.data;

  if (!data) {
    return {
      fieldErrors: {},
      globalErrors: ["Request failed."],
      allErrors: ["Request failed."],
    };
  }

  if (typeof data === "string") {
    return { fieldErrors: {}, globalErrors: [data], allErrors: [data] };
  }

  if (data?.detail) {
    const msg = String(data.detail);
    return { fieldErrors: {}, globalErrors: [msg], allErrors: [msg] };
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

  return { fieldErrors, globalErrors, allErrors };
};

const showGlobalErrorsNotification = (globalErrors) => {
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

const getFkValue = (raw, field) => {
  if (raw === undefined || raw === null || raw === "") return undefined;

  if (typeof raw === "object") {
    return raw?.[field?.fkValueKey || "id"] ?? raw?.id ?? raw?.value;
  }

  return raw;
};

const getFkLabel = (raw, field) => {
  if (!raw || typeof raw !== "object") return null;

  if (typeof field?.fkLabel === "function") return field.fkLabel(raw);

  return (
    raw?.[field?.fkLabelKey || "name"] ??
    raw?.name ??
    raw?.company_name ??
    raw?.person_name ??
    raw?.display_name ??
    raw?.code ??
    raw?.title ??
    raw?.label ??
    null
  );
};

const getFkLabelFromValues = (values, field) => {
  if (!field?.name) return null;

  const raw = values?.[field.name];
  const detail = values?.[`${field.name}_detail`];

  return (
    values?.[field.labelField] ||
    getFkLabel(raw, field) ||
    getFkLabel(detail, field) ||
    detail?.[field?.fkLabelKey || "name"] ||
    detail?.name ||
    detail?.company_name ||
    detail?.person_name ||
    detail?.display_name ||
    detail?.code ||
    detail?.title ||
    detail?.label ||
    null
  );
};

const isSameValue = (a, b) => {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
  }

  if (dayjs.isDayjs(a) && dayjs.isDayjs(b)) return a.isSame(b);
  if (moment.isMoment(a) && moment.isMoment(b)) return a.isSame(b);

  if (a === b) return true;

  if ((a && typeof a === "object") || (b && typeof b === "object")) return false;

  return String(a) === String(b);
};

const isPrimitiveOrMoment = (v) =>
  v == null ||
  typeof v === "string" ||
  typeof v === "number" ||
  typeof v === "boolean" ||
  moment.isMoment(v) ||
  dayjs.isDayjs(v);

const toOrderingValue = (field, order, orderingMinusForDesc = true) => {
  if (!field || !order) return "";
  if (order === "ascend") return field;
  if (order === "descend") return orderingMinusForDesc ? `-${field}` : field;
  return "";
};

const toAutoCompleteOptions = (rows, field) =>
  (rows || []).map((row) => {
    const value = row?.[field?.fkValueKey || "id"] ?? row?.id ?? row?.value;
    const label =
      typeof field?.fkLabel === "function"
        ? field.fkLabel(row)
        : row?.[field?.fkLabelKey || "name"] ??
        row?.name ??
        row?.company_name ??
        row?.person_name ??
        row?.display_name ??
        row?.code ??
        row?.title ??
        String(value ?? "");

    return {
      value,
      label,
      raw: row,
    };
  });

/* -------------------------------------------------------------------------- */
/*                              anchor filter tabs                            */
/* -------------------------------------------------------------------------- */
function AnchorFilterTabs({ items = EMPTY_ARRAY, activeKey, onChange, leftTitle, rightNode }) {
  const activeItem = items.find((x) => x.key === activeKey);

  return (
    <div
      className="bg-white"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        padding: "10px 10px",
        borderBottom: "1px solid #eef0f4",

      }}
    >
      <div style={{ fontSize: 18, fontWeight: 650, color: "#0f172a" }}>
        {activeItem?.title || leftTitle || ""}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 26, marginLeft: 24 }}>
        {items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange?.(it.key)}
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                padding: "0px 4px",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#0f172a" : "#64748b",
                position: "relative",
              }}
            >
              {it.label}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -13,
                    height: 4,
                    background: '#04a94a',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {rightNode ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{rightNode}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             stable date picker                             */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                              backend autocomplete                          */
/* -------------------------------------------------------------------------- */
function BackendAutocomplete({
  field,
  value,
  detailValue,
  disabled,
  authHeaders,
  onValueChange,
  onDetailChange,
  placeholder,
  valuesContext = EMPTY_OBJECT,
  rowContext = null,
  rowIndex = null,
  parentFieldName = null,
}) {
  const [options, setOptions] = useState(EMPTY_ARRAY);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const resolvedExtraParams = useMemo(
    () =>
      resolveDynamicParams(field?.fkExtraParams, {
        values: valuesContext,
        row: rowContext,
        rowIndex,
        field,
        parentFieldName,
      }),
    [field, valuesContext, rowContext, rowIndex, parentFieldName]
  );

  const fetchRows = useCallback(
    async (search = "", ensureOption = null) => {
      if (!field?.fkUrl) return;

      const url = appendQueryParams(resolveUrl(field.fkUrl), {
        [field.fkPageParam ?? "page"]: 1,
        [field.fkPageSizeParam ?? "page_size"]: field.fkPageSize ?? 20,
        ...(field.fkSearchParam ? { [field.fkSearchParam]: search } : { search }),
        ...(resolvedExtraParams || EMPTY_OBJECT),
      });

      try {
        setLoading(true);
        const res = await axios.get(url, { headers: authHeaders });
        const payload = res?.data;
        const rows = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : EMPTY_ARRAY;

        let opts = toAutoCompleteOptions(rows, field);

        if (ensureOption) {
          const exists = opts.some((x) => String(x.value) === String(ensureOption.value));
          if (!exists) opts = [ensureOption, ...opts];
        }

        setOptions(opts);
      } catch (e) {
        setOptions(ensureOption ? [ensureOption] : EMPTY_ARRAY);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, field, resolvedExtraParams]
  );

  const currentId = getFkValue(value, field);
  const currentLabel =
    getFkLabel(detailValue, field) ||
    getFkLabel(value, field) ||
    (typeof value === "string" || typeof value === "number" ? String(value) : "");

  useEffect(() => {
    if (currentId && currentLabel) {
      setSearchText(currentLabel);
    } else if (!currentId) {
      setSearchText("");
    }
  }, [currentId, currentLabel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AutoComplete
      value={searchText}
      options={options.map((o) => ({
        value: String(o.value),
        label: o.label,
      }))}
      disabled={disabled}
      style={{ width: "100%" }}
      placeholder={placeholder || "Search..."}
      onFocus={() => {
        if (!options.length) {
          fetchRows(
            "",
            currentId
              ? { value: String(currentId), label: currentLabel, raw: detailValue || value }
              : null
          );
        }
      }}
      onSearch={(txt) => {
        setSearchText(txt);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          fetchRows(txt || "");
        }, 350);
      }}
      onSelect={(selectedValue) => {
        const picked = options.find((x) => String(x.value) === String(selectedValue));
        onValueChange?.(picked?.value ?? selectedValue);
        onDetailChange?.(picked?.raw ?? null);
        setSearchText(picked?.label ?? String(selectedValue));
      }}
      onChange={(txt) => {
        setSearchText(txt);
        if (!txt) {
          onValueChange?.(null);
          onDetailChange?.(null);
        }
      }}
      notFoundContent={loading ? "Loading..." : "No results"}
      allowClear
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                            transfer with search                            */
/* -------------------------------------------------------------------------- */
function CrudTransfer({
  field,
  value,
  disabled,
  authHeaders,
  onChange,
  onDetailChange,
  valuesContext = EMPTY_OBJECT,
  rowContext = null,
  rowIndex = null,
  parentFieldName = null,
}) {
  const [dataSource, setDataSource] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [scanValue, setScanValue] = useState("");

  const scanInputRef = useRef(null);

  const scannerEnabled = !!field?.enableScanner;
  const scannerKeys = useMemo(
    () =>
      Array.isArray(field?.scannerKeys) && field.scannerKeys.length
        ? field.scannerKeys
        : ["barcode", "hu_code", "code", "id"],
    [field]
  );

  const scannerSubmitKeys = useMemo(
    () =>
      new Set(
        Array.isArray(field?.scannerSubmitKeys) && field.scannerSubmitKeys.length
          ? field.scannerSubmitKeys
          : ["Enter", "Tab"]
      ),
    [field]
  );

  const scannerCaseSensitive = !!field?.scannerCaseSensitive;
  const scannerAutofocus = field?.scannerAutofocus ?? true;
  const scannerAllowContainsMatch = field?.scannerAllowContainsMatch ?? false;
  const scannerAllowMultipleMatches = field?.scannerAllowMultipleMatches ?? false;
  const scannerMode = field?.scannerMode || "append";
  const hasTableColumns = Array.isArray(field?.columns) && field.columns.length > 0;

  const resolvedExtraParams = useMemo(
    () =>
      resolveDynamicParams(field?.fkExtraParams, {
        values: valuesContext,
        row: rowContext,
        rowIndex,
        field,
        parentFieldName,
      }),
    [field, valuesContext, rowContext, rowIndex, parentFieldName]
  );

  const extractTransferRows = useCallback((payload) => {
    if (Array.isArray(payload)) {
      return {
        rows: payload,
        isPaginated: false,
        next: null,
        total: payload.length,
      };
    }

    if (!payload || typeof payload !== "object") {
      return {
        rows: EMPTY_ARRAY,
        isPaginated: false,
        next: null,
        total: 0,
      };
    }

    if (Array.isArray(payload.results)) {
      return {
        rows: payload.results,
        isPaginated: true,
        next: payload.next || null,
        total: Number(payload.count || 0),
      };
    }

    if (Array.isArray(payload.data)) {
      return {
        rows: payload.data,
        isPaginated: false,
        next: null,
        total: payload.data.length,
      };
    }

    if (Array.isArray(payload.items)) {
      return {
        rows: payload.items,
        isPaginated: false,
        next: null,
        total: payload.items.length,
      };
    }

    if (Array.isArray(payload.rows)) {
      return {
        rows: payload.rows,
        isPaginated: false,
        next: null,
        total: payload.rows.length,
      };
    }

    return {
      rows: [payload],
      isPaginated: false,
      next: null,
      total: 1,
    };
  }, []);

  const targetKeys = useMemo(() => {
    if (!Array.isArray(value)) return EMPTY_ARRAY;

    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return String(
            item?.[field?.fkValueKey || field?.transferValueKey || "id"] ??
            item?.id ??
            item?.value ??
            ""
          );
        }
        return String(item ?? "");
      })
      .filter(Boolean);
  }, [value, field]);

  const castKeyBack = useCallback(
    (key) => {
      if (field?.transferValueType === "number") {
        const n = Number(key);
        return Number.isNaN(n) ? key : n;
      }
      return key;
    },
    [field]
  );

  const toTransferItems = useCallback(
    (rows) =>
      (rows || []).map((row) => {
        const valueKey = field?.fkValueKey || field?.transferValueKey || "id";
        const labelKey = field?.fkLabelKey || field?.transferLabelKey || "name";

        const key = String(row?.[valueKey] ?? row?.id ?? row?.value ?? "");
        const title =
          typeof field?.fkLabel === "function"
            ? field.fkLabel(row)
            : row?.[labelKey] ??
            row?.name ??
            row?.display_name ??
            row?.company_name ??
            row?.person_name ??
            row?.code ??
            row?.hu_code ??
            row?.title ??
            row?.label ??
            key;

        return {
          key,
          title,
          description: title,
          disabled: !!row?.disabled,
          raw: row,
          ...row,
        };
      }),
    [field]
  );

  const dedupeTransferItems = useCallback((items) => {
    const map = new Map();

    (items || []).forEach((item) => {
      const key = String(item?.key ?? "");
      if (!key) return;
      if (!map.has(key)) map.set(key, item);
    });

    return Array.from(map.values());
  }, []);

  const matchesTransferSearch = useCallback((item, inputValue) => {
    const q = String(inputValue || "").trim().toLowerCase();
    if (!q) return true;

    const raw = item?.raw || item || {};

    const haystack = [
      item?.title,
      item?.description,
      raw?.name,
      raw?.display_name,
      raw?.company_name,
      raw?.person_name,
      raw?.code,
      raw?.title,
      raw?.label,
      raw?.hu_code,
      raw?.barcode,
      raw?.status,
      raw?.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  }, []);

  const normalizeScanText = useCallback(
    (val) => {
      let text = String(val ?? "").trim();
      if (!scannerCaseSensitive) text = text.toLowerCase();
      return text;
    },
    [scannerCaseSensitive]
  );

  const loadTransferData = useCallback(async () => {
    if (Array.isArray(field?.options) && field.options.length > 0) {
      const localItems = field.options.map((opt) => {
        const normalized = normalizeOption(opt);
        return {
          key: String(normalized.value),
          title: normalized.label,
          description: normalized.label,
          raw: normalized.raw,
          ...(normalized.raw || {}),
        };
      });

      setDataSource(dedupeTransferItems(localItems));
      return;
    }

    const lookupUrl = field?.transferUrl || field?.fkUrl;
    if (!lookupUrl) {
      setDataSource(EMPTY_ARRAY);
      return;
    }

    const fkPageParam = field?.fkPageParam ?? "page";
    const fkPageSizeParam = field?.fkPageSizeParam ?? "page_size";
    const fkPageSize = field?.transferFetchPageSize ?? field?.fkPageSize ?? 100;
    const maxPages = field?.transferMaxPages ?? 100;

    let pageCount = 0;
    let allRows = [];
    let nextUrl = appendQueryParams(resolveUrl(lookupUrl), {
      [fkPageParam]: 1,
      [fkPageSizeParam]: fkPageSize,
      ...(resolvedExtraParams || EMPTY_OBJECT),
    });

    try {
      setLoading(true);

      while (nextUrl && pageCount < maxPages) {
        const res = await axios.get(nextUrl, { headers: authHeaders });
        const payload = res?.data;

        const { rows, isPaginated, next } = extractTransferRows(payload);
        allRows = [...allRows, ...(rows || EMPTY_ARRAY)];

        if (!isPaginated) break;

        nextUrl = next ? resolveUrl(next) : null;
        pageCount += 1;
      }

      const items = toTransferItems(allRows);
      setDataSource(dedupeTransferItems(items));
    } catch (err) {
      console.error("Failed to load transfer options:", err);
      message.error(field?.transferLoadErrorMessage || "Failed to load transfer options");
      setDataSource(EMPTY_ARRAY);
    } finally {
      setLoading(false);
    }
  }, [
    field,
    authHeaders,
    extractTransferRows,
    toTransferItems,
    dedupeTransferItems,
    resolvedExtraParams,
  ]);

  useEffect(() => {
    loadTransferData();
  }, [loadTransferData]);

  useEffect(() => {
    if (scannerEnabled && scannerAutofocus && !loading) {
      const timer = setTimeout(() => {
        scanInputRef.current?.focus?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [scannerEnabled, scannerAutofocus, loading]);

  const mergedDataSource = useMemo(() => {
    const selectedMissing = targetKeys
      .filter((k) => !dataSource.some((item) => item.key === k))
      .map((k) => ({
        key: k,
        title: k,
        description: k,
        raw: { id: k },
        id: k,
      }));

    return dedupeTransferItems([...selectedMissing, ...dataSource]);
  }, [dataSource, targetKeys, dedupeTransferItems]);

  const commitTargetKeys = useCallback(
    (nextTargetKeys) => {
      const dedupedKeys = Array.from(
        new Set((nextTargetKeys || []).map((x) => String(x)).filter(Boolean))
      );

      const finalValues = dedupedKeys.map(castKeyBack);
      onChange?.(finalValues);

      if (typeof onDetailChange === "function") {
        const nextKeySet = new Set(dedupedKeys);
        const details = mergedDataSource
          .filter((item) => nextKeySet.has(item.key))
          .map((item) => item.raw || item);
        onDetailChange(details);
      }
    },
    [castKeyBack, onChange, onDetailChange, mergedDataSource]
  );

  const addKeys = useCallback(
    (keysToAdd) => {
      const next = Array.from(
        new Set([...targetKeys, ...(keysToAdd || []).map((x) => String(x)).filter(Boolean)])
      );
      commitTargetKeys(next);
    },
    [targetKeys, commitTargetKeys]
  );

  const removeKeys = useCallback(
    (keysToRemove) => {
      const removeSet = new Set((keysToRemove || []).map((x) => String(x)).filter(Boolean));
      const next = targetKeys.filter((key) => !removeSet.has(String(key)));
      commitTargetKeys(next);
    },
    [targetKeys, commitTargetKeys]
  );

  const getScannerCandidateValues = useCallback(
    (item) => {
      const raw = item?.raw || item || {};

      const values = scannerKeys.flatMap((key) => {
        const v = raw?.[key];
        if (Array.isArray(v)) return v.map((x) => normalizeScanText(x)).filter(Boolean);
        return [normalizeScanText(v)].filter(Boolean);
      });

      return Array.from(new Set(values));
    },
    [scannerKeys, normalizeScanText]
  );

  const handleScan = useCallback(
    (incoming) => {
      const scannedText = String(incoming ?? "").trim();
      const normalizedScan = normalizeScanText(scannedText);

      if (!normalizedScan) return;

      const exactMatches = mergedDataSource.filter((item) =>
        getScannerCandidateValues(item).includes(normalizedScan)
      );

      let matches = exactMatches;

      if (!matches.length && scannerAllowContainsMatch) {
        matches = mergedDataSource.filter((item) =>
          getScannerCandidateValues(item).some(
            (candidate) =>
              candidate.includes(normalizedScan) || normalizedScan.includes(candidate)
          )
        );
      }

      if (!matches.length) {
        message.warning(`No match found for scan: ${scannedText}`);
        setScanValue("");
        if (scannerAutofocus) setTimeout(() => scanInputRef.current?.focus?.(), 0);
        return;
      }

      if (matches.length > 1 && !scannerAllowMultipleMatches) {
        message.warning(
          `Multiple matches found for scan: ${scannedText}. Use a unique barcode or code.`
        );
        setScanValue("");
        if (scannerAutofocus) setTimeout(() => scanInputRef.current?.focus?.(), 0);
        return;
      }

      const matchedKeys = matches.map((item) => item.key);

      let nextTargetKeys = targetKeys;

      if (scannerMode === "replace") {
        nextTargetKeys = matchedKeys;
      } else if (scannerMode === "toggle") {
        const currentSet = new Set(targetKeys);
        matchedKeys.forEach((key) => {
          if (currentSet.has(key)) currentSet.delete(key);
          else currentSet.add(key);
        });
        nextTargetKeys = Array.from(currentSet);
      } else {
        nextTargetKeys = Array.from(new Set([...targetKeys, ...matchedKeys]));
      }

      commitTargetKeys(nextTargetKeys);

      if (matches.length === 1) message.success(`Scanned: ${matches[0]?.title}`);
      else message.success(`Scanned ${matches.length} matching items`);

      setScanValue("");
      if (scannerAutofocus) setTimeout(() => scanInputRef.current?.focus?.(), 0);
    },
    [
      mergedDataSource,
      getScannerCandidateValues,
      normalizeScanText,
      scannerAllowContainsMatch,
      scannerAllowMultipleMatches,
      scannerMode,
      targetKeys,
      commitTargetKeys,
      scannerAutofocus,
    ]
  );

  const targetKeySet = useMemo(() => new Set(targetKeys), [targetKeys]);

  const leftItems = useMemo(
    () => mergedDataSource.filter((item) => !targetKeySet.has(item.key)),
    [mergedDataSource, targetKeySet]
  );

  const rightItems = useMemo(
    () => mergedDataSource.filter((item) => targetKeySet.has(item.key)),
    [mergedDataSource, targetKeySet]
  );

  const filteredLeftItems = useMemo(
    () => leftItems.filter((item) => matchesTransferSearch(item, leftSearch)),
    [leftItems, leftSearch, matchesTransferSearch]
  );

  const filteredRightItems = useMemo(
    () => rightItems.filter((item) => matchesTransferSearch(item, rightSearch)),
    [rightItems, rightSearch, matchesTransferSearch]
  );

  const buildTransferColumns = useCallback(
    (cols = EMPTY_ARRAY) =>
      cols.map((col) => ({
        ...col,
        ellipsis: col?.ellipsis ?? true,
        render:
          typeof col?.render === "function"
            ? (value, record, index) => col.render(value, record?.raw || record, index)
            : col?.render,
      })),
    []
  );

  const leftColumns = useMemo(
    () => buildTransferColumns(field?.leftColumns || field?.columns || EMPTY_ARRAY),
    [field, buildTransferColumns]
  );

  const rightColumns = useMemo(
    () => buildTransferColumns(field?.rightColumns || field?.columns || EMPTY_ARRAY),
    [field, buildTransferColumns]
  );

  const renderTableTransfer = () => (
    <Transfer
      dataSource={mergedDataSource}
      targetKeys={targetKeys}
      disabled={disabled}
      showSearch={field?.showSearch ?? true}
      showSelectAll={field?.showSelectAll ?? false}
      oneWay={field?.oneWay ?? false}
      titles={field?.titles || ["Available", "Selected"]}
      filterOption={(inputValue, item) => matchesTransferSearch(item, inputValue)}
      onSearch={(direction, searchValue) => {
        if (direction === "left") setLeftSearch(searchValue);
        if (direction === "right") setRightSearch(searchValue);
      }}
      onChange={(nextTargetKeys) => {
        commitTargetKeys(nextTargetKeys);
      }}
      style={{ width: "100%" }}

      locale={{
        itemUnit: field?.itemUnit || "item",
        itemsUnit: field?.itemsUnit || "items",
        searchPlaceholder: field?.searchPlaceholder || "Search here",
        notFoundContent: loading ? "Loading..." : "No data",
      }}
    >
      {({
        direction,
        filteredItems,
        onItemSelect,
        onItemSelectAll,
        selectedKeys: listSelectedKeys,
        disabled: listDisabled,
      }) => {
        const columns = direction === "left" ? leftColumns : rightColumns;

        const rowSelection = {
          getCheckboxProps: (item) => ({
            disabled: listDisabled || !!item?.disabled,
          }),
          onChange(selectedRowKeys) {
            onItemSelectAll(selectedRowKeys, "replace");
          },
          selectedRowKeys: listSelectedKeys,
          selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
          ],
        };

        return (
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={filteredItems}
            rowSelection={rowSelection}
            sticky
            scroll={{ x: "max-content", y: field?.listHeight ?? 420 }}
            style={{ pointerEvents: listDisabled ? "none" : undefined }}
            onRow={(record) => ({
              onClick: () => {
                if (record?.disabled || listDisabled) return;
                onItemSelect(record.key, !listSelectedKeys.includes(record.key));
              },
            })}
          />
        );
      }}
    </Transfer>
  );

  return (
    <div className="w-100">
      {scannerEnabled ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input
              ref={scanInputRef}
              value={scanValue}
              disabled={disabled || loading}
              placeholder={field?.scannerPlaceholder || "Scan barcode / HU code and press Enter"}
              style={{ width: 320 }}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (scannerSubmitKeys.has(e.key)) {
                  e.preventDefault();
                  handleScan(scanValue);
                }
              }}
            />

            <Button
              disabled={disabled || loading || !String(scanValue || "").trim()}
              onClick={() => handleScan(scanValue)}
            >
              Scan
            </Button>

            <Button disabled={disabled || loading} onClick={() => scanInputRef.current?.focus?.()}>
              Focus Scanner
            </Button>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#8c8c8c" }}>
            Scanner keys: {scannerKeys.join(", ")}
          </div>
        </div>
      ) : null}

      {field?.showBulkActions !== false ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="small"
              disabled={disabled || filteredLeftItems.length === 0}
              onClick={() => addKeys(filteredLeftItems.map((item) => item.key))}
            >
              Select filtered ({filteredLeftItems.length})
            </Button>

            <Button
              size="small"
              disabled={disabled || leftItems.length === 0}
              onClick={() => addKeys(leftItems.map((item) => item.key))}
            >
              Select all loaded ({leftItems.length})
            </Button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="small"
              disabled={disabled || filteredRightItems.length === 0}
              onClick={() => removeKeys(filteredRightItems.map((item) => item.key))}
            >
              Remove filtered ({filteredRightItems.length})
            </Button>

            <Button
              size="small"
              danger
              disabled={disabled || targetKeys.length === 0}
              onClick={() => commitTargetKeys(EMPTY_ARRAY)}
            >
              Clear all ({targetKeys.length})
            </Button>
          </div>
        </div>
      ) : null}

      {hasTableColumns ? (
        renderTableTransfer()
      ) : (
        <Transfer
          width="100%"
          style={{ width: "100%" }}
          dataSource={mergedDataSource}
          targetKeys={targetKeys}
          disabled={disabled}
          showSearch={field?.showSearch ?? true}
          oneWay={field?.oneWay ?? false}
          titles={field?.titles || ["Available", "Selected"]}
          pagination={
            field?.pagination === false
              ? false
              : {
                pageSize: field?.transferPageSize ?? 10000,
                simple: true,
                showSizeChanger: false,
              }
          }
          listStyle={{
            width: field?.listWidth ?? 1000,
            height: field?.listHeight ?? 420,
          }}
          render={(item) => item.title}
          filterOption={(inputValue, item) => matchesTransferSearch(item, inputValue)}
          onSearch={(direction, searchValue) => {
            if (direction === "left") setLeftSearch(searchValue);
            if (direction === "right") setRightSearch(searchValue);
          }}
          onChange={(nextTargetKeys) => {
            commitTargetKeys(nextTargetKeys);
          }}
          locale={{
            itemUnit: field?.itemUnit || "item",
            itemsUnit: field?.itemsUnit || "items",
            searchPlaceholder: field?.searchPlaceholder || "Search here",
            notFoundContent: loading ? "Loading..." : "No data",
          }}
        />
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
        {loading
          ? "Loading transfer options..."
          : `Loaded: ${mergedDataSource.length} | Available: ${leftItems.length} | Selected: ${rightItems.length}`}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              form inner wrapper                            */
/* -------------------------------------------------------------------------- */
function CrudFormInner({
  fields,
  values,
  setFieldValue,
  errors,
  touched,
  ui_type,
  handleSubmit,
  onFormValuesChange,
  submitLabel = "Save",
  renderFormFields,
  hideSubmitButton = false,
  submitErrors = EMPTY_ARRAY,
  onSubmitButtonClick = null,
  renderSubmitButton = null,
  submitMeta = EMPTY_OBJECT,
  hydrateFkLabels = null,
}) {
  const walkFields = useCallback((fs, cb) => {
    (fs || []).forEach((f) => {
      if (f?.type === "group" && Array.isArray(f.children)) walkFields(f.children, cb);
      else cb(f);
    });
  }, []);

  const formulaCacheRef = useRef(new Map());
  const fkHydrationRef = useRef({});

  useEffect(() => {
    if (typeof onFormValuesChange === "function") {
      onFormValuesChange(values, { setFieldValue });
    }
  }, [values, onFormValuesChange, setFieldValue]);

  useEffect(() => {
    if (typeof hydrateFkLabels !== "function") return;

    walkFields(fields, (field) => {
      if (field?.type !== "fkSelect" || !field?.name) return;

      const currentValue = values?.[field.name];
      const currentId = getFkValue(currentValue, field);
      const currentLabel = getFkLabelFromValues(values, field);

      if (currentId == null || currentLabel) return;

      const cacheKey = `${field.name}:${currentId}`;
      if (fkHydrationRef.current[cacheKey]) return;

      fkHydrationRef.current[cacheKey] = true;
      Promise.resolve(hydrateFkLabels(field.name, currentValue, values)).catch(() => {
        fkHydrationRef.current[cacheKey] = false;
      });
    });
  }, [values, fields, walkFields, hydrateFkLabels]);

  useEffect(() => {
    walkFields(fields, (field) => {
      if (typeof field?.formula !== "function" || !field?.name) return;

      const nextVal = field.formula(values);
      if (!isPrimitiveOrMoment(nextVal)) return;

      const currentVal = values?.[field.name];
      const lastApplied = formulaCacheRef.current.get(field.name);

      const changedVsCurrent = !isSameValue(nextVal, currentVal);
      const changedVsLast = !isSameValue(nextVal, lastApplied);

      if (changedVsCurrent && changedVsLast) {
        formulaCacheRef.current.set(field.name, nextVal);
        setFieldValue(field.name, nextVal, false);
      }
    });
  }, [values, fields, setFieldValue, walkFields]);

  return (
    <FormikForm
      onSubmit={handleSubmit}
      className={`${ui_type === "add form" || ui_type === "edit form" ? "bg-null" : ""}`}
    >      {renderFormFields(values, setFieldValue, errors, touched)}

      {submitErrors?.length > 0 && (
        <div style={{ marginTop: 12 }} className={`${ui_type == "add form" || ui_type == "edit form" ? "bg-null" : ""}`}>
          <div style={{ padding: 10, border: "1px solid #ffccc7", }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Please fix these errors:</div>
            {submitErrors.map((e, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {e}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideSubmitButton &&
        (typeof renderSubmitButton === "function" ? (
          <div style={{ marginTop: 16 }}>{renderSubmitButton(submitMeta)}</div>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Button
              type="primary"
              htmlType={typeof onSubmitButtonClick === "function" ? "button" : "submit"}
              onClick={
                typeof onSubmitButtonClick === "function"
                  ? () => onSubmitButtonClick(submitMeta)
                  : undefined
              }
              disabled={submitMeta?.isValid === false || !!submitMeta?.isSubmitting}
              loading={!!submitMeta?.isSubmitting}
              style={{ minWidth: 140 }}
            >
              {submitLabel}
            </Button>
          </div>
        ))}
    </FormikForm>
  );
}

/* -------------------------------------------------------------------------- */
/*                              main reusable crud                            */
/* -------------------------------------------------------------------------- */
export default function ReusableCrud({
  apiUrl,
  title,
  fields = EMPTY_ARRAY,
  columns = EMPTY_ARRAY,
  validationSchema,
  bulkactions = EMPTY_ARRAY,
  singleactions = EMPTY_ARRAY,
  ui_type,
  modalStyle,
  handleAddedData,
  onAddSuccess = null,
  onEditSuccess = null,
  filterUrl,
  rowMenu,
  activeTableRowFunction,
  crudInitialValues = EMPTY_OBJECT,
  showSearch = true,
  modalWidth = 700,
  hasActions = true,
  showRowActionMenu = true,
  custom_add = false,
  custom_add_link = null,
  canView = true,
  canEdit = true,
  canAdd = true,
  hasActionColumns = true,
  canDelete = true,
  showViewColumn = false,
  viewPathBuilder = null,

  searchFields = EMPTY_ARRAY,

  button_ui = false,
  button_ui_id = null,

  look_up_var = null,

  onFormValuesChange,
  hideSubmitButton = false,
  submitLabelOverride = null,
  onSubmitButtonClick = null,
  renderSubmitButton = null,

  form_ui = "modal",
  drawerWidth = 1200,
  openOnMount = false,
  openMode = "add",
  openEditId = null,

  enableServerPagination = true,
  pageParam = "page",
  pageSizeParam = "page_size",
  searchParam = "search",

  activeParam = "active",
  enableInactiveDrawer = true,

  anchorFilters = EMPTY_ARRAY,
  defaultAnchorKey = null,
  anchorSyncWithHash = true,
  anchorParamResolver = null,
  onAnchorChange = null,

  transformPayload = null,
  beforeCreatePayload = null,
  beforeUpdatePayload = null,

  baseFilters = EMPTY_OBJECT,
  sortMode = "ordering",
  orderingParam = "ordering",
  sortFieldParam = "sort_by",
  sortOrderParam = "sort_order",
  defaultSortField = null,
  defaultSortOrder = null,
  orderingMinusForDesc = true,
}) {
  const [data, setData] = useState(EMPTY_ARRAY);
  const [inactiveRows, setInactiveRows] = useState(EMPTY_ARRAY);
  const [visible, setVisible] = useState(false);
  const [inactiveDrawer, setInactiveDrawer] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState(EMPTY_ARRAY);
  const [selectedInactiveRowKeys, setSelectedInactiveRowKeys] = useState(EMPTY_ARRAY);
  const [searchText, setSearchText] = useState("");
  const [inactiveSearchText, setInactiveSearchText] = useState("");
  const [viewActive, setViewActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  const [serverPaginated, setServerPaginated] = useState(false);
  const [submitErrors, setSubmitErrors] = useState(EMPTY_ARRAY);

  const [columnFilters, setColumnFilters] = useState(EMPTY_OBJECT);
  const [objectArrayExpandedRows, setObjectArrayExpandedRows] = useState(EMPTY_OBJECT);

  const initialSort = useMemo(() => {
    if (sortMode === "ordering") {
      const ordering = defaultSortField
        ? toOrderingValue(defaultSortField, defaultSortOrder, orderingMinusForDesc)
        : "";
      return {
        field: defaultSortField,
        order: defaultSortOrder,
        ordering,
      };
    }

    return {
      field: defaultSortField,
      order: defaultSortOrder,
      ordering: "",
    };
  }, [defaultSortField, defaultSortOrder, sortMode, orderingMinusForDesc]);

  const [sortState, setSortState] = useState(initialSort);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [inactivePagination, setInactivePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const hasAnchors = Array.isArray(anchorFilters) && anchorFilters.length > 0;

  const initialAnchorKey = useMemo(() => {
    const first = anchorFilters?.[0]?.key;
    const desiredDefault = defaultAnchorKey || first;

    if (!anchorSyncWithHash) return desiredDefault;

    const fromHash = safeHashGet();
    const exists = anchorFilters?.some((x) => x.key === fromHash);
    return exists ? fromHash : desiredDefault;
  }, [anchorFilters, defaultAnchorKey, anchorSyncWithHash]);

  const [activeAnchorKey, setActiveAnchorKey] = useState(initialAnchorKey);

  useEffect(() => {
    if (!anchorSyncWithHash || typeof window === "undefined") return;

    const onHash = () => {
      const h = safeHashGet();
      if (!h) return;
      const exists = anchorFilters?.some((x) => x.key === h);
      if (exists) setActiveAnchorKey(h);
    };

    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [anchorSyncWithHash, anchorFilters]);

  const activeAnchorItem = useMemo(
    () => anchorFilters.find((x) => x.key === activeAnchorKey),
    [anchorFilters, activeAnchorKey]
  );

  const anchorParams = useMemo(() => {
    if (!hasAnchors) return EMPTY_OBJECT;
    if (typeof anchorParamResolver === "function") {
      return anchorParamResolver(activeAnchorKey, activeAnchorItem) || EMPTY_OBJECT;
    }
    return activeAnchorItem?.params || EMPTY_OBJECT;
  }, [hasAnchors, anchorParamResolver, activeAnchorKey, activeAnchorItem]);

  const accessToken = getAuthToken();
  const [formInitialValues, setFormInitialValues] = useState(crudInitialValues || EMPTY_OBJECT);

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : EMPTY_OBJECT),
    [accessToken]
  );

  const baseUrl = useMemo(() => {
    const cleanApiUrl = cleanUrl(apiUrl);

    if (!filterUrl) return cleanApiUrl;

    if (String(filterUrl).startsWith("?")) {
      return `${cleanApiUrl}${filterUrl}`;
    }

    return `${cleanApiUrl}/${String(filterUrl).replace(/^\/+/, "")}`;
  }, [apiUrl, filterUrl]);

  const flattenFields = useCallback((arr, out = []) => {
    (arr || []).forEach((f) => {
      if (!f) return;
      if (f.type === "group" && Array.isArray(f.children)) flattenFields(f.children, out);
      else out.push(f);
    });
    return out;
  }, []);

  const fieldByName = useMemo(() => {
    const map = {};
    flattenFields(fields).forEach((f) => {
      if (f?.name) map[f.name] = f;
    });
    return map;
  }, [fields, flattenFields]);

  const normalizeFkValuesForSubmit = useCallback(
    (inputValues) => {
      const next = { ...(inputValues || EMPTY_OBJECT) };

      flattenFields(fields).forEach((field) => {
        if (!field?.name) return;

        if (field.type === "fkSelect" || field.type === "autocomplete") {
          const raw = next[field.name];
          if (raw && typeof raw === "object") {
            next[field.name] = getFkValue(raw, field);
          }
        }

        if (field.type === "objectArray" && Array.isArray(next[field.name])) {
          next[field.name] = next[field.name].map((row) => {
            const rowCopy = { ...(row || EMPTY_OBJECT) };
            const rowFields = [...(field.columns || EMPTY_ARRAY), ...(field.collapsedFields || EMPTY_ARRAY)];

            rowFields.forEach((col) => {
              const colKey = col.key ?? col.name;
              if (!colKey) return;

              if (
                (col.type === "fkSelect" || col.type === "autocomplete") &&
                rowCopy[colKey] &&
                typeof rowCopy[colKey] === "object"
              ) {
                rowCopy[colKey] = getFkValue(rowCopy[colKey], col);
              }
            });

            return rowCopy;
          });
        }
      });

      return next;
    },
    [fields, flattenFields]
  );

  const sanitizeBulkActionRecord = useCallback(
    (record) => {
      const cleaned = { ...(record || EMPTY_OBJECT) };

      delete cleaned.key;
      delete cleaned.fk_detail;

      Object.keys(cleaned).forEach((k) => {
        if (k.endsWith("_detail")) delete cleaned[k];
      });

      return normalizeFkValuesForSubmit(cleaned);
    },
    [normalizeFkValuesForSubmit]
  );

  const formikLiveRef = useRef({ setFieldValue: null, values: null });
  const [fkStore, setFkStore] = useState(EMPTY_OBJECT);
  const fkTimersRef = useRef(EMPTY_OBJECT);

  const toFkOption = (row, field) => {
    const valueKey = field?.fkValueKey || "id";
    const labelKey = field?.fkLabelKey || "name";
    const value = row?.[valueKey] ?? row?.id ?? row?.value;
    const label =
      typeof field?.fkLabel === "function"
        ? field.fkLabel(row)
        : row?.[labelKey] ??
        row?.name ??
        row?.company_name ??
        row?.person_name ??
        row?.display_name ??
        row?.code ??
        row?.label ??
        row?.title ??
        String(value ?? "");

    return { value, label, raw: row };
  };

  const upsertOption = (list, opt) => {
    if (!opt) return list || EMPTY_ARRAY;
    const value = opt.value ?? opt.id;
    const label = opt.label ?? opt.name ?? String(value ?? "");
    const normalized = { value, label, raw: opt.raw ?? opt };
    const exists = (list || EMPTY_ARRAY).some((x) => String(x.value) === String(value));
    return exists ? (list || EMPTY_ARRAY) : [normalized, ...(list || EMPTY_ARRAY)];
  };

  const fetchFkOptionById = useCallback(
    async (fieldName, id) => {
      const field = fieldByName[fieldName];
      if (!field?.fkUrl || id == null || id === "") return null;

      try {
       const detailUrl = buildResourceUrl(field.fkUrl, id);
        const res = await axios.get(detailUrl, { headers: authHeaders });
        return toFkOption(res?.data, field);
      } catch (error) {
        return null;
      }
    },
    [fieldByName, authHeaders]
  );

  const hydrateMissingFkLabel = useCallback(
    async (fieldName, rawValue, valuesOverride = null) => {
      const field = fieldByName[fieldName];
      if (!field || field.type !== "fkSelect") return null;

      const finalId = getFkValue(rawValue, field);
      if (finalId == null || finalId === "") return null;

      const liveValues = valuesOverride || formikLiveRef.current?.values || EMPTY_OBJECT;
      const existingLabel = getFkLabelFromValues(liveValues, field);
      const existingDetail = liveValues?.[`${fieldName}_detail`];

      if (existingLabel || existingDetail) return null;

      const opt = await fetchFkOptionById(fieldName, finalId);
      if (!opt) return null;

      setFkStore((prev) => ({
        ...prev,
        [fieldName]: {
          ...(prev[fieldName] || EMPTY_OBJECT),
          options: upsertOption(prev[fieldName]?.options || EMPTY_ARRAY, opt),
        },
      }));

      if (formikLiveRef.current?.setFieldValue) {
        formikLiveRef.current.setFieldValue(`${fieldName}_detail`, opt.raw, false);
        if (field.labelField) {
          formikLiveRef.current.setFieldValue(field.labelField, opt.label, false);
        }
      }

      return opt;
    },
    [fieldByName, fetchFkOptionById]
  );

  const fetchFkOptions = useCallback(
    async (fieldName, { search = "", ensureOption = null, valuesOverride = null } = {}) => {
      const field = fieldByName[fieldName];
      const fkUrl = field?.fkUrl;
      if (!fkUrl) return;

      const fkSearchParam = field.fkSearchParam ?? "search";
      const fkPageParam = field.fkPageParam ?? "page";
      const fkPageSizeParam = field.fkPageSizeParam ?? "page_size";
      const fkPageSize = field.fkPageSize ?? 20;
      const resolvedExtraParams = resolveDynamicParams(field?.fkExtraParams, {
        values: valuesOverride || formikLiveRef.current?.values || EMPTY_OBJECT,
        row: null,
        rowIndex: null,
        field,
        parentFieldName: fieldName,
      });

      setFkStore((prev) => ({
        ...prev,
        [fieldName]: {
          ...(prev[fieldName] || EMPTY_OBJECT),
          loading: true,
          search,
        },
      }));

      try {
        const finalUrl = appendQueryParams(resolveUrl(fkUrl), {
          [fkPageParam]: 1,
          [fkPageSizeParam]: fkPageSize,
          ...(fkSearchParam ? { [fkSearchParam]: search } : EMPTY_OBJECT),
          ...(resolvedExtraParams || EMPTY_OBJECT),
        });

        const res = await axios.get(finalUrl, { headers: authHeaders });
        const payload = res?.data;
        const rows = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : EMPTY_ARRAY;

        let options = rows.map((r) => toFkOption(r, field));
        if (ensureOption) options = upsertOption(options, ensureOption);

        setFkStore((prev) => ({
          ...prev,
          [fieldName]: {
            options,
            loading: false,
            search,
            count: Number(payload?.count ?? options.length ?? 0),
          },
        }));
      } catch (e) {
        setFkStore((prev) => ({
          ...prev,
          [fieldName]: {
            ...(prev[fieldName] || EMPTY_OBJECT),
            loading: false,
          },
        }));
      }
    },
    [fieldByName, authHeaders]
  );

  const fetchFkOptionsInline = useCallback(
    async (
      storeKey,
      cfg,
      {
        search = "",
        ensureOption = null,
        rowValue = null,
        rowIndex = null,
        parentFieldName = null,
        valuesOverride = null,
      } = {}
    ) => {
      const fkUrl = cfg?.fkUrl;
      if (!fkUrl) return;

      const fkSearchParam = cfg.fkSearchParam ?? "search";
      const fkPageParam = cfg.fkPageParam ?? "page";
      const fkPageSizeParam = cfg.fkPageSizeParam ?? "page_size";
      const fkPageSize = cfg.fkPageSize ?? 20;
      const resolvedExtraParams = resolveDynamicParams(cfg?.fkExtraParams, {
        values: valuesOverride || formikLiveRef.current?.values || EMPTY_OBJECT,
        row: rowValue,
        rowIndex,
        field: cfg,
        parentFieldName,
      });

      setFkStore((prev) => ({
        ...prev,
        [storeKey]: {
          ...(prev[storeKey] || EMPTY_OBJECT),
          loading: true,
          search,
        },
      }));

      try {
        const finalUrl = appendQueryParams(resolveUrl(fkUrl), {
          [fkPageParam]: 1,
          [fkPageSizeParam]: fkPageSize,
          ...(fkSearchParam ? { [fkSearchParam]: search } : EMPTY_OBJECT),
          ...(resolvedExtraParams || EMPTY_OBJECT),
        });

        const res = await axios.get(finalUrl, { headers: authHeaders });
        const payload = res?.data;
        const rows = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : EMPTY_ARRAY;

        let options = rows.map((r) => toFkOption(r, cfg));
        if (ensureOption) options = upsertOption(options, ensureOption);

        setFkStore((prev) => ({
          ...prev,
          [storeKey]: {
            options,
            loading: false,
            search,
            count: Number(payload?.count ?? options.length ?? 0),
          },
        }));
      } catch (e) {
        setFkStore((prev) => ({
          ...prev,
          [storeKey]: {
            ...(prev[storeKey] || EMPTY_OBJECT),
            loading: false,
          },
        }));
      }
    },
    [authHeaders]
  );

  const refreshFkAndSelect = useCallback(
    async (fieldName, optionOrId) => {
      const field = fieldByName[fieldName];
      if (!field) return;

      let id =
        optionOrId && typeof optionOrId === "object"
          ? optionOrId.value ?? optionOrId.id ?? getFkValue(optionOrId, field)
          : optionOrId;

      let ensureOption =
        optionOrId && typeof optionOrId === "object"
          ? {
            value: optionOrId.value ?? optionOrId.id ?? getFkValue(optionOrId, field),
            label:
              optionOrId.label ??
              getFkLabel(optionOrId.raw ?? optionOrId, field) ??
              optionOrId.name ??
              String(optionOrId.value ?? optionOrId.id ?? ""),
            raw: optionOrId.raw ?? optionOrId,
          }
          : null;

      if (!ensureOption && id != null) {
        const existing = (fkStore[fieldName]?.options || EMPTY_ARRAY).find(
          (opt) => String(opt?.value) === String(id)
        );

        ensureOption = existing || (await fetchFkOptionById(fieldName, id));
      }

      await fetchFkOptions(fieldName, { search: "", ensureOption });

      if (formikLiveRef.current?.setFieldValue && id != null) {
        formikLiveRef.current.setFieldValue(fieldName, id);

        if (ensureOption?.raw) {
          formikLiveRef.current.setFieldValue(`${fieldName}_detail`, ensureOption.raw, false);
        }

        if (field.labelField) {
          formikLiveRef.current.setFieldValue(
            field.labelField,
            ensureOption?.label || "",
            false
          );
        }
      }
    },
    [fieldByName, fkStore, fetchFkOptionById, fetchFkOptions]
  );

  const sortQueryParams = useMemo(() => {
    if (sortMode === "ordering") {
      return sortState?.ordering ? { [orderingParam]: sortState.ordering } : EMPTY_OBJECT;
    }

    const out = {};
    if (sortState?.field) out[sortFieldParam] = sortState.field;
    if (sortState?.order) out[sortOrderParam] = sortState.order === "descend" ? "desc" : "asc";
    return out;
  }, [sortMode, sortState, orderingParam, sortFieldParam, sortOrderParam]);

  const mergedBaseFilters = useMemo(
    () => ({
      ...(baseFilters || EMPTY_OBJECT),
      ...(anchorParams || EMPTY_OBJECT),
      ...(columnFilters || EMPTY_OBJECT),
    }),
    [baseFilters, anchorParams, columnFilters]
  );

  const fetchData = useCallback(
    async ({ page, pageSize, search } = {}) => {
      try {
        setLoading(true);

        const finalUrl = enableServerPagination
          ? appendQueryParams(baseUrl, {
            [pageParam]: page ?? pagination.current,
            [pageSizeParam]: pageSize ?? pagination.pageSize,
            ...(searchParam ? { [searchParam]: search ?? searchText } : EMPTY_OBJECT),
            ...(activeParam ? { [activeParam]: viewActive } : EMPTY_OBJECT),
            ...(mergedBaseFilters || EMPTY_OBJECT),
            ...(sortQueryParams || EMPTY_OBJECT),
          })
          : appendQueryParams(baseUrl, {
            ...(searchParam ? { [searchParam]: search ?? searchText } : EMPTY_OBJECT),
            ...(activeParam ? { [activeParam]: viewActive } : EMPTY_OBJECT),
            ...(mergedBaseFilters || EMPTY_OBJECT),
            ...(sortQueryParams || EMPTY_OBJECT),
          });

        const res = await axios.get(finalUrl, { headers: authHeaders });

        if (res?.data && typeof res.data === "object" && Array.isArray(res.data.results)) {
          setServerPaginated(true);
          setData(res.data.results);
          setPagination((p) => ({
            ...p,
            current: page ?? p.current,
            pageSize: pageSize ?? p.pageSize,
            total: Number(res.data.count ?? 0),
          }));
          return;
        }

        if (Array.isArray(res.data)) {
          setServerPaginated(false);
          setData(res.data);
          setPagination((p) => ({
            ...p,
            current: 1,
            total: res.data.length,
          }));
          return;
        }

        setServerPaginated(false);
        setData(EMPTY_ARRAY);
        setPagination((p) => ({ ...p, total: 0 }));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      enableServerPagination,
      baseUrl,
      pageParam,
      pageSizeParam,
      searchParam,
      searchText,
      pagination.current,
      pagination.pageSize,
      activeParam,
      viewActive,
      mergedBaseFilters,
      sortQueryParams,
      authHeaders,
    ]
  );

  const fetchInactive = useCallback(
    async ({ page, pageSize, search } = {}) => {
      try {
        setInactiveLoading(true);

        const finalUrl = enableServerPagination
          ? appendQueryParams(baseUrl, {
            [pageParam]: page ?? inactivePagination.current,
            [pageSizeParam]: pageSize ?? inactivePagination.pageSize,
            ...(searchParam ? { [searchParam]: search ?? inactiveSearchText } : EMPTY_OBJECT),
            ...(activeParam ? { [activeParam]: false } : EMPTY_OBJECT),
            ...(mergedBaseFilters || EMPTY_OBJECT),
            ...(sortQueryParams || EMPTY_OBJECT),
          })
          : appendQueryParams(baseUrl, {
            ...(searchParam ? { [searchParam]: search ?? inactiveSearchText } : EMPTY_OBJECT),
            ...(activeParam ? { [activeParam]: false } : EMPTY_OBJECT),
            ...(mergedBaseFilters || EMPTY_OBJECT),
            ...(sortQueryParams || EMPTY_OBJECT),
          });

        const res = await axios.get(finalUrl, { headers: authHeaders });

        if (res?.data && typeof res.data === "object" && Array.isArray(res.data.results)) {
          setInactiveRows(res.data.results);
          setInactivePagination((p) => ({
            ...p,
            current: page ?? p.current,
            pageSize: pageSize ?? p.pageSize,
            total: Number(res.data.count ?? 0),
          }));
          return;
        }

        if (Array.isArray(res.data)) {
          const list = res.data.filter((d) => {
            if (d?.hasOwnProperty("active")) return d.active === false;
            if (d?.hasOwnProperty("is_active")) return d.is_active === false;
            return false;
          });

          setInactiveRows(list);
          setInactivePagination((p) => ({ ...p, current: 1, total: list.length }));
          return;
        }

        setInactiveRows(EMPTY_ARRAY);
        setInactivePagination((p) => ({ ...p, total: 0 }));
      } catch (e) {
        console.error("Failed to fetch inactive:", e);
      } finally {
        setInactiveLoading(false);
      }
    },
    [
      enableServerPagination,
      baseUrl,
      pageParam,
      pageSizeParam,
      searchParam,
      inactiveSearchText,
      inactivePagination.current,
      inactivePagination.pageSize,
      activeParam,
      mergedBaseFilters,
      sortQueryParams,
      authHeaders,
    ]
  );

  useEffect(() => {
    fetchData({
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchText,
    });
  }, [fetchData]);

  useEffect(() => {
    if (!enableInactiveDrawer || !inactiveDrawer) return;

    fetchInactive({
      page: inactivePagination.current,
      pageSize: inactivePagination.pageSize,
      search: inactiveSearchText,
    });
  }, [fetchInactive, enableInactiveDrawer, inactiveDrawer]);

  const upsertSavedRecord = useCallback((savedRecord) => {
    if (!savedRecord?.id) return;

    const isActiveRecord = savedRecord?.hasOwnProperty("active")
      ? !!savedRecord.active
      : savedRecord?.hasOwnProperty("is_active")
        ? !!savedRecord.is_active
        : true;

    setData((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const next = list.filter((item) => String(item?.id) !== String(savedRecord.id));
      return isActiveRecord ? [savedRecord, ...next] : next;
    });

    setInactiveRows((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const next = list.filter((item) => String(item?.id) !== String(savedRecord.id));
      return isActiveRecord ? next : [savedRecord, ...next];
    });
  }, []);

  const refreshAfterSubmit = useCallback(async () => {
    await fetchData({
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchText,
    });

    if (enableInactiveDrawer && inactiveDrawer) {
      await fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }
  }, [
    fetchData,
    pagination.current,
    pagination.pageSize,
    searchText,
    enableInactiveDrawer,
    inactiveDrawer,
    fetchInactive,
    inactivePagination.current,
    inactivePagination.pageSize,
    inactiveSearchText,
  ]);

  const computedDrawerWidth = useMemo(() => {
    if (typeof window === "undefined") return drawerWidth;
    const ww = window.innerWidth || drawerWidth;
    if (ww <= 768) return "100%";
    return Math.min(drawerWidth, Math.max(360, ww - 24));
  }, [drawerWidth, visible]);

  const computedModalWidth = useMemo(() => {
    if (typeof window === "undefined") return modalWidth;
    const ww = window.innerWidth || modalWidth;
    if (ww <= 768) return Math.max(320, ww - 16);
    return Math.min(modalWidth, Math.max(360, ww - 24));
  }, [modalWidth, visible]);

  const changeAnchor = (key) => {
    setActiveAnchorKey(key);
    if (anchorSyncWithHash) safeHashSet(key);
    setPagination((p) => ({ ...p, current: 1 }));
    setInactivePagination((p) => ({ ...p, current: 1 }));
    setSelectedRowKeys(EMPTY_ARRAY);
    setSelectedInactiveRowKeys(EMPTY_ARRAY);
    setSubmitErrors(EMPTY_ARRAY);
    if (typeof onAnchorChange === "function") onAnchorChange(key);
  };

  const openedOnceRef = useRef(false);

  useEffect(() => {
    if (!openOnMount || openedOnceRef.current) return;
    openedOnceRef.current = true;

    const open = async () => {
      setSubmitErrors(EMPTY_ARRAY);

      if (openMode === "edit") {
        const fromList = (data || EMPTY_ARRAY).find((d) => String(d.id) === String(openEditId));
        if (fromList) {
          setEditingRecord(fromList);
          setVisible(true);
          return;
        }

        if (openEditId != null) {
          try {
            const r = await axios.get(buildResourceUrl(apiUrl, openEditId), { headers: authHeaders });
            setEditingRecord(r.data);
            setVisible(true);
            return;
          } catch (e) {
            console.error("Failed to fetch edit record:", e);
          }
        }

        setEditingRecord(null);
        setVisible(true);
        return;
      }

      setEditingRecord(null);
      setVisible(true);
    };

    open();
  }, [openOnMount, openMode, openEditId, data, apiUrl, authHeaders]);

  useEffect(() => {
    const init = async () => {
      setSubmitErrors(EMPTY_ARRAY);

      if (ui_type === "edit form") {
        if (look_up_var && typeof look_up_var === "object") {
          setFormInitialValues(look_up_var);
        } else if (look_up_var) {
          try {
            const { data: rec } = await axios.get(buildResourceUrl(apiUrl, look_up_var), {
              headers: authHeaders,
            });
            setFormInitialValues(rec);
          } catch (err) {
            console.error("Failed to fetch record for edit form:", err);
          }
        }
      } else if (ui_type === "add form") {
        setFormInitialValues(crudInitialValues || EMPTY_OBJECT);
      }
    };

    init();
  }, [ui_type, look_up_var, apiUrl, authHeaders, crudInitialValues]);

  const updateRecordActiveState = async (record, nextActive) => {
    const updateField = record?.hasOwnProperty("active") ? "active" : "is_active";
    const normalizedRecord = normalizeFkValuesForSubmit(record);

    await axios.put(
      buildResourceUrl(apiUrl, record.id),
      { ...normalizedRecord, [updateField]: nextActive },
      { headers: authHeaders }
    );
  };

  const softDelete = async (record) => {
    await updateRecordActiveState(record, false);

    fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });

    if (enableInactiveDrawer && inactiveDrawer) {
      fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }
  };

  const activate = async (record) => {
    await updateRecordActiveState(record, true);

    fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });

    if (enableInactiveDrawer && inactiveDrawer) {
      fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }
  };

  const deletePermanent = async (record) => {
    await axios.delete(buildResourceUrl(apiUrl, record.id), { headers: authHeaders });

    fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });

    if (enableInactiveDrawer && inactiveDrawer) {
      fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }
  };

  const exportRecordsToXlsx = (records = EMPTY_ARRAY, fileName = "export") => {
    const ws = XLSX.utils.json_to_sheet(Array.isArray(records) ? records : EMPTY_ARRAY);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title || "Export");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });

    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; ++i) view[i] = wbout.charCodeAt(i) & 0xff;

    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${fileName}.xlsx`);
  };

  const handleExport = () => {
    const records = Array.isArray(data) ? data : EMPTY_ARRAY;
    exportRecordsToXlsx(records, `${title || "export"}-page`);
  };

  const getBulkTemplateHeaders = useCallback(() => {
    const flatFields = flattenFields(fields);
    const headers = flatFields
      .filter(
        (field) =>
          field?.name &&
          !field?.readOnly &&
          !field?.hidden &&
          !field?.name.endsWith("_detail") &&
          !["objectArray", "array", "group"].includes(field?.type)
      )
      .map((field) => field.name);

    if (headers.length) return headers;

    return Object.keys(crudInitialValues || EMPTY_OBJECT).filter(
      (key) => key && !key.endsWith("_detail")
    );
  }, [fields, flattenFields, crudInitialValues]);

  const downloadBulkTemplate = useCallback(() => {
    const headers = getBulkTemplateHeaders();
    const templateRow = Object.fromEntries(headers.map((key) => [key, ""]));
    exportRecordsToXlsx([templateRow], `${title || "export"}-bulk-template`);
  }, [getBulkTemplateHeaders, title]);

  const fetchAllRowsForExport = useCallback(async () => {
    const limitPerPage = pagination.pageSize || 100;
    let page = 1;
    let hasMore = true;
    const mergedRows = [];
    const maxPages = 300;

    while (hasMore && page <= maxPages) {
      const finalUrl = appendQueryParams(baseUrl, {
        ...(enableServerPagination
          ? {
            [pageParam]: page,
            [pageSizeParam]: limitPerPage,
          }
          : EMPTY_OBJECT),
        ...(searchParam ? { [searchParam]: searchText } : EMPTY_OBJECT),
        ...(activeParam ? { [activeParam]: viewActive } : EMPTY_OBJECT),
        ...(mergedBaseFilters || EMPTY_OBJECT),
        ...(sortQueryParams || EMPTY_OBJECT),
      });

      const res = await axios.get(finalUrl, { headers: authHeaders });
      const payload = res?.data;

      if (Array.isArray(payload)) return payload;

      if (Array.isArray(payload?.results)) {
        mergedRows.push(...payload.results);
        const total = Number(payload?.count ?? mergedRows.length);
        hasMore = mergedRows.length < total && payload.results.length > 0;
        page += 1;
      } else {
        hasMore = false;
      }
    }

    return mergedRows;
  }, [
    pagination.pageSize,
    baseUrl,
    enableServerPagination,
    pageParam,
    pageSizeParam,
    searchParam,
    searchText,
    activeParam,
    viewActive,
    mergedBaseFilters,
    sortQueryParams,
    authHeaders,
  ]);

  const handleExportAll = useCallback(async () => {
    try {
      const rows = await fetchAllRowsForExport();
      if (!rows.length) {
        message.warning("No records found to export");
        return;
      }
      exportRecordsToXlsx(rows, `${title || "export"}-all`);
      message.success(`Exported ${rows.length} records`);
    } catch (error) {
      console.error("Bulk export failed", error);
      message.error("Export failed");
    }
  }, [fetchAllRowsForExport, title]);

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setBulkAddLoading(true);
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
        const rows = Array.isArray(json) ? json : EMPTY_ARRAY;

        if (!rows.length) {
          message.warning("No rows found in the selected file");
          return false;
        }

        let successCount = 0;
        const failures = [];

        for (let index = 0; index < rows.length; index += 1) {
          const rawRow = rows[index] || EMPTY_OBJECT;
          const rowWithDefaults = {
            ...(crudInitialValues || EMPTY_OBJECT),
            ...rawRow,
          };

          try {
            if (validationSchema?.validate) {
              await validationSchema.validate(rowWithDefaults, { abortEarly: false });
            }
            await submitRecord(rowWithDefaults, false, null);
            successCount += 1;
          } catch (rowError) {
            const parsed = parseBackendErrors(rowError, rowWithDefaults);
            const reason =
              parsed?.allErrors?.[0]?.message ||
              rowError?.errors?.join?.(", ") ||
              rowError?.message ||
              "Unknown validation error";
            failures.push(`Row ${index + 2}: ${reason}`);
          }
        }

        fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });
        if (successCount > 0) {
          message.success(`Bulk add completed. Added ${successCount} record(s).`);
        }
        if (failures.length) {
          notification.warning({
            message: "Some rows failed during bulk add",
            description: failures.slice(0, 6).join(" | "),
            duration: 7,
          });
        }
      } catch (err) {
        console.error(err);
        message.error("Bulk add failed");
      } finally {
        setBulkAddLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const bulkInactivate = async () => {
    await Promise.all(
      selectedRowKeys.map((id) => {
        const rec = (data || EMPTY_ARRAY).find((d) => d.id === id);
        return rec ? updateRecordActiveState(rec, false) : null;
      })
    );

    setSelectedRowKeys(EMPTY_ARRAY);

    fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });

    if (enableInactiveDrawer && inactiveDrawer) {
      fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }

    message.success("Selected records marked inactive");
  };

  const bulkActivate = async () => {
    await Promise.all(
      selectedInactiveRowKeys.map((id) => {
        const rec = (inactiveRows || EMPTY_ARRAY).find((d) => d.id === id);
        return rec ? updateRecordActiveState(rec, true) : null;
      })
    );

    setSelectedInactiveRowKeys(EMPTY_ARRAY);

    fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });

    if (enableInactiveDrawer && inactiveDrawer) {
      fetchInactive({
        page: inactivePagination.current,
        pageSize: inactivePagination.pageSize,
        search: inactiveSearchText,
      });
    }

    message.success("Selected records marked active");
  };

  const currentData = useMemo(() => {
    if (serverPaginated) return data || EMPTY_ARRAY;
    return Array.isArray(data)
      ? data.filter((d) => {
        if (d.hasOwnProperty("active")) return d.active === viewActive;
        if (d.hasOwnProperty("is_active")) return d.is_active === viewActive;
        return viewActive === true;
      })
      : EMPTY_ARRAY;
  }, [data, serverPaginated, viewActive]);

  const inactiveData = useMemo(() => {
    if (serverPaginated) return inactiveRows || EMPTY_ARRAY;
    return Array.isArray(data)
      ? data.filter((d) =>
        d.hasOwnProperty("active") ? d.active === false : d.is_active === false
      )
      : EMPTY_ARRAY;
  }, [data, serverPaginated, inactiveRows]);

  const filteredData = useMemo(() => {
    if (serverPaginated) return currentData || EMPTY_ARRAY;
    if (!searchFields.length) return currentData || EMPTY_ARRAY;

    return (currentData || EMPTY_ARRAY).filter((item) =>
      searchFields.some((key) =>
        String(item?.[key] ?? "").toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }, [serverPaginated, currentData, searchFields, searchText]);

  const filteredInactiveData = useMemo(() => {
    if (serverPaginated) return inactiveData || EMPTY_ARRAY;
    if (!searchFields.length) return inactiveData || EMPTY_ARRAY;

    return (inactiveData || EMPTY_ARRAY).filter((item) =>
      searchFields.some((key) =>
        String(item?.[key] ?? "").toLowerCase().includes(inactiveSearchText.toLowerCase())
      )
    );
  }, [serverPaginated, inactiveData, searchFields, inactiveSearchText]);

  const buildBackendColumnFilter = useCallback(
    (cfg = EMPTY_OBJECT) => {
      const {
        title: filterTitle,
        paramName,
        type = "text",
        options = EMPTY_ARRAY,
        fkUrl,
        fkSearchParam = "search",
        fkPageParam = "page",
        fkPageSizeParam = "page_size",
        fkPageSize = 20,
        fkLabelKey = "name",
        fkValueKey = "id",
        fkLabel,
        fkExtraParams = EMPTY_OBJECT,
      } = cfg;

      const currentValue = columnFilters?.[paramName] ?? "";

      const loadFilterAutocomplete = async (search = "", setter = () => { }) => {
        if (!fkUrl) return;

        try {
          const url = appendQueryParams(resolveUrl(fkUrl), {
            [fkPageParam]: 1,
            [fkPageSizeParam]: fkPageSize,
            ...(fkSearchParam ? { [fkSearchParam]: search } : EMPTY_OBJECT),
            ...(fkExtraParams || EMPTY_OBJECT),
          });

          const res = await axios.get(url, { headers: authHeaders });
          const payload = res?.data;
          const rows = Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload)
              ? payload
              : EMPTY_ARRAY;

          setter(
            rows.map((row) => ({
              value: row?.[fkValueKey] ?? row?.id,
              label:
                typeof fkLabel === "function"
                  ? fkLabel(row)
                  : row?.[fkLabelKey] ??
                  row?.name ??
                  row?.display_name ??
                  row?.code ??
                  String(row?.[fkValueKey] ?? row?.id ?? ""),
              raw: row,
            }))
          );
        } catch (e) {
          setter(EMPTY_ARRAY);
        }
      };

      return {
        filterDropdown: ({ confirm, clearFilters, close }) => {
          if (type === "select") {
            return (
              <div style={{ padding: 8, width: 240 }}>
                <Select
                  allowClear
                  showSearch
                  style={{ width: "100%", marginBottom: 8 }}
                  placeholder={`Filter ${filterTitle}`}
                  value={currentValue || undefined}
                  onChange={(val) => {
                    const next = { ...columnFilters };
                    if (val === undefined || val === null || val === "") delete next[paramName];
                    else next[paramName] = val;
                    setColumnFilters(next);
                    setPagination((p) => ({ ...p, current: 1 }));
                    confirm();
                  }}
                  options={options}
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    onClick={() => {
                      const next = { ...columnFilters };
                      delete next[paramName];
                      setColumnFilters(next);
                      setPagination((p) => ({ ...p, current: 1 }));
                      clearFilters?.();
                      confirm();
                    }}
                  >
                    Reset
                  </Button>
                  <Button size="small" type="primary" onClick={() => close()}>
                    Close
                  </Button>
                </div>
              </div>
            );
          }

          if (type === "autocomplete") {
            const FilterAuto = () => {
              const [opts, setOpts] = useState(EMPTY_ARRAY);

              return (
                <div style={{ padding: 8, width: 260 }}>
                  <AutoComplete
                    style={{ width: "100%", marginBottom: 8 }}
                    allowClear
                    options={opts.map((o) => ({ value: String(o.value), label: o.label }))}
                    placeholder={`Filter ${filterTitle}`}
                    onFocus={() => {
                      if (!opts.length) loadFilterAutocomplete("", setOpts);
                    }}
                    onSearch={(txt) => loadFilterAutocomplete(txt || "", setOpts)}
                    onSelect={(val) => {
                      const next = { ...columnFilters, [paramName]: val };
                      setColumnFilters(next);
                      setPagination((p) => ({ ...p, current: 1 }));
                      confirm();
                    }}
                    onChange={(txt) => {
                      if (!txt) {
                        const next = { ...columnFilters };
                        delete next[paramName];
                        setColumnFilters(next);
                      }
                    }}
                    value={currentValue || undefined}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const next = { ...columnFilters };
                        delete next[paramName];
                        setColumnFilters(next);
                        setPagination((p) => ({ ...p, current: 1 }));
                        clearFilters?.();
                        confirm();
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="small" type="primary" onClick={() => close()}>
                      Close
                    </Button>
                  </div>
                </div>
              );
            };

            return <FilterAuto />;
          }

          return (
            <div style={{ padding: 8, width: 220 }}>
              <Input
                allowClear
                placeholder={`Filter ${filterTitle}`}
                value={currentValue}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...columnFilters };
                  if (!val) delete next[paramName];
                  else next[paramName] = val;
                  setColumnFilters(next);
                }}
                onPressEnter={() => {
                  setPagination((p) => ({ ...p, current: 1 }));
                  confirm();
                }}
                style={{ marginBottom: 8, display: "block" }}
              />

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => {
                    const next = { ...columnFilters };
                    delete next[paramName];
                    setColumnFilters(next);
                    setPagination((p) => ({ ...p, current: 1 }));
                    clearFilters?.();
                    confirm();
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    setPagination((p) => ({ ...p, current: 1 }));
                    confirm();
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          );
        },
        filterIcon: () => (
          <FilterOutlined style={{ color: columnFilters?.[paramName] ? "#1677ff" : undefined }} />
        ),
      };
    },
    [columnFilters, authHeaders]
  );

  const getRowActionItems = (record, isInactive = false) => {
    const items = [];

    if (canEdit) {
      items.push({
        key: "edit",
        icon: <EditOutlined />,
        label: "Edit",
        onClick: () => {
          setSubmitErrors(EMPTY_ARRAY);
          setEditingRecord(record);
          setVisible(true);
        },
      });
    }

    (singleactions || EMPTY_ARRAY).forEach((action, index) => {
      items.push({
        key: `custom-${index}`,
        icon: action?.icon || <ReloadOutlined />,
        label: action.label,
        onClick: async () => {
          try {
            if (!action?.actions) return;
            const normalizedRecord = normalizeFkValuesForSubmit(record);
            await axios.put(
              buildResourceUrl(apiUrl, record.id),
              { ...normalizedRecord, ...action.actions },
              { headers: authHeaders }
            );
            fetchData({ page: pagination.current, pageSize: pagination.pageSize, search: searchText });
            message.success(`${action.label} successful`);
          } catch (e) {
            console.error(e);
            message.error("Action failed");
          }
        },
      });
    });

    if (isInactive) {
      if (canDelete) {
        items.push({
          key: "activate",
          icon: <ReloadOutlined style={{ color: "green" }} />,
          label: "Activate",
          onClick: () => activate(record),
        });
        items.push({
          key: "delete",
          icon: <DeleteOutlined style={{ color: "red" }} />,
          label: "Delete Permanently",
          danger: true,
          onClick: () => deletePermanent(record),
        });
      }
    } else {
      if (canDelete) {
        items.push({
          key: "inactivate",
          icon: <DeleteOutlined style={{ color: "red" }} />,
          label: "Inactivate",
          danger: true,
          onClick: () => softDelete(record),
        });
      }
    }

    if (!items.length) items.push({ key: "noop", label: "No actions", disabled: true });
    return items;
  };

  const topMenuItems = useMemo(() => {
    const items = [];

    if (canView) {
      items.push(
        {
          key: "export",
          icon: <DownloadOutlined />,
          label: "Export (this page)",
          onClick: handleExport,
        },
        {
          key: "import",
          icon: <UploadOutlined />,
          label: (
            <Upload beforeUpload={handleImport} showUploadList={false}>
              <span>{bulkAddLoading ? "Bulk Add (processing...)" : "Bulk Add"}</span>
            </Upload>
          ),
        },
        {
          key: "export-all",
          icon: <DownloadOutlined />,
          label: "Export (all records)",
          onClick: handleExportAll,
        },
        {
          key: "download-template",
          icon: <DownloadOutlined />,
          label: "Download Bulk Template",
          onClick: downloadBulkTemplate,
        },
      );

      if (enableInactiveDrawer) {
        items.push({
          key: "inactive",
          icon: <EyeInvisibleOutlined />,
          label: `View Inactive (${inactivePagination.total ?? filteredInactiveData.length})`,
          onClick: () => setInactiveDrawer((s) => !s),
        });
      }
    }

    if (canDelete && viewActive) {
      items.push({
        key: "bulk-inactivate",
        icon: <DeleteOutlined style={{ color: "red" }} />,
        label: `Inactivate Selected (${selectedRowKeys.length})`,
        danger: true,
        disabled: !selectedRowKeys.length,
        onClick: bulkInactivate,
      });
    }

    if (Array.isArray(rowMenu) && rowMenu.length) {
      rowMenu
        .filter((item) => {
          if (typeof item?.show === "function") return item.show({ selectedRowKeys, data, viewActive });
          return item?.show !== false;
        })
        .forEach((item, idx) => {
          if (item?.type === "divider") {
            items.push({ type: "divider" });
            return;
          }

          const computedDisabled =
            typeof item?.disabled === "function"
              ? item.disabled({ selectedRowKeys, data, viewActive })
              : !!item?.disabled;

          const disabledBySelection = item?.requiresSelection && selectedRowKeys.length === 0;

          items.push({
            key: `rm-${idx}`,
            icon: item?.icon,
            label: item?.label,
            danger: !!item?.danger,
            disabled: computedDisabled || disabledBySelection,
            onClick: () =>
              item?.onClick?.({
                selectedRowKeys,
                data,
                viewActive,
                fetchData: () =>
                  fetchData({
                    page: pagination.current,
                    pageSize: pagination.pageSize,
                    search: searchText,
                  }),
                clearSelection: () => setSelectedRowKeys(EMPTY_ARRAY),
                message,
                fk: { refreshFkAndSelect },
              }),
          });
        });
    }

    if (!items.length) items.push({ key: "noop", label: "No actions", disabled: true });
    return items;
  }, [
    canView,
    canDelete,
    viewActive,
    selectedRowKeys,
    rowMenu,
    data,
    fetchData,
    bulkAddLoading,
    handleExportAll,
    downloadBulkTemplate,
    searchText,
    pagination.current,
    pagination.pageSize,
    enableInactiveDrawer,
    inactivePagination.total,
    filteredInactiveData.length,
    refreshFkAndSelect,
  ]);

  const processedColumns = useMemo(() => {
    return (columns || EMPTY_ARRAY).map((col) => {
      let next = { ...col };

      if (col?.backendFilter) {
        next = {
          ...next,
          ...buildBackendColumnFilter(col.backendFilter),
        };
      }

      if (col?.backendSort) {
        next.sorter = true;
        next.sortOrder =
          sortState?.field === (col.sortField || col.dataIndex || col.key) ? sortState.order : null;
      }

      return next;
    });
  }, [columns, buildBackendColumnFilter, sortState]);

  const canRowActionsExist =
    showRowActionMenu && (canEdit || canDelete || (singleactions && singleactions.length > 0));

  const viewColumn =
    showViewColumn && typeof viewPathBuilder === "function"
      ? {
        title: "View",
        key: "view",
        width: 100,
        render: (_, record) => {
          const path = viewPathBuilder(record);
          if (!path) return "-";
          return <Link to={path}>View</Link>;
        },
      }
      : null;

  const actionColumn = hasActionColumns
    ? {
      title: "Actions",
      fixed: "right",
      width: 10,
      render: (_, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{ items: getRowActionItems(record, false) }}
            trigger={["click"]}
          >
            <Button
              shape="circle"
              icon={<EllipsisOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      ),
    }
    : null;
  const mainColumns = canRowActionsExist
    ? [...processedColumns, ...(viewColumn ? [viewColumn] : []), ...(actionColumn ? [actionColumn] : [])]
    : [...processedColumns, ...(viewColumn ? [viewColumn] : [])];

  const inactiveColumns = canRowActionsExist
    ? [
      ...processedColumns,
      ...(viewColumn ? [viewColumn] : []),
      {
        title: "Actions",
        fixed: "right",
        width: 90,
        render: (_, record) => (
          <Dropdown menu={{ items: getRowActionItems(record, true) }} trigger={["click"]}>
            <Button shape="circle" icon={<EllipsisOutlined />} />
          </Dropdown>
        ),
      },
    ]
    : [...processedColumns, ...(viewColumn ? [viewColumn] : [])];

  const handleQuickButtonClick = () => {
    setSubmitErrors(EMPTY_ARRAY);
    if (button_ui_id) {
      const rec = (data || EMPTY_ARRAY).find((d) => d.id === button_ui_id);
      setEditingRecord(rec || null);
    } else {
      setEditingRecord(null);
    }
    setVisible(true);
  };

  const toggleObjectArrayRow = useCallback((arrayName, index) => {
    const key = `${arrayName}.${index}`;
    setObjectArrayExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const isObjectArrayRowExpanded = useCallback(
    (arrayName, index, fieldConfig) => {
      const key = `${arrayName}.${index}`;
      if (Object.prototype.hasOwnProperty.call(objectArrayExpandedRows, key)) {
        return !!objectArrayExpandedRows[key];
      }
      return !!fieldConfig?.rowStartExpanded;
    },
    [objectArrayExpandedRows]
  );

  const renderFormFields = (values, setFieldValue, errors, touched, ui_type) => {
    const renderOneField = (field, parentPath = "") => {
      if (!field) return null;
      if (field.condition && !field.condition(values)) return null;

      const colSpan = field.col ?? 24;
      const readOnly = !!field.readOnly;
      const label = field.label;
      const name = field.name;

      const fieldKey =
        field.key || field.name || `${parentPath}${field.label || field.type || "field"}-${colSpan}`;

      const setSelectWithLabel = (val, option) => {
        if (field.labelField) {
          const opt = Array.isArray(option) ? option?.[0] : option;
          const lbl = opt?.label ?? opt?.children ?? opt?.title ?? "";
          setFieldValue(field.labelField, lbl, false);
        }
        setFieldValue(name, val);
      };

      if (field.type === "group") {
        const children = Array.isArray(field.children) ? field.children : EMPTY_ARRAY;
        const groupInner = (
          <Row gutter={[0, 0]}  >
            {children.map((child, idx) => renderOneField(child, `${fieldKey}.${idx}.`))}
          </Row>
        );

        return (
          <Col
            key={fieldKey}
            {...getResponsiveColProps(field)}
            className={field.col && field.col < 24 ? "p-2" : "p-0"}
          >
            {field.accordion !== false ? (
              <Collapse
                className="my-2"
                bordered={field.bordered ?? false}
                defaultActiveKey={
                  field.defaultOpen === undefined ? [fieldKey] : field.defaultOpen ? [fieldKey] : EMPTY_ARRAY
                }
              >
                <Panel header={field.label} key={fieldKey}>
                  {groupInner}
                </Panel>
              </Collapse>
            ) : (
              <div
                className="border"
                style={{
                  marginBottom: 16,
                  padding: 12,
                  border: "1px solid #f0f0f0",
                  background: "#ffffff",
                }}
              >
                {field.label && <div style={{ fontWeight: 700, marginBottom: 8 }}>{field.label}</div>}
                {groupInner}
              </div>
            )}
          </Col>
        );
      }

      return (
        <Col
          key={fieldKey}
          {...getResponsiveColProps(field)}
          className="px-2 py-0"
        >
          <Form.Item
            layout="vertical"
            className="p-0"
            label={label}
            required={field.required}
            validateStatus={touched?.[name] && errors?.[name] ? "error" : ""}
            help={touched?.[name] && errors?.[name]}
          >
            {(() => {
              switch (field.type) {
                case "linebreaker":
                  return <div style={{ height: field.height ?? 8, width: "100%" }} />;

                case "textarea":
                  return (
                    <Field
                      name={name}
                      style={{ minHeight: 40, padding: "4px 8px", lineHeight: "20px" }}
                      as={Input.TextArea}
                      size="large"
                      rows={field.rows || 1}
                      placeholder={field.placeholder || ""}
                      disabled={readOnly}
                    />
                  );

                case "button":
                  return (
                    <Button
                      size="large"
                      type={field.buttonType || "default"}
                      block={field.block ?? true}
                      disabled={readOnly || field.disabled}
                      onClick={() =>
                        field.onClick?.({
                          values,
                          setFieldValue,
                          errors,
                          touched,
                          message,
                          fk: { refreshFkAndSelect },
                        })
                      }
                    >
                      {field.buttonText || "Button"}
                    </Button>
                  );

                case "number":
                  return (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={values?.[name]}
                      min={field.min}
                      max={field.max}
                      size="large"
                      disabled={readOnly}
                      onChange={(val) => setFieldValue(name, val)}
                      placeholder={field.placeholder || ""}
                    />
                  );

                case "select": {
                  const options = (field.options || EMPTY_ARRAY).map(normalizeOption);
                  const currentVal = values?.[name];
                  const finalVal =
                    currentVal !== undefined && currentVal !== ""
                      ? currentVal
                      : field.defaultValue !== undefined && field.defaultValue !== ""
                        ? field.defaultValue
                        : undefined;

                  return (
                    <Select
                      showSearch
                      value={finalVal}
                      size="large"
                      disabled={readOnly}
                      placeholder={field.placeholder || "Select..."}
                      onChange={(val, option) => setSelectWithLabel(val, option)}
                      filterOption={(input, opt) =>
                        String(opt?.children ?? opt?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {options.map((opt) => (
                        <Select.Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Option>
                      ))}
                    </Select>
                  );
                }

                case "fkSelect": {
                  const store = fkStore[name] || { options: EMPTY_ARRAY, loading: false, search: "" };
                  const options = store.options || EMPTY_ARRAY;
                  const rawCurrent = values?.[name];
                  const detailCurrent = values?.[`${name}_detail`];
                  const finalVal = getFkValue(rawCurrent, field);
                  const currentLabel = getFkLabelFromValues(values, field);

                  const mergedOptions =
                    finalVal != null && !options.some((o) => String(o.value) === String(finalVal))
                      ? [
                        {
                          value: finalVal,
                          label: currentLabel || String(finalVal),
                          raw: detailCurrent || rawCurrent,
                        },
                        ...options,
                      ]
                      : options;

                  return (
                    <Select
                      showSearch
                      size="large"
                      value={finalVal ?? undefined}
                      placeholder={field.placeholder || "Search and select..."}
                      disabled={readOnly}
                      filterOption={false}
                      loading={store.loading}
                      allowClear
                      onClear={() => {
                        setFieldValue(name, null);
                        setFieldValue(`${name}_detail`, null, false);
                        if (field.labelField) setFieldValue(field.labelField, "", false);
                      }}
                      onOpenChange={(open) => {
                        if (!open) return;

                        fetchFkOptions(name, {
                          search: "",
                          ensureOption:
                            finalVal != null
                              ? {
                                value: finalVal,
                                label: currentLabel || String(finalVal),
                                raw: detailCurrent || rawCurrent,
                              }
                              : null,
                          valuesOverride: values,
                        });
                      }}
                      onSearch={(txt) => {
                        if (fkTimersRef.current[name]) clearTimeout(fkTimersRef.current[name]);
                        fkTimersRef.current[name] = setTimeout(() => {
                          fetchFkOptions(name, {
                            search: txt || "",
                            ensureOption:
                              finalVal != null
                                ? {
                                  value: finalVal,
                                  label: currentLabel || String(finalVal),
                                  raw: detailCurrent || rawCurrent,
                                }
                                : null,
                            valuesOverride: values,
                          });
                        }, 350);
                      }}
                      onChange={(val, option) => {
                        const opt = Array.isArray(option) ? option?.[0] : option;
                        setFieldValue(name, val);
                        setFieldValue(`${name}_detail`, opt?.raw || null, false);

                        if (field.labelField) {
                          const lbl = opt?.label ?? opt?.children ?? opt?.name ?? "";
                          setFieldValue(field.labelField, lbl, false);
                        }
                      }}
                      options={mergedOptions}
                    />
                  );
                }

                case "autocomplete":
                  return (
                    <BackendAutocomplete
                      field={field}
                      value={values?.[name]}
                      detailValue={values?.[`${name}_detail`]}
                      disabled={readOnly}
                      authHeaders={authHeaders}
                      placeholder={field.placeholder}
                      valuesContext={values}
                      rowContext={null}
                      rowIndex={null}
                      parentFieldName={name}
                      onValueChange={(v) => setFieldValue(name, v)}
                      onDetailChange={(d) => setFieldValue(`${name}_detail`, d, false)}
                    />
                  );

                case "transfer":
                  return (
                    <CrudTransfer
                      field={field}
                      value={values?.[name]}
                      disabled={readOnly}
                      authHeaders={authHeaders}
                      onChange={(nextValues) => setFieldValue(name, nextValues)}
                      onDetailChange={(details) =>
                        setFieldValue(`${name}_detail`, details, false)
                      }
                    />
                  );

                case "checkbox":
                  return (
                    <Checkbox
                      checked={!!values?.[name]}
                      disabled={readOnly}
                      onChange={(e) => setFieldValue(name, e.target.checked)}
                    >
                      {field.inlineLabel || field.label}
                    </Checkbox>
                  );

                case "radio":
                  return (
                    <Radio.Group
                      block
                      size="large"
                      optionType="button"
                      buttonStyle="solid"
                      disabled={readOnly}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                      value={values?.[name]}
                    >
                      {(field.options || EMPTY_ARRAY).map((opt) => (
                        <Radio key={opt.value} value={opt.value}>
                          {opt.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                  );

                case "radiobtn":
                  return (
                    <Radio.Group
                      block
                      size="large"
                      disabled={readOnly}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                      value={values?.[name]}
                    >
                      {(field.options || EMPTY_ARRAY).map((opt) => (
                        <Radio key={opt.value} value={opt.value}>
                          {opt.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                  );

                case "custom": {
                  if (typeof field.render === "function") {
                    return field.render({
                      field,
                      value: values?.[name],
                      values,
                      setFieldValue,
                      errors,
                      touched,
                      readOnly,
                      message,
                      refreshFkAndSelect,
                    });
                  }

                  if (field.component) {
                    const CustomComponent = field.component;

                    return (
                      <CustomComponent
                        field={field}
                        value={values?.[name]}
                        values={values}
                        setFieldValue={setFieldValue}
                        errors={errors}
                        touched={touched}
                        readOnly={readOnly}
                        message={message}
                        refreshFkAndSelect={refreshFkAndSelect}
                      />
                    );
                  }

                  return null;
                }

                case "date":
                  return (
                    <Input
                      size="large"
                      type="date"
                      value={values?.[name] || ""}
                      disabled={readOnly}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                      placeholder={field.placeholder || ""}
                    />
                  );

                case "datePicker": {
                  const fmt = field.format || "YYYY-MM-DD";
                  return (
                    <StableDatePicker
                      value={values?.[name]}
                      format={fmt}
                      placeholder={field.placeholder || "Select date"}
                      disabled={readOnly}
                      onChange={(val) => setFieldValue(name, val)}
                      allowClear={field.allowClear ?? true}
                    />
                  );
                }

                case "switch":
                  return (
                    <Switch
                      checked={!!values?.[name]}
                      disabled={readOnly}
                      onChange={(val) => setFieldValue(name, val)}
                    />
                  );

                case "file": {
                  const fileList = getSingleUploadFileList(values?.[name], name);

                  return (
                    <Dragger
                      name={name}
                      multiple={false}
                      maxCount={1}
                      disabled={readOnly}
                      accept={field.accept || ".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"}
                      fileList={fileList}
                      beforeUpload={(file) => {
                        const result = validateUploadFile({ file, field, mode: "file" });
                        if (result === Upload.LIST_IGNORE) return Upload.LIST_IGNORE;

                        setFieldValue(name, file);
                        return false;
                      }}
                      onRemove={() => {
                        setFieldValue(name, null);
                        return true;
                      }}
                      onPreview={openUploadPreview}
                      showUploadList={{
                        showPreviewIcon: true,
                        showRemoveIcon: !readOnly,
                      }}
                      style={{
                        width: "100%",
                        padding: 12,
                      }}
                    >
                      <div style={{ padding: "8px 4px" }}>
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                          <InboxOutlined />
                        </p>
                        <p
                          className="ant-upload-text"
                          style={{
                            marginBottom: 6,
                            fontSize: 14,
                            wordBreak: "break-word",
                          }}
                        >
                          {field.dragText || "Drag file here or click to upload"}
                        </p>
                        <p
                          className="ant-upload-hint"
                          style={{
                            marginBottom: 0,
                            fontSize: 12,
                            wordBreak: "break-word",
                          }}
                        >
                          Max {field.maxSizeMB ?? 5} MB
                        </p>
                      </div>
                    </Dragger>
                  );
                }

                case "image": {
                  const fileList = getSingleUploadFileList(values?.[name], name);
                  const hasImage = fileList.length > 0;
                  const selectedFileName = fileList?.[0]?.name || "Image selected";

                  return (
                    <Dragger
                      name={name}
                      multiple={false}
                      maxCount={1}
                      disabled={readOnly}
                      accept={field.accept || "image/*"}
                      listType="picture-card"
                      fileList={fileList}
                      beforeUpload={(file) => {
                        const result = validateUploadFile({ file, field, mode: "image" });
                        if (result === Upload.LIST_IGNORE) return Upload.LIST_IGNORE;

                        setFieldValue(name, file);
                        return false;
                      }}
                      onRemove={() => {
                        setFieldValue(name, null);
                        return true;
                      }}
                      onPreview={openUploadPreview}
                      showUploadList={{
                        showPreviewIcon: true,
                        showRemoveIcon: !readOnly,
                      }}
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        border: `1px dashed ${hasImage ? "#52c41a" : "#d9d9d9"}`,
                        background: hasImage ? "#f6ffed" : "#fafafa",
                        padding: 0,
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          padding: hasImage ? "18px 12px" : "24px 12px",
                          textAlign: "center",
                          minHeight: 180,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 58,
                            height: 58,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: hasImage ? "#d9f7be" : "#e6f4ff",
                            color: hasImage ? "#389e0d" : "#1677ff",
                            fontSize: 24,
                          }}
                        >
                          <InboxOutlined />
                        </div>

                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1f1f1f",
                            wordBreak: "break-word",
                          }}
                        >
                          {hasImage
                            ? field.selectedText || selectedFileName
                            : field.dragText || "Upload image"}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#8c8c8c",
                            maxWidth: 280,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {hasImage
                            ? "Click to replace or preview the selected image"
                            : "Drag and drop an image here, or click to browse"}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#595959",
                            background: "#ffffff",
                            border: "1px solid #f0f0f0",
                            borderRadius: 999,
                            padding: "6px 12px",
                          }}
                        >
                          Only images • Max {field.maxSizeMB ?? 5} MB
                        </div>
                      </div>
                    </Dragger>
                  );
                }

                case "fieldArray":
                  return (
                    <FieldArray name={name}>
                      {({ push, remove }) => (
                        <div>
                          {(values?.[name] || EMPTY_ARRAY).map((item, index) => (
                            <div
                              key={`${fieldKey}.${index}`}
                              style={{
                                display: "flex",
                                gap: 8,
                                marginBottom: 8,
                              }}
                            >
                              <Input
                                size="large"
                                value={item}
                                disabled={readOnly}
                                onChange={(e) => setFieldValue(`${name}[${index}]`, e.target.value)}
                                placeholder={field.itemPlaceholder || field.placeholder || ""}
                              />
                              {!readOnly && (
                                <Button size="large" type="link" danger onClick={() => remove(index)}>
                                  Remove
                                </Button>
                              )}
                            </div>
                          ))}
                          {!readOnly && (
                            <Button
                              type="dashed"
                              icon={<PlusOutlined />}
                              onClick={() => push(field.defaultItem || "")}
                            >
                              {field.addButtonLabel || "Add item"}
                            </Button>
                          )}
                        </div>
                      )}
                    </FieldArray>
                  );

                case "objectArray":
                  return (
                    <FieldArray name={name}>
                      {({ push, remove }) => {
                        const rows = values?.[name] || EMPTY_ARRAY;
                        const cols = field.columns || EMPTY_ARRAY;
                        const collapsedFields = field.collapsedFields || EMPTY_ARRAY;
                        const showExpand = collapsedFields.length > 0;
                        const gridTemplateColumns = `${cols
                          .map((c) => c.width || "1fr")
                          .join(" ")}${showExpand ? " 52px" : ""}${!readOnly ? " 52px" : ""}`;

                        const renderExpandedField = (c, rowValue, idx) => {
                          const colKey = c.key ?? c.name;
                          if (!colKey) return null;

                          const path = `${name}[${idx}].${colKey}`;
                          const detailPath = `${name}[${idx}].${colKey}_detail`;
                          const val = rowValue?.[colKey];
                          const detailVal = rowValue?.[`${colKey}_detail`];
                          const cellReadOnly = readOnly || !!c.readOnly;

                          if (typeof c.formula === "function") {
                            const computed = c.formula(rowValue, values, idx);

                            if (c.type === "number") {
                              return (
                                <InputNumber
                                  style={{ width: "100%" }}
                                  value={computed}
                                  disabled
                                  readOnly
                                />
                              );
                            }

                            return <Input value={computed} disabled readOnly />;
                          }

                          if (c.type === "textarea") {
                            return (
                              <Input.TextArea
                                rows={c.rows || 3}
                                value={val}
                                placeholder={c.placeholder || ""}
                                disabled={cellReadOnly}
                                onChange={(e) => setFieldValue(path, e.target.value)}
                              />
                            );
                          }

                          if (c.type === "fkSelect") {
                            const storeKey = `inline:${name}.${idx}.${colKey}`;
                            const store = fkStore[storeKey] || {
                              options: EMPTY_ARRAY,
                              loading: false,
                            };
                            const options = store.options || EMPTY_ARRAY;
                            const finalVal = getFkValue(val, c);
                            const currentLabel =
                              rowValue?.[c.labelField] ||
                              getFkLabel(detailVal, c) ||
                              getFkLabel(val, c) ||
                              null;

                            const mergedOptions =
                              finalVal != null &&
                                !options.some((o) => String(o.value) === String(finalVal))
                                ? [
                                  {
                                    value: finalVal,
                                    label: currentLabel || String(finalVal),
                                    raw: detailVal || val,
                                  },
                                  ...options,
                                ]
                                : options;

                            return (
                              <Select
                                showSearch
                                size="large"
                                value={finalVal ?? undefined}
                                placeholder={c.placeholder || "Search and select..."}
                                disabled={cellReadOnly}
                                filterOption={false}
                                loading={store.loading}
                                allowClear
                                onClear={() => {
                                  setFieldValue(path, null);
                                  setFieldValue(detailPath, null, false);
                                  if (c.labelField) {
                                    setFieldValue(`${name}[${idx}].${c.labelField}`, "", false);
                                  }
                                }}
                                onOpenChange={(open) => {
                                  if (
                                    open &&
                                    (!fkStore[storeKey]?.options ||
                                      fkStore[storeKey]?.options.length === 0)
                                  ) {
                                    fetchFkOptionsInline(storeKey, c, {
                                      search: "",
                                      ensureOption:
                                        finalVal != null
                                          ? {
                                            value: finalVal,
                                            label: currentLabel || String(finalVal),
                                            raw: detailVal || val,
                                          }
                                          : null,
                                      rowValue,
                                      rowIndex: idx,
                                      parentFieldName: name,
                                      valuesOverride: values,
                                    });
                                  }
                                }}
                                onSearch={(txt) => {
                                  if (fkTimersRef.current[storeKey]) {
                                    clearTimeout(fkTimersRef.current[storeKey]);
                                  }
                                  fkTimersRef.current[storeKey] = setTimeout(() => {
                                    fetchFkOptionsInline(storeKey, c, {
                                      search: txt || "",
                                      ensureOption:
                                        finalVal != null
                                          ? {
                                            value: finalVal,
                                            label: currentLabel || String(finalVal),
                                            raw: detailVal || val,
                                          }
                                          : null,
                                      rowValue,
                                      rowIndex: idx,
                                      parentFieldName: name,
                                      valuesOverride: values,
                                    });
                                  }, 350);
                                }}
                                onChange={(v, option) => {
                                  const opt = Array.isArray(option) ? option?.[0] : option;
                                  setFieldValue(path, v);
                                  setFieldValue(detailPath, opt?.raw || null, false);

                                  if (c.labelField) {
                                    const lbl = opt?.children ?? opt?.label ?? "";
                                    setFieldValue(`${name}[${idx}].${c.labelField}`, lbl);
                                  }
                                }}
                                options={mergedOptions}
                              />
                            );
                          }

                          if (c.type === "autocomplete") {
                            return (
                              <BackendAutocomplete
                                field={c}
                                value={val}
                                detailValue={detailVal}
                                disabled={cellReadOnly}
                                authHeaders={authHeaders}
                                placeholder={c.placeholder}
                                valuesContext={values}
                                rowContext={rowValue}
                                rowIndex={idx}
                                parentFieldName={name}
                                onValueChange={(v) => setFieldValue(path, v)}
                                onDetailChange={(d) => setFieldValue(detailPath, d, false)}
                              />
                            );
                          }

                          if (c.type === "number") {
                            return (
                              <InputNumber
                                size="large"
                                style={{ width: "100%" }}
                                value={val}
                                min={c.min}
                                max={c.max}
                                placeholder={c.placeholder || ""}
                                disabled={cellReadOnly}
                                onChange={(v) => setFieldValue(path, v)}
                              />
                            );
                          }

                          if (c.type === "select") {
                            const opts = (c.options || EMPTY_ARRAY).map(normalizeOption);
                            return (
                              <Select
                                size="large"
                                showSearch
                                value={val ?? undefined}
                                placeholder={c.placeholder || "Select..."}
                                disabled={cellReadOnly}
                                onChange={(v, option) => {
                                  setFieldValue(path, v);
                                  if (c.labelField) {
                                    const opt = Array.isArray(option) ? option?.[0] : option;
                                    const lbl = opt?.children ?? opt?.label ?? "";
                                    setFieldValue(`${name}[${idx}].${c.labelField}`, lbl);
                                  }
                                }}
                              >
                                {opts.map((o) => (
                                  <Select.Option key={o.value} value={o.value}>
                                    {o.label}
                                  </Select.Option>
                                ))}
                              </Select>
                            );
                          }

                          if (c.type === "date") {
                            return (
                              <StableDatePicker
                                value={val}
                                disabled={cellReadOnly}
                                format={c.format || "YYYY-MM-DD"}
                                placeholder={c.placeholder}
                                onChange={(v) => setFieldValue(path, v)}
                              />
                            );
                          }

                          if (c.type === "switch") {
                            return (
                              <Switch
                                checked={!!val}
                                disabled={cellReadOnly}
                                onChange={(checked) => setFieldValue(path, checked)}
                              />
                            );
                          }

                          if (c.type === "checkbox") {
                            return (
                              <Checkbox
                                checked={!!val}
                                disabled={cellReadOnly}
                                onChange={(e) => setFieldValue(path, e.target.checked)}
                              >
                                {c.inlineLabel || c.label}
                              </Checkbox>
                            );
                          }

                          return (
                            <Input
                              size="large"
                              value={val}
                              placeholder={c.placeholder || ""}
                              disabled={cellReadOnly}
                              onChange={(e) => setFieldValue(path, e.target.value)}
                            />
                          );
                        };

                        return (
                          <div style={{ border: "1px solid #d9d9d9", borderRadius: 6 }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: gridTemplateColumns,
                                gap: 8,
                                padding: "10px 12px",
                                background: field.headerBg || "#3f4652",
                                color: field.headerColor || "#fff",
                                fontWeight: 700,
                              }}
                            >
                              {cols.map((c) => {
                                const colKey = c.key ?? c.name ?? c.label;
                                return <div key={String(colKey)}>{c.label}</div>;
                              })}
                              {showExpand ? <div /> : null}
                              {!readOnly ? <div /> : null}
                            </div>

                            {rows.map((r, idx) => {
                              const expanded = isObjectArrayRowExpanded(name, idx, field);

                              return (
                                <div key={`${fieldKey}.${idx}`} style={{ borderTop: "1px solid #f0f0f0" }}>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: gridTemplateColumns,
                                      gap: 8,
                                      padding: "10px 12px",
                                      alignItems: "center",
                                    }}
                                  >
                                    {cols.map((c, colIdx) => {
                                      const colKey = c.key ?? c.name;
                                      if (!colKey) return <div key={`${fieldKey}.${idx}.${colIdx}`} />;

                                      const path = `${name}[${idx}].${colKey}`;
                                      const val = r?.[colKey];
                                      const detailPath = `${name}[${idx}].${colKey}_detail`;
                                      const detailVal = r?.[`${colKey}_detail`];
                                      const cellReadOnly = readOnly || !!c.readOnly;

                                      if (typeof c.formula === "function") {
                                        const computed = c.formula(r, values, idx);
                                        if (c.type === "number") {
                                          return (
                                            <InputNumber
                                              key={`${fieldKey}.${idx}.${colKey}`}
                                              size="large"
                                              style={{ width: "100%" }}
                                              value={computed}
                                              disabled
                                              readOnly
                                            />
                                          );
                                        }

                                        return (
                                          <Input
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            value={computed}
                                            disabled
                                            readOnly
                                          />
                                        );
                                      }

                                      if (c.type === "fkSelect") {
                                        const storeKey = `inline:${name}.${idx}.${colKey}`;
                                        const store = fkStore[storeKey] || {
                                          options: EMPTY_ARRAY,
                                          loading: false,
                                        };
                                        const options = store.options || EMPTY_ARRAY;
                                        const finalVal = getFkValue(val, c);
                                        const currentLabel =
                                          r?.[c.labelField] ||
                                          getFkLabel(detailVal, c) ||
                                          getFkLabel(val, c) ||
                                          null;

                                        const mergedOptions =
                                          finalVal != null &&
                                            !options.some((o) => String(o.value) === String(finalVal))
                                            ? [
                                              {
                                                value: finalVal,
                                                label: currentLabel || String(finalVal),
                                                raw: detailVal || val,
                                              },
                                              ...options,
                                            ]
                                            : options;

                                        return (
                                          <Select
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            showSearch
                                            size="large"
                                            value={finalVal}
                                            placeholder={c.placeholder || "Search and select..."}
                                            disabled={cellReadOnly}
                                            filterOption={false}
                                            loading={store.loading}
                                            allowClear
                                            onClear={() => {
                                              setFieldValue(path, null);
                                              setFieldValue(detailPath, null, false);
                                              if (c.labelField) {
                                                setFieldValue(`${name}[${idx}].${c.labelField}`, "", false);
                                              }
                                            }}
                                            onOpenChange={(open) => {
                                              if (
                                                open &&
                                                (!fkStore[storeKey]?.options ||
                                                  fkStore[storeKey]?.options.length === 0)
                                              ) {
                                                fetchFkOptionsInline(storeKey, c, {
                                                  search: "",
                                                  ensureOption:
                                                    finalVal != null
                                                      ? {
                                                        value: finalVal,
                                                        label: currentLabel || String(finalVal),
                                                        raw: detailVal || val,
                                                      }
                                                      : null,
                                                  rowValue: r,
                                                  rowIndex: idx,
                                                  parentFieldName: name,
                                                  valuesOverride: values,
                                                });
                                              }
                                            }}
                                            onSearch={(txt) => {
                                              if (fkTimersRef.current[storeKey]) {
                                                clearTimeout(fkTimersRef.current[storeKey]);
                                              }
                                              fkTimersRef.current[storeKey] = setTimeout(() => {
                                                fetchFkOptionsInline(storeKey, c, {
                                                  search: txt || "",
                                                  ensureOption:
                                                    finalVal != null
                                                      ? {
                                                        value: finalVal,
                                                        label: currentLabel || String(finalVal),
                                                        raw: detailVal || val,
                                                      }
                                                      : null,
                                                  rowValue: r,
                                                  rowIndex: idx,
                                                  parentFieldName: name,
                                                  valuesOverride: values,
                                                });
                                              }, 350);
                                            }}
                                            onChange={(v, option) => {
                                              const opt = Array.isArray(option) ? option?.[0] : option;
                                              setFieldValue(path, v);
                                              setFieldValue(detailPath, opt?.raw || null, false);

                                              if (c.labelField) {
                                                const lbl = opt?.children ?? opt?.label ?? "";
                                                setFieldValue(`${name}[${idx}].${c.labelField}`, lbl);
                                              }
                                            }}
                                            options={mergedOptions}
                                          />
                                        );
                                      }

                                      if (c.type === "autocomplete") {
                                        return (
                                          <BackendAutocomplete
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            field={c}
                                            value={val}
                                            detailValue={detailVal}
                                            disabled={cellReadOnly}
                                            authHeaders={authHeaders}
                                            placeholder={c.placeholder}
                                            valuesContext={values}
                                            rowContext={r}
                                            rowIndex={idx}
                                            parentFieldName={name}
                                            onValueChange={(v) => setFieldValue(path, v)}
                                            onDetailChange={(d) => setFieldValue(detailPath, d, false)}
                                          />
                                        );
                                      }

                                      if (c.type === "number") {
                                        return (
                                          <InputNumber
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            size="large"
                                            style={{ width: "100%" }}
                                            value={val}
                                            min={c.min}
                                            max={c.max}
                                            placeholder={c.placeholder || ""}
                                            disabled={cellReadOnly}
                                            onChange={(v) => setFieldValue(path, v)}
                                          />
                                        );
                                      }

                                      if (c.type === "select") {
                                        const opts = (c.options || EMPTY_ARRAY).map(normalizeOption);
                                        return (
                                          <Select
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            size="large"
                                            showSearch
                                            value={val ?? undefined}
                                            placeholder={c.placeholder || "Select..."}
                                            disabled={cellReadOnly}
                                            onChange={(v, option) => {
                                              setFieldValue(path, v);
                                              if (c.labelField) {
                                                const opt = Array.isArray(option) ? option?.[0] : option;
                                                const lbl = opt?.children ?? opt?.label ?? "";
                                                setFieldValue(`${name}[${idx}].${c.labelField}`, lbl);
                                              }
                                            }}
                                          >
                                            {opts.map((o) => (
                                              <Select.Option key={o.value} value={o.value}>
                                                {o.label}
                                              </Select.Option>
                                            ))}
                                          </Select>
                                        );
                                      }

                                      return (
                                        c.type === "textarea" ? (
                                          <Input.TextArea
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            size="large"
                                            value={val}
                                            rows={c.rows || 1}
                                            placeholder={c.placeholder || ""}
                                            disabled={cellReadOnly}
                                            onChange={(e) => setFieldValue(path, e.target.value)}
                                          />
                                        ) : (
                                          <Input
                                            key={`${fieldKey}.${idx}.${colKey}`}
                                            size="large"
                                            value={val}
                                            placeholder={c.placeholder || ""}
                                            disabled={cellReadOnly}
                                            onChange={(e) => setFieldValue(path, e.target.value)}
                                          />
                                        )
                                      );
                                    })}

                                    {showExpand ? (
                                      <Button
                                        size="large"
                                        type="text"
                                        icon={<ColumnHeightOutlined rotate={expanded ? 90 : 0} />}
                                        onClick={() => toggleObjectArrayRow(name, idx)}
                                      />
                                    ) : null}

                                    {!readOnly ? (
                                      <Button
                                        size="large"
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => remove(idx)}
                                      />
                                    ) : null}
                                  </div>

                                  {showExpand && expanded && (
                                    <div
                                      style={{
                                        padding: 16,
                                        background: field.expandBg || "",
                                        borderTop: "1px dashed #ececec",
                                      }}
                                    >
                                      <Row gutter={[16, 16]}>
                                        {collapsedFields.map((c, extraIdx) => {
                                          const colKey = c.key ?? c.name ?? `extra-${extraIdx}`;
                                          return (
                                            <Col
                                              key={`${fieldKey}.${idx}.collapsed.${String(colKey)}`}
                                              {...getResponsiveColProps(c)}
                                            >
                                              <div style={{ marginBottom: 0 }}>
                                                {c.label ? (
                                                  <div
                                                    style={{
                                                      fontSize: 13,
                                                      fontWeight: 600,
                                                      color: "#1f2937",
                                                      marginBottom: 8,
                                                      lineHeight: 1.2,
                                                    }}
                                                  >
                                                    {c.label}
                                                  </div>
                                                ) : null}

                                                <div
                                                  style={{
                                                    display: "block",
                                                    width: "100%",
                                                  }}
                                                >
                                                  {renderExpandedField(c, r, idx)}
                                                </div>
                                              </div>
                                            </Col>
                                          );
                                        })}
                                      </Row>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {!readOnly && (
                              <div style={{ padding: 12, borderTop: "1px solid #f0f0f0" }}>
                                <Button
                                  size="large"
                                  type="dashed"
                                  icon={<PlusOutlined />}
                                  onClick={() => push(field.defaultItem || EMPTY_OBJECT)}
                                >
                                  {field.addButtonLabel || "Add Row"}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    </FieldArray>
                  );


                default:
                  return (
                    <div className="d-flex justify-content-start">
                      <Field
                        name={name}
                        as={Input}
                        size="large"
                        disabled={readOnly}
                        placeholder={field.placeholder || ""}
                        maxLength={field.maxLength}
                      />
                      {field?.component}
                    </div>
                  );
              }
            })()}
          </Form.Item>
        </Col>
      );
    };

    return (
      <Row gutter={[16, 12]}>
        {(fields || EMPTY_ARRAY).map((field, idx) => renderOneField(field, `root.${idx}.`))}
      </Row>
    );
  };

const submitRecord = async (values, isEditMode, editId) => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : EMPTY_OBJECT;

  const normalizedValues = normalizeFkValuesForSubmit(values);

  const basePayload =
    typeof transformPayload === "function"
      ? transformPayload(normalizedValues)
      : normalizedValues;

  const payloadHook = isEditMode ? beforeUpdatePayload : beforeCreatePayload;
  const payload =
    typeof payloadHook === "function"
      ? payloadHook(basePayload, { values: normalizedValues, isEditMode, editId })
      : basePayload;

  const containsFile = hasAnyFile(payload);

  const url = isEditMode
    ? buildResourceUrl(apiUrl, editId)
    : buildResourceUrl(apiUrl);

  if (!containsFile) {
    const res = isEditMode
      ? await axios.put(url, payload, {
          headers: { ...headers, "Content-Type": "application/json" },
        })
      : await axios.post(url, payload, {
          headers: { ...headers, "Content-Type": "application/json" },
        });

    return res.data;
  }

  const fd = buildFormData(payload);

  const res = isEditMode
    ? await axios.put(url, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      })
    : await axios.post(url, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });

  return res.data;
};

  const isFormOnlyMode = ui_type === "add form" || ui_type === "edit form";

  if (isFormOnlyMode) {
    const submitLabel = ui_type === "edit form" ? "Save" : "Save";

    return (
      <div className="pt-0">
        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { resetForm, setErrors }) => {
            try {
              setSubmitErrors(EMPTY_ARRAY);

              const isEditMode = ui_type === "edit form";
              const id = values.id || look_up_var;
              const savedRecord = await submitRecord(values, isEditMode, id);

              message.success("Saved successfully");
              setSubmitErrors(EMPTY_ARRAY);
              upsertSavedRecord(savedRecord);
              await refreshAfterSubmit();

              if (isEditMode) {
                if (typeof onEditSuccess === "function") await onEditSuccess(savedRecord, values);
              } else {
                if (typeof onAddSuccess === "function") await onAddSuccess(savedRecord, values);
                if (typeof handleAddedData === "function") await handleAddedData(savedRecord, values);
                resetForm();
              }
            } catch (err) {
              const { fieldErrors, globalErrors, allErrors } = parseBackendErrors(err, values);

              if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
              setSubmitErrors(allErrors);

              if (globalErrors.length) showGlobalErrorsNotification(globalErrors);
              else message.error("Validation failed");
            }
          }}
        >
          {({
            handleSubmit,
            submitForm,
            setFieldValue,
            errors,
            touched,
            values,
            isValid,
            isSubmitting,
          }) => {
            formikLiveRef.current = { setFieldValue, values };
            return (
              <CrudFormInner
                fields={fields}
                values={values}
                setFieldValue={setFieldValue}
                errors={errors}
                touched={touched}
                ui_type={ui_type}
                handleSubmit={handleSubmit}
                onFormValuesChange={onFormValuesChange}
                submitLabel={submitLabelOverride || submitLabel}
                renderFormFields={renderFormFields}
                submitErrors={submitErrors}
                hideSubmitButton={hideSubmitButton}
                onSubmitButtonClick={onSubmitButtonClick}
                renderSubmitButton={renderSubmitButton}
                hydrateFkLabels={hydrateMissingFkLabel}
                submitMeta={{
                  values,
                  errors,
                  touched,
                  handleSubmit,
                  submitForm,
                  setFieldValue,
                  isValid,
                  isSubmitting,
                  editingRecord: null,
                }}
              />
            );
          }}
        </Formik>
      </div>
    );
  }

  const formTitle = editingRecord ? `Edit ${title?.slice?.(0, -1) || title}` : `Add ${title}`;

  const formNode = (
    <Formik
      enableReinitialize
      initialValues={editingRecord || crudInitialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { resetForm, setErrors }) => {
        try {
          setSubmitErrors(EMPTY_ARRAY);

          const isEditMode = !!editingRecord;
          const id = editingRecord?.id;
          const savedRecord = await submitRecord(values, isEditMode, id);

          message.success("Saved successfully");
          setSubmitErrors(EMPTY_ARRAY);
          upsertSavedRecord(savedRecord);
          await refreshAfterSubmit();

          if (isEditMode) {
            if (typeof onEditSuccess === "function") await onEditSuccess(savedRecord, values);
          } else {
            if (typeof onAddSuccess === "function") await onAddSuccess(savedRecord, values);
            if (typeof handleAddedData === "function") await handleAddedData(savedRecord, values);
          }

          setVisible(false);
          resetForm();
        } catch (err) {
          const { fieldErrors, globalErrors, allErrors } = parseBackendErrors(err, values);

          if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
          setSubmitErrors(allErrors);

          if (globalErrors.length) showGlobalErrorsNotification(globalErrors);
          else message.error("Validation failed");
        }
      }}
    >
      {({
        handleSubmit,
        submitForm,
        setFieldValue,
        errors,
        touched,
        values,
        isValid,
        isSubmitting,
      }) => {
        formikLiveRef.current = { setFieldValue, values };

        const submitMeta = {
          values,
          errors,
          touched,
          handleSubmit,
          submitForm,
          setFieldValue,
          isValid,
          isSubmitting,
          editingRecord,
        };

        const inner = (
          <CrudFormInner
            fields={fields}
            values={values}
            setFieldValue={setFieldValue}
            errors={errors}
            ui_type={ui_type}
            touched={touched}
            handleSubmit={handleSubmit}
            onFormValuesChange={onFormValuesChange}
            submitLabel={submitLabelOverride || (editingRecord ? "Save" : "Save")}
            renderFormFields={renderFormFields}
            hideSubmitButton={hideSubmitButton || form_ui === "drawer"}
            submitErrors={submitErrors}
            onSubmitButtonClick={onSubmitButtonClick}
            renderSubmitButton={renderSubmitButton}
            hydrateFkLabels={hydrateMissingFkLabel}
            submitMeta={submitMeta}
          />
        );

        if (form_ui === "drawer") {
          return (
            <>
              {(ui_type !== "add form" || ui_type !== "edit form") && (
                <Drawer
                  width={computedDrawerWidth}
                  title={formTitle}
                  open={visible}
                  onClose={() => {
                    setVisible(false);
                    setSubmitErrors(EMPTY_ARRAY);
                  }}
                  destroyOnClose
                  extra={
                    hideSubmitButton
                      ? null
                      : typeof renderSubmitButton === "function"
                        ? renderSubmitButton(submitMeta)
                        : (
                          <Button
                            type="primary"
                            onClick={
                              typeof onSubmitButtonClick === "function"
                                ? () => onSubmitButtonClick(submitMeta)
                                : submitForm
                            }
                            disabled={!isValid || isSubmitting}
                            loading={isSubmitting}
                            style={{ minWidth: 120 }}
                          >
                            {submitLabelOverride || (editingRecord ? "Update" : "Save")}
                          </Button>
                        )
                  }
                >
                  {inner}
                </Drawer>
              )}
            </>
          );
        }



        return (
          <>
            {(ui_type !== "add form" || ui_type !== "edit form") && (
              <Modal
                style={modalStyle}
                title={formTitle}
                open={visible}
                width={computedModalWidth}
                onCancel={() => {
                  setVisible(false);
                  setSubmitErrors(EMPTY_ARRAY);
                }}
                footer={null}
                destroyOnClose
              >
                {inner}
              </Modal>
            )}
          </>
        );
      }}
    </Formik>
  );

  const headerRight = (
    <>

      {custom_add ? (
        <Link to={custom_add_link}>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            style={{ borderRadius: 2, fontWeight: 650 }}
          >
            ADD NEW
          </Button>
        </Link>
      ) : (<></>)}
      {canAdd && !button_ui && ui_type !== "add_related" && (

        <Button
          icon={<PlusOutlined />}
          type="primary"
          style={{ borderRadius: 2, fontWeight: 650 }}
          onClick={() => {
            setSubmitErrors(EMPTY_ARRAY);
            setEditingRecord(null);
            setVisible(true);
          }}
        >
          ADD NEW
        </Button>


      )}

      {hasActions && canView && (
        <Dropdown menu={{ items: topMenuItems }} placement="bottomLeft" trigger={["click"]}>
          <Button icon={<MoreOutlined />}></Button>
        </Dropdown>
      )}
    </>
  );

  return (
    <>
      {hasAnchors && (
        <AnchorFilterTabs
          items={anchorFilters}
          activeKey={activeAnchorKey}
          onChange={(k) => changeAnchor(k)}
          leftTitle={title}
          rightNode={headerRight}


        />
      )}

      {ui_type === "add_related" ? (
        <Button
          onClick={() => {
            setSubmitErrors(EMPTY_ARRAY);
            setVisible(true);
          }}
        >
          <PlusOutlined />
        </Button>
      ) : button_ui ? (
        <Button
          size="large"
          type="default"
          icon={button_ui_id ? <EditOutlined /> : <PlusOutlined />}
          onClick={handleQuickButtonClick}
          disabled={(button_ui_id && !canEdit) || (!button_ui_id && !canAdd)}
        >
          {button_ui_id ? `Edit ${title?.slice?.(0, -1) || title}` : `Add ${title?.slice?.(0, -1) || title}`}
        </Button>
      ) : (
        <div>
          <div className="p-0">
            {canView && selectedRowKeys.length > 0 && bulkactions?.length > 0 && (
              <div
                style={{
                  marginBottom: 0,
                  padding: "8px 12px",

                  border: "1px solid #b7eb8f",
                  borderRadius: 4,
                }}
              >
                <span style={{ marginRight: 12, fontWeight: 700 }}>
                  Actions ({selectedRowKeys.length} selected):
                </span>
                {bulkactions.map((action, index) => (
                  <Button
                    key={index}
                    type="text"
                    size="small"
                    onClick={async () => {
                      try {
                        const recordsToUpdate = (data || EMPTY_ARRAY).filter((row) =>
                          selectedRowKeys.includes(row?.id)
                        );

                        if (!recordsToUpdate.length) {
                          message.warning("No records selected");
                          return;
                        }

                        const payload = recordsToUpdate.map((record) => ({
                          ...sanitizeBulkActionRecord(record),
                          ...(action?.actions || EMPTY_OBJECT),
                        }));

                        await axios.put(apiUrl, payload, {
                          headers: {
                            ...authHeaders,
                            "Content-Type": "application/json",
                          },
                        });

                        message.success(`${action.label} applied to ${payload.length} items`);
                        fetchData({ page: 1, pageSize: pagination.pageSize, search: searchText });
                        setPagination((p) => ({ ...p, current: 1 }));
                        setSelectedRowKeys([]);
                      } catch (e) {
                        console.error(e);
                        message.error("Bulk action failed");
                      }
                    }}
                    style={{ marginRight: 8 }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {(!hasAnchors || button_ui) && (
              <div className="flex gap-2 mb-0 bg-white">
                <Row justify="space-between" style={{ width: "100%" }} className="m-0">
                  {showSearch && canView && (
                    <Col xs={16} style={{ display: "flex", gap: 6 }}>
                      <Input
                        size="large"
                        placeholder={`Search ${title}`}
                        allowClear
                        value={searchText}
                        onChange={(e) => {
                          setSearchText(e.target.value);
                          setPagination((p) => ({ ...p, current: 1 }));
                        }}
                        style={{ width: "100%", borderRadius: 0 }}
                      />
                    </Col>
                  )}

                  <Col xs={8} style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    {custom_add ? (
                      <Link to={custom_add_link}>
                        <Button
                          icon={<PlusOutlined />}
                          type="primary"
                          style={{ borderRadius: 2, fontWeight: 650 }}
                        >
                          ADD NEW
                        </Button>
                      </Link>
                    ) : (<></>)}
                    {canAdd && (
                      <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={() => {
                          setSubmitErrors(EMPTY_ARRAY);
                          setEditingRecord(null);
                          setVisible(true);
                        }}
                      >
                        Add New
                      </Button>
                    )}

                    {hasActions && canView && (
                      <Dropdown menu={{ items: topMenuItems }} placement="bottomLeft" trigger={["click"]}>
                        <Button icon={<MoreOutlined />} type="icon"></Button>
                      </Dropdown>
                    )}
                  </Col>
                </Row>
              </div>
            )}

            {hasAnchors && showSearch && canView && (
              <div
                className="d-flex justify-content-space-between w-100"
                style={{ padding: "0px", borderBottom: "1px solid #eef0f4" }}
              >
                <div className="border w-100">
                  <Input
                    size="large"
                    prefix={<SearchOutlined />}
                    placeholder={`Search ${title}`}
                    allowClear
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setPagination((p) => ({ ...p, current: 1 }));
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      borderRadius: 0,
                      border: 0,
                      padding: "8px 12px",
                      height: "100%",
                    }}
                  />
                </div>



              </div>
            )}

            {canView ? (
              <div style={{ padding: "0px" }}>
                <Table
                  rowKey="id"
                  columns={mainColumns}
                  size="small"
                  dataSource={filteredData}
                  onRow={activeTableRowFunction}
                  loading={loading}
                  rowSelection={canView ? { selectedRowKeys, onChange: setSelectedRowKeys } : null}
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                  }}
                  onChange={(pager, filters, sorter) => {
                    setPagination((p) => ({
                      ...p,
                      current: pager.current,
                      pageSize: pager.pageSize,
                    }));

                    const s = Array.isArray(sorter) ? sorter?.[0] : sorter;
                    const sortField = s?.column?.sortField || s?.field || s?.columnKey || null;
                    const sortOrder = s?.order || null;

                    if (sortMode === "ordering") {
                      setSortState({
                        field: sortField,
                        order: sortOrder,
                        ordering: sortField
                          ? toOrderingValue(sortField, sortOrder, orderingMinusForDesc)
                          : "",
                      });
                    } else {
                      setSortState({
                        field: sortField,
                        order: sortOrder,
                        ordering: "",
                      });
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: "12px 16px", color: "#999" }}>
                You do not have permission to view this list.
              </div>
            )}
          </div>
        </div>
      )}

      {formNode}

      {canView && enableInactiveDrawer && (
        <Drawer
          width={900}
          title={`Inactive ${title} (${inactivePagination.total ?? filteredInactiveData.length})`}
          closable
          onClose={() => {
            setInactiveDrawer(false);
            setSelectedInactiveRowKeys(EMPTY_ARRAY);
          }}
          open={inactiveDrawer}
          extra={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                disabled={!selectedInactiveRowKeys.length}
                onClick={bulkActivate}
              >
                Activate Selected ({selectedInactiveRowKeys.length})
              </Button>

              <Input
                placeholder={`Search inactive ${title}`}
                allowClear
                value={inactiveSearchText}
                onChange={(e) => {
                  setInactiveSearchText(e.target.value);
                  setInactivePagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 240 }}
              />
            </div>
          }
        >
          <Table
            rowKey="id"
            columns={inactiveColumns}
            dataSource={filteredInactiveData}
            loading={inactiveLoading}
            rowSelection={
              canView
                ? {
                  selectedRowKeys: selectedInactiveRowKeys,
                  onChange: setSelectedInactiveRowKeys,
                }
                : null
            }
            pagination={{
              current: inactivePagination.current,
              pageSize: inactivePagination.pageSize,
              total: inactivePagination.total,
              showSizeChanger: true,
            }}
            onChange={(pager, filters, sorter) => {
              setInactivePagination((p) => ({
                ...p,
                current: pager.current,
                pageSize: pager.pageSize,
              }));

              const s = Array.isArray(sorter) ? sorter?.[0] : sorter;
              const sortField = s?.column?.sortField || s?.field || s?.columnKey || null;
              const sortOrder = s?.order || null;

              if (sortMode === "ordering") {
                setSortState({
                  field: sortField,
                  order: sortOrder,
                  ordering: sortField
                    ? toOrderingValue(sortField, sortOrder, orderingMinusForDesc)
                    : "",
                });
              } else {
                setSortState({
                  field: sortField,
                  order: sortOrder,
                  ordering: "",
                });
              }
            }}
          />
        </Drawer>
      )}
    </>
  );
}