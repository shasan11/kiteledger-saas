import { message, Upload } from "antd";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "../constants";
import { resolveUrl } from "./urls";

export const isFileLike = (v) => typeof File !== "undefined" && v instanceof File;

export const hasAnyFile = (obj) => {
  const walk = (x) => {
    if (isFileLike(x)) return true;
    if (Array.isArray(x)) return x.some(walk);
    if (x && typeof x === "object") return Object.values(x).some(walk);
    return false;
  };
  return walk(obj);
};

export const isUploadField = (field) => ["file", "image", "upload"].includes(field?.type);

export const cleanUploadValueForSubmit = (target, key, originalValue, isEditMode) => {
  if (!target || !key) return;

  const currentValue = target[key];

  if (isFileLike(currentValue)) return;

  if (!isEditMode) {
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      delete target[key];
      return;
    }

    if (typeof currentValue === "string" || typeof currentValue === "object") {
      delete target[key];
    }

    return;
  }

  if (currentValue === null) {
    if (originalValue !== undefined && originalValue !== null && originalValue !== "") return;
    delete target[key];
    return;
  }

  if (currentValue === undefined || currentValue === "") {
    delete target[key];
    return;
  }

  // Existing backend file/image values normally arrive as URL strings or objects.
  // Sending those back to DRF/Laravel file validators causes "submitted data was not a file" errors.
  delete target[key];
};

export const cleanUploadValuesForSubmit = (inputValues, fields = EMPTY_ARRAY, options = EMPTY_OBJECT) => {
  const { isEditMode = false, originalRecord = EMPTY_OBJECT } = options || EMPTY_OBJECT;
  const next = { ...(inputValues || EMPTY_OBJECT) };

  const walk = (items = EMPTY_ARRAY) => {
    (items || EMPTY_ARRAY).forEach((field) => {
      if (!field) return;

      if (field.type === "group" && Array.isArray(field.children)) {
        walk(field.children);
        return;
      }

      if (!field.name) return;

      if (isUploadField(field)) {
        cleanUploadValueForSubmit(next, field.name, originalRecord?.[field.name], isEditMode);
        return;
      }

      if (field.type === "objectArray" && Array.isArray(next[field.name])) {
        const rowFields = [...(field.columns || EMPTY_ARRAY), ...(field.collapsedFields || EMPTY_ARRAY)];
        const originalRows = Array.isArray(originalRecord?.[field.name]) ? originalRecord[field.name] : EMPTY_ARRAY;

        next[field.name] = next[field.name].map((row, rowIndex) => {
          const rowCopy = { ...(row || EMPTY_OBJECT) };
          const originalRow = originalRows?.[rowIndex] || EMPTY_OBJECT;

          rowFields.forEach((rowField) => {
            const rowKey = rowField?.key ?? rowField?.name;
            if (!rowKey || !isUploadField(rowField)) return;
            cleanUploadValueForSubmit(rowCopy, rowKey, originalRow?.[rowKey], isEditMode);
          });

          return rowCopy;
        });
      }
    });
  };

  walk(fields);
  return next;
};

export const getUploadUrlFromValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return resolveUrl(value);

  if (typeof value === "object" && !isFileLike(value)) {
    return resolveUrl(value.url || value.image || value.file || value.path || "");
  }

  return "";
};

export const getUploadNameFromValue = (value, fallback = "file") => {
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

export const getSingleUploadFileList = (value, fieldName = "file") => {
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

export const openUploadPreview = (file) => {
  const src =
    file?.url ||
    file?.thumbUrl ||
    (file?.originFileObj ? URL.createObjectURL(file.originFileObj) : "");

  if (!src) return;

  window.open(src, "_blank", "noopener,noreferrer");
};

export const validateUploadFile = ({ file, field, mode = "file" }) => {
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
