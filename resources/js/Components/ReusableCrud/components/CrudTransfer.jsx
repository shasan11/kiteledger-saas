import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, message, Table, Transfer } from "antd";
import axios from "axios";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "../constants";
import { normalizeOption } from "../utils/fk";
import { appendQueryParams, resolveDynamicParams } from "../utils/query";
import { resolveUrl } from "../utils/urls";

export default function CrudTransfer({
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

