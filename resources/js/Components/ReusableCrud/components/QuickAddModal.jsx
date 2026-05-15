import React, { useCallback, useMemo, useState } from "react";
import { Button, Checkbox, Col, Form, Input, InputNumber, message, Modal, Radio, Row, Select, Switch, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { Formik, Form as FormikForm } from "formik";
import axios from "axios";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "../constants";
import BackendAutocomplete from "./BackendAutocomplete";
import StableDatePicker from "./StableDatePicker";
import { buildFormData } from "../utils/formData";
import { parseBackendErrors, showGlobalErrorsNotification } from "../utils/errors";
import { getFkValue, normalizeOption } from "../utils/fk";
import { getResponsiveColProps } from "../utils/values";
import { getAuthToken, recordUrl, resolveUrl } from "../utils/urls";
import { cleanUploadValuesForSubmit, getSingleUploadFileList, hasAnyFile, openUploadPreview, validateUploadFile } from "../utils/upload";

const { Dragger } = Upload;

export default function QuickAddModal({
  open,
  title,
  apiUrl,
  fields = EMPTY_ARRAY,
  validationSchema,
  initialValues = EMPTY_OBJECT,
  editRecord = null,
  editId = null,
  mode = "add",
  transformPayload = null,
  updateMethod = "patch",
  onClose,
  onSuccess,
}) {
  const [submitErrors, setSubmitErrors] = useState(EMPTY_ARRAY);
  const isEditMode = mode === "edit";
  const token = getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : EMPTY_OBJECT;

  const normalizedApiUrl = useMemo(() => resolveUrl(apiUrl), [apiUrl]);

  const quickInitialValues = useMemo(
    () => ({ ...(initialValues || EMPTY_OBJECT), ...(isEditMode ? editRecord || EMPTY_OBJECT : EMPTY_OBJECT) }),
    [initialValues, editRecord, isEditMode]
  );

  const recordSubmitUrl = useCallback((base, id) => {
    const normalizedBase = String(base || "").replace(/\/+$/, "");
    return `${normalizedBase}/${encodeURIComponent(id)}/`;
  }, []);

  const normalizeQuickFkValues = useCallback((values) => {
    const next = { ...(values || EMPTY_OBJECT) };

    const walk = (items = EMPTY_ARRAY) => {
      (items || EMPTY_ARRAY).forEach((field) => {
        if (!field) return;

        if (field.type === "group" && Array.isArray(field.children)) {
          walk(field.children);
          return;
        }

        if (!field.name) return;

        if ((field.type === "fkSelect" || field.type === "autocomplete") && next[field.name] && typeof next[field.name] === "object") {
          next[field.name] = getFkValue(next[field.name], field);
        }
      });
    };

    walk(fields);
    return next;
  }, [fields]);

  const submitQuickRecord = async (values) => {
    const normalizedValues = normalizeQuickFkValues(values);
    const uploadSafeValues = cleanUploadValuesForSubmit(normalizedValues, fields, {
      isEditMode,
      originalRecord: isEditMode ? editRecord || EMPTY_OBJECT : EMPTY_OBJECT,
    });

    const transformedPayload =
      typeof transformPayload === "function"
        ? transformPayload(uploadSafeValues, { isEditMode, editRecord })
        : uploadSafeValues;

    const payload = cleanUploadValuesForSubmit(transformedPayload, fields, {
      isEditMode,
      originalRecord: isEditMode ? editRecord || EMPTY_OBJECT : EMPTY_OBJECT,
    });

    const containsFile = hasAnyFile(payload);
    const url = isEditMode ? recordSubmitUrl(normalizedApiUrl, editId || payload?.id) : normalizedApiUrl;
    const method = isEditMode ? String(updateMethod || "patch").toLowerCase() : "post";

    if (!url) throw new Error("Quick add API URL is missing.");
    if (isEditMode && !(editId || payload?.id)) throw new Error("Quick edit record id is missing.");

    const res = await axios({
      method,
      url,
      data: containsFile ? buildFormData(payload) : payload,
      headers: containsFile
        ? authHeaders
        : { ...authHeaders, "Content-Type": "application/json" },
    });

    return res.data;
  };

  const renderQuickFields = (values, setFieldValue, errors, touched) => {
    const renderOne = (field, parentKey = "quick") => {
      if (!field) return null;
      if (field.condition && !field.condition(values)) return null;

      if (field.type === "group") {
        return (
          <Col key={`${parentKey}-${field.label || "group"}`} {...getResponsiveColProps(field)}>
            {field.label ? <div style={{ fontWeight: 700, marginBottom: 8 }}>{field.label}</div> : null}
            <Row gutter={[12, 12]}>
              {(field.children || EMPTY_ARRAY).map((child, idx) => renderOne(child, `${parentKey}-${idx}`))}
            </Row>
          </Col>
        );
      }

      const name = field.name;
      if (!name) return null;

      const readOnly = !!field.readOnly;
      const fieldKey = `${parentKey}-${name}`;

      return (
        <Col key={fieldKey} {...getResponsiveColProps(field)}>
          <Form.Item
            layout="vertical"
            label={field.label}
            required={field.required}
            validateStatus={touched?.[name] && errors?.[name] ? "error" : ""}
            help={touched?.[name] && errors?.[name]}
          >
            {(() => {
              switch (field.type) {
                case "textarea":
                  return (
                    <Input.TextArea
                      rows={field.rows || 2}
                      value={values?.[name] || ""}
                      disabled={readOnly}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                    />
                  );

                case "number":
                  return (
                    <InputNumber
                      size="large"
                      style={{ width: "100%" }}
                      value={values?.[name]}
                      min={field.min}
                      max={field.max}
                      disabled={readOnly}
                      placeholder={field.placeholder || ""}
                      onChange={(v) => setFieldValue(name, v)}
                    />
                  );

                case "select":
                  return (
                    <Select
                      size="large"
                      showSearch
                      allowClear={field.allowClear ?? true}
                      value={values?.[name] ?? undefined}
                      disabled={readOnly}
                      placeholder={field.placeholder || "Select..."}
                      onChange={(v) => setFieldValue(name, v)}
                      options={(field.options || EMPTY_ARRAY).map(normalizeOption)}
                      filterOption={(input, opt) =>
                        String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  );

                case "fkSelect":
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
                      parentFieldName={name}
                      onValueChange={(v) => setFieldValue(name, v)}
                      onDetailChange={(d) => setFieldValue(`${name}_detail`, d, false)}
                    />
                  );

                case "date":
                  return (
                    <Input
                      size="large"
                      type="date"
                      value={values?.[name] || ""}
                      disabled={readOnly}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                    />
                  );

                case "datePicker":
                  return (
                    <StableDatePicker
                      value={values?.[name]}
                      disabled={readOnly}
                      format={field.format || "YYYY-MM-DD"}
                      placeholder={field.placeholder || "Select date"}
                      onChange={(v) => setFieldValue(name, v)}
                    />
                  );

                case "switch":
                  return (
                    <Switch
                      checked={!!values?.[name]}
                      disabled={readOnly}
                      onChange={(v) => setFieldValue(name, v)}
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
                case "radiobtn":
                  return (
                    <Radio.Group
                      size="large"
                      disabled={readOnly}
                      value={values?.[name]}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                    >
                      {(field.options || EMPTY_ARRAY).map((opt) => (
                        <Radio key={opt.value} value={opt.value}>
                          {opt.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                  );

                case "file":
                case "image": {
                  const isImage = field.type === "image";
                  const fileList = getSingleUploadFileList(values?.[name], name);

                  return (
                    <Dragger
                      name={name}
                      multiple={false}
                      maxCount={1}
                      disabled={readOnly}
                      accept={field.accept || (isImage ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt")}
                      fileList={fileList}
                      beforeUpload={(file) => {
                        const result = validateUploadFile({ file, field, mode: isImage ? "image" : "file" });
                        if (result === Upload.LIST_IGNORE) return Upload.LIST_IGNORE;
                        setFieldValue(name, file);
                        return false;
                      }}
                      onRemove={() => {
                        setFieldValue(name, null);
                        return true;
                      }}
                      onPreview={openUploadPreview}
                      showUploadList={{ showPreviewIcon: true, showRemoveIcon: !readOnly }}
                    >
                      <div style={{ padding: 12 }}>
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text" style={{ marginBottom: 6 }}>
                          {field.dragText || (isImage ? "Upload image" : "Upload file")}
                        </p>
                        <p className="ant-upload-hint" style={{ marginBottom: 0 }}>
                          Max {field.maxSizeMB ?? 5} MB
                        </p>
                      </div>
                    </Dragger>
                  );
                }

                default:
                  return (
                    <Input
                      size="large"
                      value={values?.[name] || ""}
                      disabled={readOnly}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => setFieldValue(name, e.target.value)}
                      maxLength={field.maxLength}
                    />
                  );
              }
            })()}
          </Form.Item>
        </Col>
      );
    };

    return <Row gutter={[12, 12]}>{(fields || EMPTY_ARRAY).map((field, idx) => renderOne(field, `quick-root-${idx}`))}</Row>;
  };

  return (
    <Modal
      open={open}
      title={isEditMode ? `Quick Edit ${title || "Record"}` : title || "Quick Add"}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={720}
    >
      <Formik
        enableReinitialize
        initialValues={quickInitialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { resetForm, setErrors }) => {
          try {
            setSubmitErrors(EMPTY_ARRAY);
            const savedRecord = await submitQuickRecord(values);
            message.success(isEditMode ? "Updated successfully" : "Created successfully");
            if (typeof onSuccess === "function") await onSuccess(savedRecord, { isEditMode, values });
            if (!isEditMode) resetForm();
          } catch (err) {
            const { fieldErrors, globalErrors, allErrors } = parseBackendErrors(err, values);
            if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
            setSubmitErrors(allErrors);
            if (globalErrors.length) showGlobalErrorsNotification(globalErrors);
            else message.error(isEditMode ? "Update failed" : "Create failed");
          }
        }}
      >
        {({ handleSubmit, setFieldValue, errors, touched, values, isSubmitting }) => (
          <FormikForm onSubmit={handleSubmit}>
            {renderQuickFields(values, setFieldValue, errors, touched)}

            {submitErrors?.length > 0 && (
              <div style={{ marginTop: 8, padding: 10, border: "1px solid #ffccc7" }}>
                {submitErrors.map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {isEditMode ? "Update" : "Create"}
              </Button>
            </div>
          </FormikForm>
        )}
      </Formik>
    </Modal>
  );
}

