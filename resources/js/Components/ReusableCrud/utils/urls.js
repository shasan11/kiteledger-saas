export const getAuthToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const isAbsoluteUrl = (u) => /^https?:\/\//i.test(String(u || ""));

export const resolveUrl = (u) => {
  const domain = import.meta.env.VITE_APP_BACKEND_URL || "";
  if (!u) return "";
  return isAbsoluteUrl(u) ? u : `${domain}${u}`;
};

export const recordUrl = (base, id) => {
  const normalizedBase = String(base || "").replace(/\/+$/, "");
  return `${normalizedBase}/${encodeURIComponent(id)}/`;
};

