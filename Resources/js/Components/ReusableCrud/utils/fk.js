export const normalizeOption = (opt) => ({
  id: opt?.id ?? opt?.value,
  value: opt?.value ?? opt?.id,
  label: opt?.label ?? opt?.name ?? String(opt?.value ?? opt?.id ?? ""),
  raw: opt?.raw ?? opt,
});

export const getFkValue = (raw, field) => {
  if (raw === undefined || raw === null || raw === "") return undefined;

  if (typeof raw === "object") {
    return raw?.[field?.fkValueKey || "id"] ?? raw?.id ?? raw?.value;
  }

  return raw;
};

export const getFkLabel = (raw, field) => {
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

export const getFkLabelFromValues = (values, field) => {
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

export const toAutoCompleteOptions = (rows, field) =>
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
