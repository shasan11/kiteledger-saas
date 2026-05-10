import React, { useCallback, useEffect, useRef } from "react";
import { Button } from "antd";
import { Form as FormikForm } from "formik";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "../constants";
import { getFkLabelFromValues, getFkValue } from "../utils/fk";
import { isPrimitiveOrMoment, isSameValue } from "../utils/values";

export default function CrudFormInner({
  fields,
  values,
  setFieldValue,
  errors,
  touched,
  ui_type,
  handleSubmit,
  onFormValuesChange,
  submitLabel = "Save",
  renderFormFields,
  hideSubmitButton = false,
  submitErrors = EMPTY_ARRAY,
  onSubmitButtonClick = null,
  renderSubmitButton = null,
  submitMeta = EMPTY_OBJECT,
  hydrateFkLabels = null,
}) {
  const walkFields = useCallback((fs, cb) => {
    (fs || []).forEach((f) => {
      if (f?.type === "group" && Array.isArray(f.children)) walkFields(f.children, cb);
      else cb(f);
    });
  }, []);

  const formulaCacheRef = useRef(new Map());
  const fkHydrationRef = useRef({});

  useEffect(() => {
    if (typeof onFormValuesChange === "function") {
      onFormValuesChange(values, { setFieldValue });
    }
  }, [values, onFormValuesChange, setFieldValue]);

  useEffect(() => {
    if (typeof hydrateFkLabels !== "function") return;

    walkFields(fields, (field) => {
      if (field?.type !== "fkSelect" || !field?.name) return;

      const currentValue = values?.[field.name];
      const currentId = getFkValue(currentValue, field);
      const currentLabel = getFkLabelFromValues(values, field);

      if (currentId == null || currentLabel) return;

      const cacheKey = `${field.name}:${currentId}`;
      if (fkHydrationRef.current[cacheKey]) return;

      fkHydrationRef.current[cacheKey] = true;
      Promise.resolve(hydrateFkLabels(field.name, currentValue, values)).catch(() => {
        fkHydrationRef.current[cacheKey] = false;
      });
    });
  }, [values, fields, walkFields, hydrateFkLabels]);

  useEffect(() => {
    walkFields(fields, (field) => {
      if (typeof field?.formula !== "function" || !field?.name) return;

      const nextVal = field.formula(values);
      if (!isPrimitiveOrMoment(nextVal)) return;

      const currentVal = values?.[field.name];
      const lastApplied = formulaCacheRef.current.get(field.name);

      const changedVsCurrent = !isSameValue(nextVal, currentVal);
      const changedVsLast = !isSameValue(nextVal, lastApplied);

      if (changedVsCurrent && changedVsLast) {
        formulaCacheRef.current.set(field.name, nextVal);
        setFieldValue(field.name, nextVal, false);
      }
    });
  }, [values, fields, setFieldValue, walkFields]);

  return (
    <FormikForm
      onSubmit={handleSubmit}
      className={`${ui_type === "add form" || ui_type === "edit form" ? "bg-null" : ""}`}
    >      {renderFormFields(values, setFieldValue, errors, touched)}

      {submitErrors?.length > 0 && (
        <div style={{ marginTop: 12 }} className={`${ui_type == "add form" || ui_type == "edit form" ? "bg-null" : ""}`}>
          <div style={{ padding: 10, border: "1px solid #ffccc7", }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Please fix these errors:</div>
            {submitErrors.map((e, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {e}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideSubmitButton &&
        (typeof renderSubmitButton === "function" ? (
          <div style={{ marginTop: 16 }}>{renderSubmitButton(submitMeta)}</div>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Button
              type="primary"
              htmlType={typeof onSubmitButtonClick === "function" ? "button" : "submit"}
              onClick={
                typeof onSubmitButtonClick === "function"
                  ? () => onSubmitButtonClick(submitMeta)
                  : undefined
              }
              disabled={submitMeta?.isValid === false || !!submitMeta?.isSubmitting}
              loading={!!submitMeta?.isSubmitting}
              style={{ minWidth: 140 }}
            >
              {submitLabel}
            </Button>
          </div>
        ))}
    </FormikForm>
  );
}


