import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  MailOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import generatePDF from "react-to-pdf";

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────
// Page helpers
// ─────────────────────────────────────────────────────────────

const MM_TO_PX = 96 / 25.4;

const PAGE_SIZE_MM = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 216, height: 279 },
};

function mmToPx(mm) {
  return mm * MM_TO_PX;
}

function getPageDimensionsPx(pageSize = "A4", pageOrientation = "portrait") {
  const size =
    PAGE_SIZE_MM[String(pageSize || "A4").toUpperCase()] || PAGE_SIZE_MM.A4;

  const portrait = {
    width: mmToPx(size.width),
    height: mmToPx(size.height),
  };

  return pageOrientation === "landscape"
    ? { width: portrait.height, height: portrait.width }
    : portrait;
}

// ─────────────────────────────────────────────────────────────
// General helpers
// ─────────────────────────────────────────────────────────────

function normaliseEmailAddresses(value) {
  if (!value) return "";

  const arr = Array.isArray(value) ? value : [value];

  return arr
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item?.email) {
        return item.name ? `${item.name} <${item.email}>` : item.email;
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function resolveDefaultEmailApiUrl(customUrl) {
  if (customUrl) return customUrl;

  const backendUrl = trimTrailingSlash(
    import.meta.env.VITE_APP_BACKEND_URL || ""
  );

  if (!backendUrl) return "";

  return `${backendUrl}/api/utils/send-document-email/`;
}

function resolveAuthToken(customToken) {
  if (customToken) return customToken;

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function buildEmailHeaders({ emailApiHeaders, emailAuthToken }) {
  const headers = { ...(emailApiHeaders || {}) };

  if (!headers.Authorization && !headers.authorization && emailAuthToken) {
    headers.Authorization = `Bearer ${emailAuthToken}`;
  }

  // Let browser set multipart boundary automatically
  delete headers["Content-Type"];
  delete headers["content-type"];

  return headers;
}

async function waitForFonts() {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }
}

async function waitForImages(root) {
  if (!root) return;

  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };

        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    })
  );
}

function getPdfMimeType(pdfImageType = "PNG") {
  return String(pdfImageType || "PNG").toUpperCase() === "PNG"
    ? "image/png"
    : "image/jpeg";
}

function getSafeResolution(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 3;
  return Math.min(parsed, 10);
}

