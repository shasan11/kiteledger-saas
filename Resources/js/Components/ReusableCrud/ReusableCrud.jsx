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
  Drawer,
  Checkbox,
  Collapse,
  Dropdown,
  notification,
  AutoComplete,
  Space,
  theme,
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
  ColumnHeightOutlined,
  FilterOutlined,
  InboxOutlined,
  LockOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Formik, Field, FieldArray } from "formik";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import { router } from "@inertiajs/react";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "./constants";
import AnchorFilterTabs from "./components/AnchorFilterTabs";
import StableDatePicker from "./components/StableDatePicker";
import BackendAutocomplete from "./components/BackendAutocomplete";
import CrudTransfer from "./components/CrudTransfer";
import CrudFormInner from "./components/CrudFormInner";
import QuickAddModal from "./components/QuickAddModal";

import { buildFormData } from "./utils/formData";
import { parseBackendErrors, showGlobalErrorsNotification } from "./utils/errors";
import { getFkLabel, getFkLabelFromValues, getFkValue, normalizeOption } from "./utils/fk";
import { appendQueryParams, resolveDynamicParams, safeHashGet, safeHashSet, toOrderingValue } from "./utils/query";
import { getAuthToken, resolveUrl } from "./utils/urls";
import {
  cleanUploadValuesForSubmit,
  getSingleUploadFileList,
  hasAnyFile,
  openUploadPreview,
  validateUploadFile,
} from "./utils/upload";
import { getResponsiveColProps } from "./utils/values";

