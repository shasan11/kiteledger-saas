import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AutoComplete } from "antd";
import axios from "axios";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "../constants";
import { appendQueryParams, resolveDynamicParams } from "../utils/query";
import { resolveUrl } from "../utils/urls";
import { getFkLabel, getFkValue, toAutoCompleteOptions } from "../utils/fk";

export default function BackendAutocomplete({
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