async function parseErrorResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();

    if (typeof data?.detail === "string" && data.detail) {
      throw new Error(data.detail);
    }

    if (typeof data?.error === "string" && data.error) {
      throw new Error(data.error);
    }

    if (data && typeof data === "object") {
      const firstEntry = Object.entries(data)[0];
      if (firstEntry) {
        const [field, value] = firstEntry;

        if (Array.isArray(value) && value.length) {
          throw new Error(`${field}: ${value[0]}`);
        }

        if (typeof value === "string") {
          throw new Error(`${field}: ${value}`);
        }
      }
    }

    throw new Error("Email API request failed.");
  }

  const text = await response.text();
  throw new Error(text || "Email API request failed.");
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const PrintablePdfEmailWrapper = forwardRef(function PrintablePdfEmailWrapper(
  {
    title = "Document",
    subTitle,
    fileName = "document.pdf",
    children,

    showToolbar = true,
    bordered = true,
    cardProps = {},
    bodyStyle,
    toolbarExtra,
    customActions = null,
    className,
    style,
    contentClassName,
    contentStyle,

    buttons,
    allowPrint = true,
    allowDownload = true,
    allowEmail = true,
    disabled = false,

    printButtonText = "Print",
    downloadButtonText = "Download PDF",
    emailButtonText = "Send Email",

    pdfFormat = "A4",
    pdfOrientation,
    pdfMargin = 2,
    pdfScale = 3,
    pdfImageType = "PNG",
    pdfImageQuality = 3,
    pageBackground = "#ffffff",
    extraCanvasOptions = {},

    printWindowTitle,
    printStyles = "",

    onBeforeGenerate,
    onAfterGenerate,
    onPrintSuccess,
    onPrintError,
    onDownloadSuccess,
    onDownloadError,
    onEmailSuccess,
    onEmailError,

    emailModalTitle = "Send document by email",
    defaultEmailValues = {},
    emailApiUrl,
    emailApiMethod = "POST",
    emailApiHeaders,
    emailApiFieldName = "attachment",
    emailExtraPayload = {},
    emailAuthToken,
    emailEnabled = true,
    onSendEmail,

    renderToolbarRight,

    pageSize = "A4",
    pageOrientation = "portrait",
    showPageFrame = false,
    previewBackground = "transparent",
    renderOnlyContent = false,

    imperativeRef,
    enableKeyboardPrintShortcut = true,
  },
  forwardedRef
) {
  const contentRef = useRef(null);
  const [busyAction, setBusyAction] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm] = Form.useForm();

  const resolvedEmailApiUrl = useMemo(
    () => resolveDefaultEmailApiUrl(emailApiUrl),
    [emailApiUrl]
  );

  const resolvedEmailAuthToken = useMemo(
    () => resolveAuthToken(emailAuthToken),
    [emailAuthToken]
  );

  const resolvedEmailHeaders = useMemo(
    () =>
      buildEmailHeaders({
        emailApiHeaders,
        emailAuthToken: resolvedEmailAuthToken,
      }),
    [emailApiHeaders, resolvedEmailAuthToken]
  );

  const showPrint =
    buttons?.print !== undefined ? buttons.print : allowPrint;
  const showDownload =
    buttons?.download !== undefined ? buttons.download : allowDownload;
  const showEmail =
    buttons?.email !== undefined ? buttons.email : allowEmail;

  const normalisedEmailDefaults = useMemo(
    () => ({
      to: normaliseEmailAddresses(defaultEmailValues.to),
      cc: normaliseEmailAddresses(defaultEmailValues.cc),
      bcc: normaliseEmailAddresses(defaultEmailValues.bcc),
      subject: defaultEmailValues.subject || title || "",
      body: defaultEmailValues.body || "",
    }),
    [defaultEmailValues, title]
  );

  const safeFileName = useMemo(() => {
    if (!fileName) return "document.pdf";
    return fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;
  }, [fileName]);

  const resolvedPageOrientation = useMemo(() => {
    if (pageOrientation) return pageOrientation;
    if (pdfOrientation === "l" || pdfOrientation === "landscape") {
      return "landscape";
    }
    return "portrait";
  }, [pageOrientation, pdfOrientation]);

  const resolvedPageFormat = useMemo(() => {
    return pageSize || pdfFormat || "A4";
  }, [pageSize, pdfFormat]);

  const pageDims = useMemo(
    () => getPageDimensionsPx(resolvedPageFormat, resolvedPageOrientation),
    [resolvedPageFormat, resolvedPageOrientation]
  );

  const pdfOptions = useMemo(
    () => ({
      filename: safeFileName,
      method: "save",
      resolution: getSafeResolution(pdfScale),
      page: {
        margin: pdfMargin,
        format: resolvedPageFormat,
        orientation: resolvedPageOrientation,
      },
      canvas: {
        mimeType: getPdfMimeType(pdfImageType),
        qualityRatio: pdfImageQuality,
      },
      overrides: {
        pdf: {
          compress: true,
        },
        canvas: {
          useCORS: true,
          backgroundColor: pageBackground,
          ...extraCanvasOptions,
        },
      },
    }),
    [
      extraCanvasOptions,
      pageBackground,
      pdfImageQuality,
      pdfImageType,
      pdfMargin,
      pdfScale,
      resolvedPageFormat,
      resolvedPageOrientation,
      safeFileName,
    ]
  );

  const buildPdfBlob = useCallback(async () => {
    const node = contentRef.current;
    if (!node) {
      throw new Error("No printable content found.");
    }

    if (onBeforeGenerate) {
      await onBeforeGenerate({ node });
    }

    await waitForFonts();
    await waitForImages(node);

    try {
      const pdfResult = await generatePDF(() => contentRef.current, {
        ...pdfOptions,
        method: "build",
      });

      let blob = null;

      if (pdfResult instanceof Blob) {
        blob = pdfResult;
      } else if (pdfResult && typeof pdfResult.output === "function") {
        blob = pdfResult.output("blob");
      } else if (pdfResult instanceof ArrayBuffer) {
        blob = new Blob([pdfResult], { type: "application/pdf" });
      } else if (pdfResult?.buffer instanceof ArrayBuffer) {
        blob = new Blob([pdfResult.buffer], {
          type: "application/pdf",
        });
      } else {
        throw new Error("Could not build a valid PDF blob.");
      }

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("Generated PDF blob is empty or invalid.");
      }

      if (onAfterGenerate) {
        await onAfterGenerate({ node, blob, pdf: pdfResult });
      }

      return blob;
    } catch (error) {
      throw new Error(error?.message || "Failed to build PDF blob.");
    }
  }, [onAfterGenerate, onBeforeGenerate, pdfOptions]);

  const generatePdfAndSave = useCallback(async () => {
    setBusyAction("download");

    try {
      const node = contentRef.current;
      if (!node) {
        throw new Error("No printable content found.");
      }

      if (onBeforeGenerate) {
        await onBeforeGenerate({ node });
      }

      await waitForFonts();
      await waitForImages(node);

      const result = await generatePDF(() => contentRef.current, pdfOptions);

      if (onAfterGenerate) {
        await onAfterGenerate({ node, result });
      }

      message.success("PDF downloaded.");
      onDownloadSuccess?.({ fileName: safeFileName, result });
    } catch (error) {
      console.error(error);
      message.error(error?.message || "Failed to download PDF.");
      onDownloadError?.(error);
    } finally {
      setBusyAction(null);
    }
  }, [
    onAfterGenerate,
    onBeforeGenerate,
    onDownloadError,
    onDownloadSuccess,
    pdfOptions,
    safeFileName,
  ]);

  const reactToPrintFn = useReactToPrint({
    contentRef,
    documentTitle: () => printWindowTitle || title || safeFileName,
    suppressErrors: true,
    pageStyle: `
      @page {
        size: ${resolvedPageFormat} ${resolvedPageOrientation};
        margin: 0 !important;
      }

      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body * {
        box-shadow: none !important;
      }

      img {
        max-width: 100% !important;
        height: auto !important;
      }

      ${printStyles || ""}
    `,
    onBeforePrint: async () => {
      const node = contentRef.current;
      if (!node) {
        throw new Error("No printable content found.");
      }

      if (onBeforeGenerate) {
        await onBeforeGenerate({ node });
      }

      await waitForFonts();
      await waitForImages(node);
    },
    onPrintError: (location, error) => {
      console.error(error);
      message.error(error?.message || "Failed to print document.");
      onPrintError?.(error, location);
    },
  });

  const handlePrint = useCallback(async () => {
    setBusyAction("print");

    try {
      if (!contentRef.current) {
        throw new Error("No printable content found.");
      }

      await reactToPrintFn?.();
      onPrintSuccess?.();
    } catch (error) {
      console.error(error);
      message.error(error?.message || "Failed to print document.");
      onPrintError?.(error);
    } finally {
      setBusyAction(null);
    }
  }, [onPrintError, onPrintSuccess, reactToPrintFn]);

  const postEmailToApi = useCallback(
    async ({ values, blob }) => {
      if (!emailEnabled) {
        throw new Error("Email sending is disabled for this component.");
      }

      if (!resolvedEmailApiUrl) {
        throw new Error(
          "No email API configured. Set VITE_APP_BACKEND_URL or pass emailApiUrl."
        );
      }

      const formData = new FormData();
      formData.append("to", values.to || "");
      formData.append("cc", values.cc || "");
      formData.append("bcc", values.bcc || "");
      formData.append("subject", values.subject || "");
      formData.append("body", values.body || "");

      const pdfFile = new File([blob], safeFileName, {
        type: "application/pdf",
      });

      formData.append(emailApiFieldName, pdfFile);

      Object.entries(emailExtraPayload || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      });

      const response = await fetch(resolvedEmailApiUrl, {
        method: emailApiMethod,
        headers: resolvedEmailHeaders,
        body: formData,
      });

      if (!response.ok) {
        await parseErrorResponse(response);
      }

      const ct = response.headers.get("content-type") || "";
      return ct.includes("application/json") ? response.json() : response.text();
    },
    [
      emailApiFieldName,
      emailApiMethod,
      emailEnabled,
      emailExtraPayload,
      resolvedEmailApiUrl,
      resolvedEmailHeaders,
      safeFileName,
    ]
  );

  const handleEmailSubmit = useCallback(async () => {
    setBusyAction("email");

    try {
      const values = await emailForm.validateFields();
      const blob = await buildPdfBlob();

      let result;
      if (onSendEmail) {
        result = await onSendEmail({
          values,
          blob,
          fileName: safeFileName,
          title,
        });
      } else {
        result = await postEmailToApi({ values, blob });
      }

      message.success("Email sent successfully.");
      setEmailModalOpen(false);
      emailForm.resetFields();
      onEmailSuccess?.({ result, values, fileName: safeFileName });
    } catch (error) {
      console.error(error);
      message.error(error?.message || "Failed to send email.");
      onEmailError?.(error);
    } finally {
      setBusyAction(null);
    }
  }, [
    buildPdfBlob,
    emailForm,
    onEmailError,
    onEmailSuccess,
    onSendEmail,
    postEmailToApi,
    safeFileName,
    title,
  ]);

  const openEmailModal = useCallback(() => {
    if (!emailEnabled) {
      message.error("Email sending is disabled.");
      return;
    }

    emailForm.setFieldsValue(normalisedEmailDefaults);
    setEmailModalOpen(true);
  }, [emailEnabled, emailForm, normalisedEmailDefaults]);

  const imperativeApi = useMemo(
    () => ({
      print: handlePrint,
      downloadPdf: generatePdfAndSave,
      openEmailModal,
      sendEmailDirectly: async (overrides = {}) => {
        const values = {
          ...normalisedEmailDefaults,
          ...overrides,
        };

        const blob = await buildPdfBlob();
        return postEmailToApi({ values, blob });
      },
    }),
    [
      buildPdfBlob,
      generatePdfAndSave,
      handlePrint,
      normalisedEmailDefaults,
      openEmailModal,
      postEmailToApi,
    ]
  );

  useImperativeHandle(forwardedRef, () => imperativeApi, [imperativeApi]);

  useEffect(() => {
    if (imperativeRef && typeof imperativeRef === "object") {
      imperativeRef.current = imperativeApi;
    }
  }, [imperativeApi, imperativeRef]);

  useEffect(() => {
    if (!enableKeyboardPrintShortcut) return;

    const onKeyDown = (event) => {
      const key = String(event.key || "").toLowerCase();
      const isPrintShortcut = (event.ctrlKey || event.metaKey) && key === "p";

      if (!isPrintShortcut) return;
      if (event.repeat) return;
      if (!contentRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      if (disabled || busyAction || !showPrint) return;

      handlePrint();
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [busyAction, disabled, enableKeyboardPrintShortcut, handlePrint, showPrint]);

  const emailModalNode = (
    <Modal
      open={emailModalOpen}
      onCancel={() => setEmailModalOpen(false)}
      onOk={handleEmailSubmit}
      okText="Send"
      confirmLoading={busyAction === "email"}
      title={emailModalTitle}
      width={720}
      destroyOnClose={false}
    >
      <Text type="secondary">
        A PDF will be generated from the rendered content and attached to the
        email.
      </Text>

      <Divider />

      <Form
        form={emailForm}
        layout="vertical"
        initialValues={normalisedEmailDefaults}
      >
        <Form.Item
          name="to"
          label="To"
          rules={[{ required: true, message: "Recipient email is required." }]}
        >
          <Input placeholder="recipient@example.com, Another Name <name@example.com>" />
        </Form.Item>

        <Form.Item name="cc" label="CC">
          <Input placeholder="cc@example.com" />
        </Form.Item>

        <Form.Item name="bcc" label="BCC">
          <Input placeholder="bcc@example.com" />
        </Form.Item>

        <Form.Item
          name="subject"
          label="Subject"
          rules={[{ required: true, message: "Subject is required." }]}
        >
          <Input placeholder="Document subject" />
        </Form.Item>

        <Form.Item
          name="body"
          label="Body"
          rules={[{ required: true, message: "Email body is required." }]}
        >
          <Input.TextArea rows={6} placeholder="Write your message here..." />
        </Form.Item>
      </Form>
    </Modal>
  );

  const contentNode = (
    <div
      className={renderOnlyContent ? className : undefined}
      style={renderOnlyContent ? style : undefined}
    >
      <div
        style={{
          background: renderOnlyContent ? "transparent" : previewBackground,
          overflowX: "auto",
          padding: 0,
          margin: 0,
          border: 0,
          textAlign: renderOnlyContent ? "left" : "initial",
        }}
      >
        <div
          ref={contentRef}
          className={contentClassName}
          style={{
            display: renderOnlyContent ? "inline-block" : "block",
            background: "#fff",
            margin: 0,
            padding: 0,
            width: renderOnlyContent
              ? "fit-content"
              : showPageFrame
              ? pageDims.width
              : "100%",
            minWidth: renderOnlyContent ? "fit-content" : undefined,
            minHeight: renderOnlyContent
              ? "auto"
              : showPageFrame
              ? pageDims.height
              : "auto",
            boxShadow: "none",
            border: "none",
            borderRadius: 0,
            verticalAlign: "top",
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (renderOnlyContent) {
    return (
      <>
        {contentNode}
        {emailModalNode}
      </>
    );
  }

  return (
    <>
      <Card
        bordered={bordered}
        className={className}
        style={style}
        bodyStyle={{ padding: 0, ...bodyStyle }}
        {...cardProps}
        title={
          <Space direction="vertical" size={0}>
            <span>{title}</span>
            {subTitle ? <Text type="secondary">{subTitle}</Text> : null}
          </Space>
        }
        extra={
          showToolbar ? (
            <Space wrap>
              {toolbarExtra}
              {renderToolbarRight?.({ busyAction })}
              {customActions}

              {showPrint && (
                <Tooltip title="Print what is rendered inside this component">
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                    loading={busyAction === "print"}
                    disabled={disabled || !!busyAction}
                  >
                    {printButtonText}
                  </Button>
                </Tooltip>
              )}

              {showDownload && (
                <Tooltip title="Export the rendered content as PDF">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={generatePdfAndSave}
                    loading={busyAction === "download"}
                    disabled={disabled || !!busyAction}
                    type="primary"
                  >
                    {downloadButtonText}
                  </Button>
                </Tooltip>
              )}

              {showEmail && (
                <Tooltip title="Generate PDF and send it as an email attachment">
                  <Button
                    icon={<MailOutlined />}
                    onClick={openEmailModal}
                    loading={busyAction === "email"}
                    disabled={disabled || !!busyAction || !emailEnabled}
                  >
                    {emailButtonText}
                  </Button>
                </Tooltip>
              )}
            </Space>
          ) : null
        }
      >
        {contentNode}
      </Card>

      {emailModalNode}
    </>
  );
});

export default PrintablePdfEmailWrapper;