const { Panel } = Collapse;
const { Dragger } = Upload;

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
  transformRecord = null,

  baseFilters = EMPTY_OBJECT,
  sortMode = "ordering",
  orderingParam = "ordering",
  sortFieldParam = "sort_by",
  sortOrderParam = "sort_order",
  defaultSortField = null,
  defaultSortOrder = null,
  orderingMinusForDesc = true,

  updateMethod = "patch",
}) {
  const { token } = theme.useToken();

  const ui = useMemo(
    () => ({
      shell: {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
      },
      toolbar: {
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: token.paddingSM,
      },
      searchBar: {
        width: "100%",
        borderRadius: token.borderRadius,
      },
      bulkBar: {
        marginBottom: token.marginSM,
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        border: `1px solid ${token.colorSuccessBorder}`,
        background: token.colorSuccessBg,
        borderRadius: token.borderRadiusLG,
        display: "flex",
        alignItems: "center",
        gap: token.marginSM,
        flexWrap: "wrap",
      },
      tableWrap: {
        background: token.colorBgContainer,
      },
      actionBtn: {
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      },
      lockedCell: {
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: token.borderRadius,
        color: token.colorTextTertiary,
        background: token.colorFillQuaternary,
        cursor: "not-allowed",
      },
      formGroup: {
        marginBottom: token.marginMD,
        padding: token.paddingMD,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
      },
      formGroupTitle: {
        fontWeight: 700,
        marginBottom: token.marginSM,
        color: token.colorText,
      },
      filterDropdown: {
        padding: token.paddingSM,
        width: 260,
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
      },
      filterActions: {
        display: "flex",
        gap: token.marginXS,
        justifyContent: "flex-end",
        marginTop: token.marginXS,
      },
      objectArrayWrap: {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
        background: token.colorBgContainer,
      },
      objectArrayHead: {
        display: "grid",
        gap: token.marginXS,
        padding: `${token.paddingSM}px ${token.paddingMD}px`,
        background: token.colorFillAlter,
        color: token.colorText,
        fontWeight: 700,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      },
      objectArrayRow: {
        display: "grid",
        gap: token.marginXS,
        padding: `${token.paddingSM}px ${token.paddingMD}px`,
        alignItems: "center",
      },
      objectArrayExpanded: {
        padding: token.paddingMD,
        background: token.colorFillQuaternary,
        borderTop: `1px dashed ${token.colorBorder}`,
      },
      upload: {
        width: "100%",
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter,
      },
      uploadPill: {
        marginTop: 4,
        fontSize: 12,
        color: token.colorTextSecondary,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 999,
        padding: "6px 12px",
      },
      permissionBox: {
        padding: `${token.paddingSM}px ${token.paddingMD}px`,
        color: token.colorTextTertiary,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
      },
      formOnlyPage: {
        minHeight: "100vh",
        background: token.colorBgLayout,
        padding: "0 clamp(24px, 8vw, 140px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        overflowY: "auto",
      },
      formOnlyShell: {
        width: "100%",
        maxWidth: 1280,
        minHeight: "100vh",
        background: token.colorBgContainer,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        borderTop: "none",
        borderBottom: "none",
        borderRadius: 0,
        boxShadow: token.boxShadowTertiary || "0 8px 28px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      },
      formOnlyHeader: {
        minHeight: 76,
        padding: `3px ${token.paddingSM}px`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: token.marginMD,
        background: token.colorBgContainer,
        position: "sticky",
        top: 0,
        zIndex: 5,
      },
      formOnlyTitleWrap: {
        minWidth: 0,
      },
      formOnlyTitle: {
        margin: 0,
        fontSize: token.fontSizeXL,
        fontWeight: 700,
        lineHeight: token.lineHeightHeading3,
        color: token.colorText,
      },
      formOnlySubtitle: {
        marginTop: 2,
        fontSize: token.fontSizeSM,
        color: token.colorTextSecondary,
      },
      formOnlyActions: {
        display: "flex",
        alignItems: "center",
        gap: token.marginSM,
        flexShrink: 0,
      },
      formOnlyBody: {
        padding: `${token.paddingLG}px ${token.paddingXL}px ${token.paddingXL}px`,
        background: token.colorBgContainer,
      },
    }),
    [token]
  );

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
  const [quickAddState, setQuickAddState] = useState(null);

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

  const recordUrl = useCallback((base, id) => {
    const normalizedBase = String(base || "").replace(/\/+$/, "");
    return `${normalizedBase}/${encodeURIComponent(id)}/`;
  }, []);

  const baseUrl = useMemo(
    () => `${apiUrl}${filterUrl ? filterUrl : ""}`,
    [apiUrl, filterUrl]
  );

  const applyRecordTransform = useCallback(
    (record) => {
      if (!record || typeof transformRecord !== "function") return record;

      try {
        return transformRecord(record) || record;
      } catch (error) {
        console.error("Failed to transform CRUD record:", error);
        return record;
      }
    },
    [transformRecord]
  );

  const applyRecordsTransform = useCallback(
    (records) => (Array.isArray(records) ? records.map((record) => applyRecordTransform(record)) : records),
    [applyRecordTransform]
  );

  const flattenFields = useCallback((arr, out = []) => {
    (arr || []).forEach((f) => {
      if (!f) return;

      if (f.type === "group" && Array.isArray(f.children)) {
        flattenFields(f.children, out);
      } else {
        out.push(f);
      }
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

  const normalizeFileValuesForSubmit = useCallback(
    (inputValues, options = EMPTY_OBJECT) =>
      cleanUploadValuesForSubmit(inputValues, fields, options),
    [fields]
  );

  const sanitizeBulkActionRecord = useCallback(
    (record) => {
      const cleaned = { ...(record || EMPTY_OBJECT) };

      delete cleaned.key;
      delete cleaned.fk_detail;

      Object.keys(cleaned).forEach((k) => {
        if (k.endsWith("_detail")) delete cleaned[k];
      });

      const fkNormalized = normalizeFkValuesForSubmit(cleaned);

      return normalizeFileValuesForSubmit(fkNormalized, {
        isEditMode: true,
        originalRecord: record,
      });
    },
    [normalizeFkValuesForSubmit, normalizeFileValuesForSubmit]
  );

  const formikLiveRef = useRef({ setFieldValue: null, values: null });
  const [fkStore, setFkStore] = useState(EMPTY_OBJECT);
  const fkTimersRef = useRef(EMPTY_OBJECT);

  const isSystemGeneratedRecord = useCallback((record) => {
    return !!record?.is_system_generated;
  }, []);

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

    return exists ? list || EMPTY_ARRAY : [normalized, ...(list || EMPTY_ARRAY)];
  };

  const fetchFkOptionById = useCallback(
    async (fieldName, id) => {
      const field = fieldByName[fieldName];

      if (!field?.fkUrl || id == null || id === "") return null;

      try {
        const detailUrl = recordUrl(resolveUrl(field.fkUrl), id);
        const res = await axios.get(detailUrl, { headers: authHeaders });
        return toFkOption(res?.data, field);
      } catch (error) {
        return null;
      }
    },
    [fieldByName, recordUrl, authHeaders]
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

      const id =
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
          setData(applyRecordsTransform(res.data.results));
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
          setData(applyRecordsTransform(res.data));
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
      applyRecordsTransform,
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
          setInactiveRows(applyRecordsTransform(res.data.results));
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

          setInactiveRows(applyRecordsTransform(list));
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
      applyRecordsTransform,
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

  const upsertSavedRecord = useCallback(
    (savedRecord) => {
      const normalizedRecord = applyRecordTransform(savedRecord);

      if (!normalizedRecord?.id) return;

      const isActiveRecord = normalizedRecord?.hasOwnProperty("active")
        ? !!normalizedRecord.active
        : normalizedRecord?.hasOwnProperty("is_active")
          ? !!normalizedRecord.is_active
          : true;

      setData((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const next = list.filter((item) => String(item?.id) !== String(normalizedRecord.id));
        return isActiveRecord ? [normalizedRecord, ...next] : next;
      });

      setInactiveRows((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const next = list.filter((item) => String(item?.id) !== String(normalizedRecord.id));
        return isActiveRecord ? next : [normalizedRecord, ...next];
      });
    },
    [applyRecordTransform]
  );

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
          setEditingRecord(applyRecordTransform(fromList));
          setVisible(true);
          return;
        }

        if (openEditId != null) {
          try {
            const r = await axios.get(recordUrl(apiUrl, openEditId), { headers: authHeaders });
            setEditingRecord(applyRecordTransform(r.data));
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
  }, [openOnMount, openMode, openEditId, data, apiUrl, recordUrl, authHeaders, applyRecordTransform]);

  useEffect(() => {
    const init = async () => {
      setSubmitErrors(EMPTY_ARRAY);

      if (ui_type === "edit form") {
        if (look_up_var && typeof look_up_var === "object") {
          setFormInitialValues(applyRecordTransform(look_up_var));
        } else if (look_up_var) {
          try {
            const { data: rec } = await axios.get(recordUrl(apiUrl, look_up_var), {
              headers: authHeaders,
            });

            setFormInitialValues(applyRecordTransform(rec));
          } catch (err) {
            console.error("Failed to fetch record for edit form:", err);
          }
        }
      } else if (ui_type === "add form") {
        setFormInitialValues(crudInitialValues || EMPTY_OBJECT);
      }
    };

    init();
  }, [ui_type, look_up_var, apiUrl, recordUrl, authHeaders, crudInitialValues, applyRecordTransform]);

  const updateRecordActiveState = async (record, nextActive) => {
    if (isSystemGeneratedRecord(record)) {
      message.warning("System generated records cannot be changed");
      return;
    }

    const updateField = record?.hasOwnProperty("active") ? "active" : "is_active";
    const normalizedRecord = normalizeFkValuesForSubmit(record);

    await axios.put(
      recordUrl(apiUrl, record.id),
      { ...normalizedRecord, [updateField]: nextActive },
      { headers: authHeaders }
    );
  };

  const softDelete = async (record) => {
    if (isSystemGeneratedRecord(record)) {
      message.warning("System generated records cannot be inactivated");
      return;
    }

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
    if (isSystemGeneratedRecord(record)) {
      message.warning("System generated records cannot be activated manually");
      return;
    }

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
    if (isSystemGeneratedRecord(record)) {
      message.warning("System generated records cannot be deleted");
      return;
    }

    await axios.delete(recordUrl(apiUrl, record.id), { headers: authHeaders });

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

    for (let i = 0; i < wbout.length; ++i) {
      view[i] = wbout.charCodeAt(i) & 0xff;
    }

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

  const submitRecord = async (values, isEditMode, editId) => {
    const tokenValue = getAuthToken();
    const headers = tokenValue ? { Authorization: `Bearer ${tokenValue}` } : EMPTY_OBJECT;

    const originalRecord = isEditMode
      ? editingRecord || formInitialValues || crudInitialValues || EMPTY_OBJECT
      : EMPTY_OBJECT;

    const normalizedValues = normalizeFkValuesForSubmit(values);

    const uploadSafeValues = normalizeFileValuesForSubmit(normalizedValues, {
      isEditMode,
      originalRecord,
    });

    const transformedPayload =
      typeof transformPayload === "function"
        ? transformPayload(uploadSafeValues, { isEditMode, editingRecord: originalRecord })
        : uploadSafeValues;

    const payload = normalizeFileValuesForSubmit(transformedPayload, {
      isEditMode,
      originalRecord,
    });

    const containsFile = hasAnyFile(payload);
    const method = isEditMode ? String(updateMethod || "patch").toLowerCase() : "post";
    const url = isEditMode ? recordUrl(apiUrl, editId) : apiUrl;

    const res = await axios({
      method,
      url,
      data: containsFile ? buildFormData(payload) : payload,
      headers: containsFile
        ? headers
        : { ...headers, "Content-Type": "application/json" },
    });

    return res.data;
  };

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
    const allowedIds = selectedRowKeys.filter((id) => {
      const rec = (data || EMPTY_ARRAY).find((d) => d.id === id);
      return rec && !isSystemGeneratedRecord(rec);
    });

    if (!allowedIds.length) {
      message.warning("No editable records selected");
      return;
    }

    await Promise.all(
      allowedIds.map((id) => {
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
    const allowedIds = selectedInactiveRowKeys.filter((id) => {
      const rec = (inactiveRows || EMPTY_ARRAY).find((d) => d.id === id);
      return rec && !isSystemGeneratedRecord(rec);
    });

    if (!allowedIds.length) {
      message.warning("No editable records selected");
      return;
    }

    await Promise.all(
      allowedIds.map((id) => {
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

      const loadFilterAutocomplete = async (search = "", setter = () => {}) => {
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
              <div style={ui.filterDropdown}>
                <Select
                  allowClear
                  showSearch
                  style={{ width: "100%" }}
                  placeholder={`Filter ${filterTitle}`}
                  value={currentValue || undefined}
                  onChange={(val) => {
                    const next = { ...columnFilters };

                    if (val === undefined || val === null || val === "") {
                      delete next[paramName];
                    } else {
                      next[paramName] = val;
                    }

                    setColumnFilters(next);
                    setPagination((p) => ({ ...p, current: 1 }));
                    confirm();
                  }}
                  options={options}
                />

                <div style={ui.filterActions}>
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
                <div style={ui.filterDropdown}>
                  <AutoComplete
                    style={{ width: "100%" }}
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

                  <div style={ui.filterActions}>
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
            <div style={ui.filterDropdown}>
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
              />

              <div style={ui.filterActions}>
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
          <FilterOutlined
            style={{
              color: columnFilters?.[paramName] ? token.colorPrimary : token.colorTextTertiary,
            }}
          />
        ),
      };
    },
    [columnFilters, authHeaders, token, ui]
  );

  const getRowActionItems = (record, isInactive = false) => {
    if (isSystemGeneratedRecord(record)) {
      return [{ key: "locked", label: "System generated", icon: <LockOutlined />, disabled: true }];
    }

    const items = [];

    if (canEdit) {
      items.push({
        key: "edit",
        icon: <EditOutlined />,
        label: "Edit",
        onClick: () => {
          setSubmitErrors(EMPTY_ARRAY);
          setEditingRecord(applyRecordTransform(record));
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

            const normalizedRecord = sanitizeBulkActionRecord(record);

            await axios({
              method: String(updateMethod || "patch").toLowerCase(),
              url: recordUrl(apiUrl, record.id),
              data: { ...normalizedRecord, ...action.actions },
              headers: { ...authHeaders, "Content-Type": "application/json" },
            });

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
          icon: <ReloadOutlined style={{ color: token.colorSuccess }} />,
          label: "Activate",
          onClick: () => activate(record),
        });

        items.push({
          key: "delete",
          icon: <DeleteOutlined />,
          label: "Delete Permanently",
          danger: true,
          onClick: () => deletePermanent(record),
        });
      }
    } else if (canDelete) {
      items.push({
        key: "inactivate",
        icon: <DeleteOutlined />,
        label: "Inactivate",
        danger: true,
        onClick: () => softDelete(record),
      });
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
          label: "Export this page",
          onClick: handleExport,
        },
        
        {
          key: "export-all",
          icon: <DownloadOutlined />,
          label: "Export all records",
          onClick: handleExportAll,
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
        icon: <DeleteOutlined />,
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
                selectedRowKeys: selectedRowKeys.filter((id) => {
                  const rec = (data || EMPTY_ARRAY).find((row) => row?.id === id);
                  return rec && !isSystemGeneratedRecord(rec);
                }),
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
    isSystemGeneratedRecord,
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

            return (
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  router.visit(path);
                }}
                style={{ padding: 0 }}
              >
                View
              </Button>
            );
          },
        }
      : null;

  const actionColumn = hasActionColumns
    ? {
        key: "__actions",
        title: "",
        fixed: "right",
        width: 48,
        align: "center",
        render: (_, record) => {
          if (isSystemGeneratedRecord(record)) {
            return (
              <span
                title="System generated record"
                style={ui.lockedCell}
                onClick={(e) => e.stopPropagation()}
              >
                <LockOutlined style={{ fontSize: 15 }} />
              </span>
            );
          }

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                menu={{ items: getRowActionItems(record, false) }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  shape="circle"
                  icon={<MoreOutlined style={{ fontSize: 18 }} />}
                  onClick={(e) => e.stopPropagation()}
                  style={ui.actionBtn}
                />
              </Dropdown>
            </div>
          );
        },
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
          title: "",
          key: "__inactive_actions",
          fixed: "right",
          width: 48,
          align: "center",
          render: (_, record) => {
            if (isSystemGeneratedRecord(record)) {
              return (
                <span
                  title="System generated record"
                  style={ui.lockedCell}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LockOutlined style={{ fontSize: 15 }} />
                </span>
              );
            }

            return (
              <Dropdown
                menu={{ items: getRowActionItems(record, true) }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  shape="circle"
                  icon={<EllipsisOutlined />}
                  style={ui.actionBtn}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            );
          },
        },
      ]
    : [...processedColumns, ...(viewColumn ? [viewColumn] : [])];

  const handleQuickButtonClick = () => {
    setSubmitErrors(EMPTY_ARRAY);

    if (button_ui_id) {
      const rec = (data || EMPTY_ARRAY).find((d) => d.id === button_ui_id);
      setEditingRecord(applyRecordTransform(rec) || null);
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
          <Row gutter={[16, 12]}>
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
                style={{
                  marginBottom: token.marginSM,
                  background: token.colorBgContainer,
                  borderRadius: token.borderRadiusLG,
                }}
                bordered={field.bordered ?? false}
                defaultActiveKey={
                  field.defaultOpen === undefined
                    ? [fieldKey]
                    : field.defaultOpen
                      ? [fieldKey]
                      : EMPTY_ARRAY
                }
              >
                <Panel header={field.label} key={fieldKey}>
                  {groupInner}
                </Panel>
              </Collapse>
            ) : (
              <div style={ui.formGroup}>
                {field.label && <div style={ui.formGroupTitle}>{field.label}</div>}
                {groupInner}
              </div>
            )}
          </Col>
        );
      }

      return (
        <Col key={fieldKey} {...getResponsiveColProps(field)} className="px-2 py-0">
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
                      size="medium"
                      rows={field.rows || 1}
                      placeholder={field.placeholder || ""}
                      disabled={readOnly}
                    />
                  );

                case "button":
                  return (
                    <Button
                      size="medium"
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
                      size="medium"
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
                      size="medium"
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

                  const selectEl = (
                    <Select
                      showSearch
                      size="medium"
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

                  if (!field.quickAdd) return selectEl;

                  const canQuickEdit =
                    field.quickAdd.allowEdit !== false &&
                    finalVal !== undefined &&
                    finalVal !== null &&
                    finalVal !== "";

                  return (
                    <Space.Compact block>
                      {selectEl}

                      <Button
                        icon={<PlusOutlined />}
                        size="medium"
                        disabled={readOnly}
                        title={`Quick add ${field.quickAdd.title || name}`}
                        onClick={() => setQuickAddState({ mode: "add", fieldName: name, field })}
                      />

                      {canQuickEdit && (
                        <Button
                          icon={<EditOutlined />}
                          size="medium"
                          disabled={readOnly}
                          title={`Quick edit ${field.quickAdd.title || name}`}
                          onClick={async () => {
                            let record =
                              detailCurrent ||
                              (rawCurrent && typeof rawCurrent === "object" ? rawCurrent : null);

                            if (!record || !record.id) {
                              const opt = await fetchFkOptionById(name, finalVal);
                              record = opt?.raw || record;
                            }

                            setQuickAddState({
                              mode: "edit",
                              fieldName: name,
                              field,
                              recordId: finalVal,
                              record: record || { id: finalVal },
                            });
                          }}
                        />
                      )}
                    </Space.Compact>
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
                      onDetailChange={(details) => setFieldValue(`${name}_detail`, details, false)}
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
                      size="medium"
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
                      size="medium"
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
                      size="medium"
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
                        ...ui.upload,
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
                            color: token.colorText,
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
                            color: token.colorTextSecondary,
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
                        ...ui.upload,
                        border: `1px dashed ${hasImage ? token.colorSuccessBorder : token.colorBorder}`,
                        background: hasImage ? token.colorSuccessBg : token.colorFillAlter,
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
                            background: hasImage ? token.colorSuccessBgHover : token.colorPrimaryBg,
                            color: hasImage ? token.colorSuccess : token.colorPrimary,
                            fontSize: 24,
                          }}
                        >
                          <InboxOutlined />
                        </div>

                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: token.colorText,
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
                            color: token.colorTextSecondary,
                            maxWidth: 280,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {hasImage
                            ? "Click to replace or preview the selected image"
                            : "Drag and drop an image here, or click to browse"}
                        </div>

                        <div style={ui.uploadPill}>Only images • Max {field.maxSizeMB ?? 5} MB</div>
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
                                size="medium"
                                value={item}
                                disabled={readOnly}
                                onChange={(e) => setFieldValue(`${name}[${index}]`, e.target.value)}
                                placeholder={field.itemPlaceholder || field.placeholder || ""}
                              />

                              {!readOnly && (
                                <Button size="medium" type="link" danger onClick={() => remove(index)}>
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
                                size="medium"
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
                                size="medium"
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
                                size="medium"
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
                              size="medium"
                              value={val}
                              placeholder={c.placeholder || ""}
                              disabled={cellReadOnly}
                              onChange={(e) => setFieldValue(path, e.target.value)}
                            />
                          );
                        };

                        return (
                          <div style={ui.objectArrayWrap}>
                            <div
                              style={{
                                ...ui.objectArrayHead,
                                gridTemplateColumns,
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
                                <div
                                  key={`${fieldKey}.${idx}`}
                                  style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
                                >
                                  <div
                                    style={{
                                      ...ui.objectArrayRow,
                                      gridTemplateColumns,
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
                                              size="medium"
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
                                            size="medium"
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
                                            size="medium"
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
                                            size="medium"
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

                                      return c.type === "textarea" ? (
                                        <Input.TextArea
                                          key={`${fieldKey}.${idx}.${colKey}`}
                                          size="medium"
                                          value={val}
                                          rows={c.rows || 1}
                                          placeholder={c.placeholder || ""}
                                          disabled={cellReadOnly}
                                          onChange={(e) => setFieldValue(path, e.target.value)}
                                        />
                                      ) : (
                                        <Input
                                          key={`${fieldKey}.${idx}.${colKey}`}
                                          size="medium"
                                          value={val}
                                          placeholder={c.placeholder || ""}
                                          disabled={cellReadOnly}
                                          onChange={(e) => setFieldValue(path, e.target.value)}
                                        />
                                      );
                                    })}

                                    {showExpand ? (
                                      <Button
                                        size="medium"
                                        type="text"
                                        icon={<ColumnHeightOutlined rotate={expanded ? 90 : 0} />}
                                        onClick={() => toggleObjectArrayRow(name, idx)}
                                      />
                                    ) : null}

                                    {!readOnly ? (
                                      <Button
                                        size="medium"
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => remove(idx)}
                                      />
                                    ) : null}
                                  </div>

                                  {showExpand && expanded && (
                                    <div style={ui.objectArrayExpanded}>
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
                                                      color: token.colorTextSecondary,
                                                      marginBottom: 8,
                                                      lineHeight: 1.2,
                                                    }}
                                                  >
                                                    {c.label}
                                                  </div>
                                                ) : null}

                                                <div style={{ display: "block", width: "100%" }}>
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
                              <div
                                style={{
                                  padding: token.paddingMD,
                                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                                }}
                              >
                                <Button
                                  size="medium"
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
                        size="medium"
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

  const renderQuickAddModal = () => {
    if (!quickAddState?.field?.quickAdd) return null;

    const { fieldName, field, mode = "add", recordId, record } = quickAddState;
    const quickAdd = field.quickAdd;
    const isQuickEdit = mode === "edit";
    const quickValueKey = field.fkValueKey || "id";

    return (
      <QuickAddModal
        open
        mode={mode}
        title={quickAdd.title || (isQuickEdit ? "Quick Edit" : "Quick Add")}
        apiUrl={resolveUrl(quickAdd.apiUrl)}
        fields={quickAdd.fields || EMPTY_ARRAY}
        validationSchema={quickAdd.validationSchema}
        initialValues={quickAdd.initialValues || EMPTY_OBJECT}
        editRecord={isQuickEdit ? record || EMPTY_OBJECT : null}
        editId={isQuickEdit ? recordId || record?.[quickValueKey] || record?.id : null}
        updateMethod={quickAdd.updateMethod || updateMethod}
        transformPayload={quickAdd.transformPayload}
        onClose={() => setQuickAddState(null)}
        onSuccess={(savedRecord) => {
          const savedId = savedRecord?.[quickValueKey] ?? savedRecord?.id;

          refreshFkAndSelect(fieldName, {
            value: savedId,
            label: field.fkLabel
              ? field.fkLabel(savedRecord)
              : savedRecord?.name || savedRecord?.display_name || savedRecord?.code || String(savedId ?? ""),
            raw: savedRecord,
          });

          setQuickAddState(null);
        }}
      />
    );
  };

  const crudCss = useMemo(
    () => `
      .reusable-crud-token .ant-table {
        background: ${token.colorBgContainer};
      }

      .reusable-crud-token .ant-table-thead > tr > th {
        background: ${token.colorFillAlter};
        color: ${token.colorTextSecondary};
        font-weight: 700;
        font-size: 12px;
        border-bottom: 1px solid ${token.colorBorderSecondary};
      }

      .reusable-crud-token .ant-table-tbody > tr > td {
        border-bottom: 1px solid ${token.colorBorderSecondary};
      }

      .reusable-crud-token .ant-table-tbody > tr:hover > td {
        background: ${token.colorFillQuaternary} !important;
      }

      .reusable-crud-token .ant-form-item {
        margin-bottom: ${token.marginSM}px;
      }

      .reusable-crud-token .ant-form-item-label > label {
        font-size: 12px;
        font-weight: 650;
        color: ${token.colorTextSecondary};
      }

      .reusable-crud-token .ant-input,
      .reusable-crud-token .ant-input-number,
      .reusable-crud-token .ant-select-selector,
      .reusable-crud-token .ant-picker {
        border-radius: ${token.borderRadius}px !important;
      }

      .reusable-crud-token .ant-table-pagination {
        padding-inline: ${token.paddingSM}px;
        margin: ${token.marginSM}px 0 !important;
      }
    `,
    [token]
  );

  const isFormOnlyMode = ui_type === "add form" || ui_type === "edit form";

  if (isFormOnlyMode) {
    const isEditFormOnly = ui_type === "edit form";
    const submitLabel = isEditFormOnly ? "Update" : "Save";

    const singularTitle =
      title && String(title).endsWith("s")
        ? String(title).slice(0, -1)
        : title || "Record";

    const formOnlyTitle = isEditFormOnly
      ? `Edit ${singularTitle}`
      : `New ${singularTitle}`;

    return (
      <div className="reusable-crud-token">
        <style>{crudCss}</style>

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
                if (typeof onEditSuccess === "function") {
                  await onEditSuccess(savedRecord, values);
                }
              } else {
                if (typeof onAddSuccess === "function") {
                  await onAddSuccess(savedRecord, values);
                }

                if (typeof handleAddedData === "function") {
                  await handleAddedData(savedRecord, values);
                }

                resetForm();
              }
            } catch (err) {
              const { fieldErrors, globalErrors, allErrors } = parseBackendErrors(err, values);

              if (Object.keys(fieldErrors).length) {
                setErrors(fieldErrors);
              }

              setSubmitErrors(allErrors);

              if (globalErrors.length) {
                showGlobalErrorsNotification(globalErrors);
              } else {
                message.error("Validation failed");
              }
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
              editingRecord: isEditFormOnly ? formInitialValues : null,
            };

            const headerSubmitButton = hideSubmitButton
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
                    {submitLabelOverride || submitLabel}
                  </Button>
                );

            return (
              <div style={ui.formOnlyPage}>
                <div style={ui.formOnlyShell}>
                  <div style={ui.formOnlyHeader}>
                    <div style={ui.formOnlyTitleWrap}>
                      <h2 style={ui.formOnlyTitle}>{formOnlyTitle}</h2>
                      <div style={ui.formOnlySubtitle}>
                       </div>
                    </div>

                    <div style={ui.formOnlyActions}>
                      {headerSubmitButton}

                      <Button
                        type="text"
                        icon={<CloseOutlined style={{ fontSize: 18 }} />}
                        onClick={() => {
                          if (typeof window !== "undefined" && window.history.length > 1) {
                            window.history.back();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div style={ui.formOnlyBody}>
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
                      hideSubmitButton={true}
                      onSubmitButtonClick={onSubmitButtonClick}
                      renderSubmitButton={renderSubmitButton}
                      hydrateFkLabels={hydrateMissingFkLabel}
                      submitMeta={submitMeta}
                    />
                  </div>
                </div>
              </div>
            );
          }}
        </Formik>

        {renderQuickAddModal()}
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
            submitLabel={submitLabelOverride || (editingRecord ? "Update" : "Add")}
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
            <Drawer
              width={computedDrawerWidth}
              title={formTitle}
              open={visible}
              onClose={() => {
                setVisible(false);
                setSubmitErrors(EMPTY_ARRAY);
              }}
              destroyOnClose
              styles={{
                body: {
                  background: token.colorBgLayout,
                  padding: token.paddingLG,
                },
              }}
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
          );
        }

        return (
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
            styles={{
              body: {
                background: token.colorBgContainer,
                paddingTop: token.paddingMD,
              },
            }}
          >
            {inner}
          </Modal>
        );
      }}
    </Formik>
  );

  const headerRight = (
  <Space size={8} wrap>
    {canAdd && !button_ui && ui_type !== "add_related" && (
      <Button
        icon={<PlusOutlined />}
        type="primary"
        onClick={() => {
          setSubmitErrors(EMPTY_ARRAY);

          if (custom_add && custom_add_link) {
            router.visit(custom_add_link);
            return;
          }

          setEditingRecord(null);
          setVisible(true);
        }}
      >
        Add New
      </Button>
    )}

    {hasActions && canView && (
      <Dropdown menu={{ items: topMenuItems }} placement="bottomRight" trigger={["click"]}>
        <Button type="default" icon={<MoreOutlined />} />
      </Dropdown>
    )}
  </Space>
);

  return (
    <div className="reusable-crud-token">
      <style>{crudCss}</style>

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
          type="default"
          shape="circle"
          icon={<PlusOutlined />}
          onClick={() => {
            setSubmitErrors(EMPTY_ARRAY);
            setVisible(true);
          }}
        />
      ) : button_ui ? (
        <Button
          size="medium"
          type="default"
          icon={button_ui_id ? <EditOutlined /> : <PlusOutlined />}
          onClick={handleQuickButtonClick}
          disabled={(button_ui_id && !canEdit) || (!button_ui_id && !canAdd)}
        >
          {button_ui_id
            ? `Edit ${title?.slice?.(0, -1) || title}`
            : `Add ${title?.slice?.(0, -1) || title}`}
        </Button>
      ) : (
        <div style={ui.shell}>
          {canView && selectedRowKeys.length > 0 && bulkactions?.length > 0 && (
            <div style={ui.bulkBar}>
              <span style={{ fontWeight: 700, color: token.colorText }}>
                {selectedRowKeys.length} selected
              </span>

              {bulkactions.map((action, index) => (
                <Button
                  key={index}
                  type="default"
                  size="small"
                  onClick={async () => {
                    try {
                      const recordsToUpdate = (data || EMPTY_ARRAY).filter((row) => {
                        return selectedRowKeys.includes(row?.id) && !isSystemGeneratedRecord(row);
                      });

                      if (!recordsToUpdate.length) {
                        message.warning("No editable records selected");
                        return;
                      }

                      const payload = recordsToUpdate.map((record) => ({
                        ...sanitizeBulkActionRecord(record),
                        ...(action?.actions || EMPTY_OBJECT),
                      }));

                      await axios({
                        method: String(updateMethod || "patch").toLowerCase(),
                        url: `${String(apiUrl).replace(/\/+$/, "")}/bulk`,
                        data: { records: payload },
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
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {(!hasAnchors || button_ui) && (
            <div style={ui.toolbar}>
              <Row gutter={[8, 8]} align="middle" justify="space-between">
                {showSearch && canView && (
                  <Col xs={24} md={14} lg={16}>
                    <Input
                      size="middle"
                      prefix={<SearchOutlined />}
                      placeholder={`Search ${title}`}
                      allowClear
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        setPagination((p) => ({ ...p, current: 1 }));
                      }}
                      style={ui.searchBar}
                    />
                  </Col>
                )}

                <Col xs={24} md={10} lg={8}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {headerRight}
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {hasAnchors && showSearch && canView && (
            <div style={ui.toolbar}>
              <Input
                size="middle"
                prefix={<SearchOutlined />}
                placeholder={`Search ${title}`}
                allowClear
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={ui.searchBar}
              />
            </div>
          )}

          {canView ? (
            <div style={ui.tableWrap}>
              <Table
                rowKey="id"
               
                columns={mainColumns}
                size="medium"
                dataSource={filteredData}
                onRow={activeTableRowFunction}
                loading={loading}
                bordered={true}
                scroll={{ x: "max-content" }}
                rowSelection={
                  canView
                    ? {
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        columnWidth: 44,
                        getCheckboxProps: (record) => ({
                          disabled: isSystemGeneratedRecord(record),
                          title: isSystemGeneratedRecord(record)
                            ? "System generated record cannot be selected"
                            : undefined,
                        }),
                      }
                    : null
                }
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
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
            <div style={ui.permissionBox}>
              You do not have permission to view this list.
            </div>
          )}
        </div>
      )}

      {formNode}

      {canView && enableInactiveDrawer && (
        <Drawer
          width={Math.min(960, typeof window !== "undefined" ? window.innerWidth - 24 : 960)}
          title={`Inactive ${title} (${inactivePagination.total ?? filteredInactiveData.length})`}
          closable
          onClose={() => {
            setInactiveDrawer(false);
            setSelectedInactiveRowKeys(EMPTY_ARRAY);
          }}
          open={inactiveDrawer}
          styles={{
            body: {
              background: token.colorBgLayout,
              padding: token.paddingMD,
            },
          }}
          extra={
            <Space size={8} wrap>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                disabled={!selectedInactiveRowKeys.length}
                onClick={bulkActivate}
              >
                Activate Selected ({selectedInactiveRowKeys.length})
              </Button>

              <Input
                prefix={<SearchOutlined />}
                placeholder={`Search inactive ${title}`}
                allowClear
                value={inactiveSearchText}
                onChange={(e) => {
                  setInactiveSearchText(e.target.value);
                  setInactivePagination((p) => ({ ...p, current: 1 }));
                }}
                style={{ width: 260 }}
              />
            </Space>
          }
        >
          <div style={ui.shell}>
            <Table
              rowKey="id"
              columns={inactiveColumns}
              dataSource={filteredInactiveData}
              loading={inactiveLoading}
              size="small"
              scroll={{ x: "max-content" }}
              rowSelection={
                canView
                  ? {
                      selectedRowKeys: selectedInactiveRowKeys,
                      onChange: setSelectedInactiveRowKeys,
                      columnWidth: 44,
                      getCheckboxProps: (record) => ({
                        disabled: isSystemGeneratedRecord(record),
                        title: isSystemGeneratedRecord(record)
                          ? "System generated record cannot be selected"
                          : undefined,
                      }),
                    }
                  : null
              }
              pagination={{
                current: inactivePagination.current,
                pageSize: inactivePagination.pageSize,
                total: inactivePagination.total,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
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
          </div>
        </Drawer>
      )}

      {renderQuickAddModal()}
    </div>
  );
}