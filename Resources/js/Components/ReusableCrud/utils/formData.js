import dayjs from "dayjs";
import moment from "moment";
import { isFileLike } from "./upload";

export const appendFormDataValue = (fd, key, value) => {
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

export const buildFormData = (values) => {
  const fd = new FormData();

  Object.entries(values || {}).forEach(([k, v]) => {
    appendFormDataValue(fd, k, v);
  });

  return fd;
};
