import dayjs from "dayjs";
import moment from "moment";

export const getResponsiveColProps = (field) => ({
  xs: field?.xs ?? 24,
  sm: field?.sm ?? 24,
  md: field?.md ?? field?.col ?? 24,
  lg: field?.lg ?? field?.col ?? 24,
  xl: field?.xl ?? field?.col ?? 24,
});

export const isSameValue = (a, b) => {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
  }

  if (dayjs.isDayjs(a) && dayjs.isDayjs(b)) return a.isSame(b);
  if (moment.isMoment(a) && moment.isMoment(b)) return a.isSame(b);

  if (a === b) return true;

  if ((a && typeof a === "object") || (b && typeof b === "object")) return false;

  return String(a) === String(b);
};

export const isPrimitiveOrMoment = (v) =>
  v == null ||
  typeof v === "string" ||
  typeof v === "number" ||
  typeof v === "boolean" ||
  moment.isMoment(v) ||
  dayjs.isDayjs(v);
