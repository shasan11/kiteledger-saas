import { EMPTY_OBJECT } from "../constants";

export const appendQueryParams = (url, params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
};

export const cleanupQueryParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

export const resolveDynamicParams = (rawParams, context = EMPTY_OBJECT) => {
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

export const safeHashGet = () => {
  if (typeof window === "undefined") return "";
  return (window.location.hash || "").replace("#", "").trim();
};

export const safeHashSet = (key) => {
  if (typeof window === "undefined") return;
  const next = `#${key}`;
  if (window.location.hash !== next) window.location.hash = next;
};

export const toOrderingValue = (field, order, orderingMinusForDesc = true) => {
  if (!field || !order) return "";
  if (order === "ascend") return field;
  if (order === "descend") return orderingMinusForDesc ? `-${field}` : field;
  return "";
};
