import { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import {
  App,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  theme,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  MinusOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  WalletOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import PosLayout from "@/Layouts/PosLayout.jsx";
import PrintablePdfEmailWrapper from "@/Components/PrintableComponent";
import PosTopBar from "@/Components/Pos/PosTopBar";
import {
  api,
  fetchList,
  money,
  saleStatusColor,
  showApiError,
} from "./Shared/posHelpers";

const { Text, Title } = Typography;

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
  { value: "wallet", label: "Wallet" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit", label: "Credit" },
];

const paymentMethodBoxes = [
  { value: "cash", label: "Cash", icon: <DollarOutlined /> },
  { value: "card", label: "Card", icon: <CreditCardOutlined /> },
  { value: "online", label: "Online", icon: <WifiOutlined /> },
  { value: "wallet", label: "Wallet", icon: <WalletOutlined /> },
  { value: "bank_transfer", label: "Bank Transfer", icon: <BankOutlined /> },
  { value: "credit", label: "Credit", icon: <ClockCircleOutlined /> },
];

const resolveReceiptPaperSize = (template, terminal, settings) => {
  const raw =
    template?.receipt_paper_size ||
    template?.paper_size ||
    template?.print_paper_size ||
    terminal?.receipt_paper_size ||
    terminal?.pos_receipt_width ||
    terminal?.receipt_width ||
    settings?.receipt_paper_size ||
    settings?.pos_receipt_width ||
    settings?.receipt_width ||
    "80mm";

  const size = String(raw || "")
    .trim()
    .toLowerCase();
  if (size === "58mm") return "58mm auto";
  if (size === "a4") return "A4";
  return "80mm auto";
};

const SCANNER_TIMEOUT_MS = 120;
const MIN_BARCODE_LENGTH = 3;

const emptyPayment = {
  payment_method: "cash",
  amount: 0,
  reference: "",
  transaction_no: "",
};

const isWalkInCustomer = (contact) =>
  String(contact?.code || "").toUpperCase() === "WALK-IN" ||
  /walk[-\s]?in/i.test(contact?.name || "");

const firstPresent = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== "",
  ) ?? "";

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQty = (value) =>
  numeric(value).toLocaleString("en-NP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

const formatDateTime = (value) => {
  if (!value) return "";

  const date = dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm") : String(value);
};

const humanize = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getPath = (object, path, fallback = "") => {
  if (!path) return fallback;

  return (
    String(path)
      .split(".")
      .reduce((current, key) => {
        if (current === null || current === undefined) return fallback;
        return current[key];
      }, object) ?? fallback
  );
};

const renderPrintTemplate = (templateHtml, context) => {
  const resolve = (scope, path, fallback = "") => {
    const scoped = getPath(scope, path, undefined);
    return scoped !== undefined && scoped !== null
      ? scoped
      : getPath(context, path, fallback);
  };

  const render = (template, scope = context) =>
    String(template || "")
      .replace(/{{!([\s\S]*?)}}/g, "")
      .replace(
        /{{([#^])([\w.]+)}}([\s\S]*?){{\/\2}}/g,
        (_, mode, path, block) => {
          const value = resolve(scope, path, null);
          const truthy = Array.isArray(value) ? value.length > 0 : !!value;

          if (mode === "^") {
            return truthy ? "" : render(block, scope);
          }

          if (Array.isArray(value)) {
            return value
              .map((item, index) =>
                render(block, {
                  ...context,
                  ...(item || {}),
                  "@index": index + 1,
                }),
              )
              .join("");
          }

          if (!truthy) return "";

          return render(
            block,
            typeof value === "object" ? { ...context, ...value } : scope,
          );
        },
      )
      .replace(/{{\s*([^}]+)\s*}}/g, (_, path) =>
        escapeHtml(resolve(scope, path.trim(), "")),
      );

  return render(templateHtml);
};

const extractTemplateBody = (html = "") => {
  let source = String(html || "");
  const styles = [];

  source = source.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (_, styleContent) => {
      styles.push(styleContent);
      return "";
    },
  );

  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : source;

  return {
    html: body
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?(html|head|body)[^>]*>/gi, "")
      .trim(),
    styles: styles.join("\n"),
  };
};

const scopeReceiptStyles = (css = "") =>
  String(css || "").replace(
    /(^|})\s*([^@{}][^{}]*)\{/g,
    (match, boundary, selectorText) => {
      const scopedSelectors = selectorText
        .split(",")
        .map((selector) => {
          const trimmed = selector.trim();

          if (!trimmed) return "";
          if (
            trimmed === "html" ||
            trimmed === "body" ||
            trimmed === "html body"
          ) {
            return ".pos-receipt-print-document";
          }
          if (trimmed.startsWith(".pos-receipt-print-document")) {
            return trimmed;
          }

          return `.pos-receipt-print-document ${trimmed}`;
        })
        .filter(Boolean)
        .join(", ");

      return `${boundary} ${scopedSelectors} {`;
    },
  );

const compactAddress = (record = null, companyInfo = null) =>
  firstPresent(
    companyInfo?.address,
    [
      companyInfo?.address_line_1,
      companyInfo?.address_line_2,
      companyInfo?.city,
      companyInfo?.state,
      companyInfo?.postal_code,
      companyInfo?.country,
    ]
      .filter(Boolean)
      .join(", "),
    record?.branch?.address,
    "",
  );

const defaultPosReceiptTemplateHtml = `
<div class="pos-receipt">
    <div class="center">
        <div class="company-name">{{company.name}}</div>
        {{#company.address}}<div class="muted">{{company.address}}</div>{{/company.address}}
        {{#company.phone}}<div class="muted">Tel: {{company.phone}}</div>{{/company.phone}}
        {{#company.pan_or_vat}}<div class="muted">PAN/VAT: {{company.pan_or_vat}}</div>{{/company.pan_or_vat}}
    </div>
    <hr>
    <table class="meta">
        <tr><td>Receipt No.</td><td>{{document.number}}</td></tr>
        <tr><td>Date</td><td>{{document.date}}</td></tr>
        <tr><td>Customer</td><td>{{customer.name}}</td></tr>
    </table>
    <hr>
    <table>
        <thead>
            <tr><th>Item</th><th class="center">Qty</th><th class="right">Rate</th><th class="right">Amt</th></tr>
        </thead>
        <tbody>
            {{#items}}
            <tr><td>{{product_name}}</td><td class="center">{{qty}}</td><td class="right">{{unit_price}}</td><td class="right">{{line_total}}</td></tr>
            {{/items}}
        </tbody>
    </table>
    <hr>
    <table class="totals">
        <tr><td>Subtotal</td><td>{{totals.subtotal}}</td></tr>
        <tr><td>Discount</td><td>{{totals.discount}}</td></tr>
        <tr><td>Tax</td><td>{{totals.tax}}</td></tr>
        <tr class="grand"><td>Total</td><td>{{totals.grand_total}}</td></tr>
        <tr><td>Paid</td><td>{{totals.paid_amount}}</td></tr>
        <tr><td>Change</td><td>{{totals.change_amount}}</td></tr>
    </table>
    <hr>
    <div class="center footer">{{document.notes}}{{^document.notes}}Thank you for your purchase. Please visit again!{{/document.notes}}</div>
</div>
`.trim();

const defaultPosReceiptTemplateCss = `
.pos-receipt-print-document,
.pos-receipt {
    box-sizing: border-box;
    width: 80mm;
    max-width: 80mm;
    padding: 8px 6px;
    background: #fff;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.35;
}
.pos-receipt-print-document * { box-sizing: border-box; }
.pos-receipt-print-document table { width: 100%; border-collapse: collapse; }
.pos-receipt-print-document th,
.pos-receipt-print-document td { padding: 2px 0; vertical-align: top; }
.pos-receipt-print-document th { border-bottom: 1px solid #999; font-size: 11px; }
.pos-receipt-print-document hr { border: 0; border-top: 1px dashed #999; margin: 6px 0; }
.pos-receipt-print-document .center { text-align: center; }
.pos-receipt-print-document .right { text-align: right; }
.pos-receipt-print-document .muted { color: #444; font-size: 11px; }
.pos-receipt-print-document .company-name { font-size: 15px; font-weight: 800; }
.pos-receipt-print-document .meta td:last-child,
.pos-receipt-print-document .totals td:last-child { text-align: right; font-weight: 600; }
.pos-receipt-print-document .grand td { border-top: 2px solid #111; border-bottom: 2px solid #111; font-size: 14px; font-weight: 800; padding: 4px 0; }
.pos-receipt-print-document .footer { color: #555; font-size: 11px; margin-top: 8px; }
@page { size: 80mm auto; margin: 0; }
@media print {
    .pos-receipt-print-document { width: 80mm; max-width: 80mm; }
}
`.trim();

const posReceiptPrintPageCss = `
@page { size: 80mm auto; margin: 2mm; }
@media print {
    .pos-receipt-print-document {
        width: 76mm !important;
        max-width: 76mm !important;
    }
}
`.trim();

export default function PosIndex() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { props } = usePage();

  const auth = props.auth || {};
  const branchContext = props.branchContext || {};
  const permissions = auth.permissions || [];
  const canBypassPermissions = !!auth.canBypassPermissions;

  const can = (permission) =>
    canBypassPermissions || permissions.includes(permission);

  const canViewAllBranches = !!branchContext.canViewAllBranches;
  const queryParams = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const requestedTerminalId = queryParams.get("pos_terminal_id");
  const requestedShiftId = queryParams.get("pos_shift_id");

  const userDefaultBranchId =
    branchContext.selectedBranchId ||
    auth.currentBranchId ||
    auth.user?.current_branch_id ||
    auth.user?.branch_id ||
    null;

  const barcodeRef = useRef(null);
  const beepContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const lastAutoBeepAtRef = useRef(0);
  const scannerBufferRef = useRef("");
  const scannerTimerRef = useRef(null);
  const printedSaleRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [terminalLoading, setTerminalLoading] = useState(false);

  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(userDefaultBranchId);

  const [terminals, setTerminals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [heldSales, setHeldSales] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [activeSaleId, setActiveSaleId] = useState(null);
  const [terminalId, setTerminalId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [recentScanId, setRecentScanId] = useState(null);
  const [scannerState, setScannerState] = useState({
    status: "ready",
    code: "",
    message: "Scanner ready",
  });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([{ ...emptyPayment }]);

  const [summary, setSummary] = useState({
    subtotal: 0,
    discount_total: 0,
    tax_total: 0,
    grand_total: 0,
    paid_total: 0,
    balance_due: 0,
    change_amount: 0,
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [receiptTemplate, setReceiptTemplate] = useState(null);
  const [receiptTemplateLoading, setReceiptTemplateLoading] = useState(false);
  const [receiptTemplateError, setReceiptTemplateError] = useState("");
  const [companyInfo, setCompanyInfo] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [shiftForm] = Form.useForm();

  const [addTerminalOpen, setAddTerminalOpen] = useState(false);
  const [addTerminalForm] = Form.useForm();
  const [addTerminalLoading, setAddTerminalLoading] = useState(false);

  const [cashMovementOpen, setCashMovementOpen] = useState(false);
  const [cashMovementType, setCashMovementType] = useState("cash_in");
  const [cashMovementForm] = Form.useForm();
  const [cashMovementLoading, setCashMovementLoading] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [closeShiftForm] = Form.useForm();
  const [closeShiftLoading, setCloseShiftLoading] = useState(false);

  const selectedTerminal = useMemo(() => {
    return terminals.find((terminal) => terminal.id === terminalId) || null;
  }, [terminalId, terminals]);

  const selectedBranch = useMemo(() => {
    return (
      branches.find((branch) => String(branch.id) === String(activeBranchId)) ||
      null
    );
  }, [branches, activeBranchId]);

  const terminalOptions = useMemo(() => {
    return terminals.map((terminal) => ({
      value: terminal.id,
      label: `${terminal.name} (${terminal.code})`,
    }));
  }, [terminals]);

  const branchOptions = useMemo(() => {
    return branches.map((branch) => ({
      value: branch.id,
      label: `${branch.name}${branch.code ? ` (${branch.code})` : ""}`,
    }));
  }, [branches]);

  const customerOptions = useMemo(() => {
    return contacts.map((contact) => ({
      value: contact.id,
      label: contact.name,
    }));
  }, [contacts]);

  const defaultCustomerId = useMemo(() => {
    return (
      selectedTerminal?.default_customer_id ||
      selectedTerminal?.default_customer?.id ||
      selectedTerminal?.defaultCustomer?.id ||
      contacts.find(isWalkInCustomer)?.id ||
      null
    );
  }, [contacts, selectedTerminal]);

  const effectiveCustomerId = customerId || defaultCustomerId;

  const terminalWarnings = useMemo(() => {
    if (!selectedTerminal) return ["No terminal selected."];

    const warnings = [];
    const hasTrackedItem = cart.some((item) => item.track_inventory);

    if (hasTrackedItem && !selectedTerminal.warehouse_id) {
      warnings.push("Warehouse is required for inventory-tracked products.");
    }

    return warnings;
  }, [cart, selectedTerminal]);

  const checkoutError = useMemo(() => {
    if (!can("pos.sale.create")) return "No permission to create POS sales.";
    if (!selectedTerminal) return "No terminal selected.";
    if (!currentShift?.id) return "No open shift.";
    if (cart.length < 1) return "Cart is empty.";

    const hasTrackedItem = cart.some((item) => item.track_inventory);
    if (hasTrackedItem && !selectedTerminal?.warehouse_id)
      return "Warehouse is required for inventory-tracked products.";

    const missingStock = cart.find(
      (item) =>
        item.track_inventory &&
        item.available_stock !== null &&
        item.available_stock !== undefined &&
        Number(item.qty || 0) > Number(item.available_stock || 0),
    );
    if (missingStock)
      return `${missingStock.product_name} has only ${missingStock.available_stock} available.`;

    const moneyPayments = payments.filter(
      (payment) =>
        payment.payment_method !== "credit" && Number(payment.amount || 0) > 0,
    );
    const hasCredit =
      payments.some((payment) => payment.payment_method === "credit") ||
      summary.balance_due > 0;
    const hasNonCash = moneyPayments.some(
      (payment) => payment.payment_method !== "cash",
    );

    if (hasCredit && !effectiveCustomerId)
      return "Customer is required for credit sale.";
    if (hasCredit && !can("pos.sale.credit"))
      return "No permission to complete credit sales.";
    if (!hasCredit && summary.paid_total + 0.009 < summary.grand_total)
      return "Amount received is less than grand total.";
    if (summary.change_amount > 0.009 && hasNonCash)
      return "Overpayment is allowed only for cash sales.";

    return null;
  }, [
    cart,
    currentShift,
    effectiveCustomerId,
    payments,
    selectedTerminal,
    summary,
    permissions,
    canBypassPermissions,
  ]);

  const pageStyle = {
    padding: "16px clamp(10px, 2vw, 24px)",
    background: `linear-gradient(180deg, ${token.colorBgLayout} 0%, ${token.colorFillQuaternary} 100%)`,
    minHeight: "calc(100vh - 72px)",
  };

  const centerShellStyle = {
    minHeight: 520,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(16px, 3vw, 28px)",
  };

  const cardStyle = {
    borderRadius: token.borderRadiusLG + 4,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,
  };

  const panelHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 10,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  };

  const mutedBoxStyle = {
    padding: 12,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  const scannerShellStyle = {
    padding: 10,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  };

  const productCardStyle = (product) => {
    const scanned = recentScanId === product.id;

    return {
      height: "100%",
      minHeight: 128,
      borderRadius: token.borderRadiusLG + 2,
      border: `1px solid ${scanned ? token.colorSuccess : token.colorBorderSecondary}`,
      background: scanned ? token.colorSuccessBg : token.colorBgContainer,
      boxShadow: scanned ? token.boxShadowSecondary : "none",
      transition:
        "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease",
    };
  };

  const metricCardStyle = {
    padding: 12,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  const totalStripStyle = {
    padding: 14,
    borderRadius: token.borderRadiusLG + 2,
    background: token.colorPrimaryBg,
    border: `1px solid ${token.colorPrimaryBorder}`,
  };

  useEffect(() => {
    if (!requestedTerminalId || !requestedShiftId) {
      router.visit(route("pos.index"));
      return;
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    calculateCart();
  }, [cart, payments]);

  useEffect(() => {
    if (!activeSaleId && defaultCustomerId && !customerId) {
      setCustomerId(defaultCustomerId);
    }
  }, [activeSaleId, customerId, defaultCustomerId]);

  useEffect(() => {
    if (!terminalId) {
      setCurrentShift(null);
      setProducts([]);
      setHeldSales([]);
      return;
    }

    void loadCurrentShift(terminalId, { enforceSelection: true });
    void loadHeldSales();
  }, [terminalId]);

  useEffect(() => {
    if (!terminalId || !currentShift?.id) return;

    void loadProducts();
  }, [terminalId, currentShift?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (terminalId && currentShift?.id) {
        void loadProducts(searchText);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchText, terminalId, currentShift?.id]);

  const resetScannerBuffer = () => {
    scannerBufferRef.current = "";
    window.clearTimeout(scannerTimerRef.current);
  };

  useEffect(() => {
    if (!terminalId || !currentShift?.id) return undefined;

    const isTypingTarget = (target) => {
      const tagName = String(target?.tagName || "").toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable ||
        !!target?.closest?.(".ant-select") ||
        !!target?.closest?.(".ant-modal") ||
        !!target?.closest?.(".ant-drawer")
      );
    };

    const flushScannerBuffer = () => {
      const code = scannerBufferRef.current.trim();
      resetScannerBuffer();
      if (code.length >= MIN_BARCODE_LENGTH) {
        void scanBarcode(code);
      }
    };

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "Enter") {
        flushScannerBuffer();
        return;
      }

      if (event.key.length !== 1) return;

      scannerBufferRef.current += event.key;
      window.clearTimeout(scannerTimerRef.current);
      scannerTimerRef.current = window.setTimeout(() => {
        resetScannerBuffer();
      }, SCANNER_TIMEOUT_MS);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resetScannerBuffer();
    };
  }, [
    terminalId,
    currentShift?.id,
    selectedTerminal?.warehouse_id,
    activeBranchId,
  ]);

  useEffect(() => {
    if (!receiptOpen || !saleReceipt) return;

    let active = true;

    const loadReceiptTemplate = async () => {
      setReceiptTemplateLoading(true);
      setReceiptTemplateError("");

      try {
        const [templateResponse, companyResponse] = await Promise.all([
          axios.get(api("/api/printing-templates/resolve"), {
            params: {
              document_type: "pos_sale",
            },
          }),
          axios
            .get(api("/api/app-settings/current"))
            .catch(() => ({ data: null })),
        ]);

        if (!active) return;

        setReceiptTemplate(
          templateResponse.data?.data ?? templateResponse.data ?? null,
        );
        setCompanyInfo(
          companyResponse.data?.data ?? companyResponse.data ?? null,
        );
      } catch (error) {
        if (!active) return;

        setReceiptTemplate(null);
        setReceiptTemplateError(
          error?.response?.data?.message ||
            "No active POS receipt template found. The fallback receipt will be used.",
        );
      } finally {
        if (active) setReceiptTemplateLoading(false);
      }
    };

    void loadReceiptTemplate();

    return () => {
      active = false;
    };
  }, [receiptOpen, saleReceipt]);

  useEffect(() => {
    if (receiptOpen && saleReceipt && !receiptTemplateLoading) {
      if (printedSaleRef.current !== saleReceipt.id) {
        printedSaleRef.current = saleReceipt.id;
        setTimeout(() => window.print(), 300);
      }
    }
  }, [receiptOpen, saleReceipt, receiptTemplateLoading]);

  useEffect(() => {
    const shouldAutoBeep = (target) => {
      if (!target?.closest) return false;
      if (target.closest('[data-pos-silent="true"]')) return false;

      return !!target.closest(
        [
          "button",
          ".ant-btn",
          ".ant-card-hoverable",
          ".ant-select-selector",
          ".ant-select-item-option",
          ".ant-switch",
          ".ant-input-number-handler",
          ".pos-payment-method-box",
          ".pos-click-sound",
          '[role="button"]',
        ].join(","),
      );
    };

    const handlePointerDown = (event) => {
      unlockPosAudio();

      if (!shouldAutoBeep(event.target)) return;

      const now = Date.now();
      if (now - lastAutoBeepAtRef.current < 45) return;
      lastAutoBeepAtRef.current = now;

      playPosBeep("tap", { soft: true });
    };

    const handleKeyDown = (event) => {
      unlockPosAudio();

      const target = event.target;
      const isTypingField = ["input", "textarea", "select"].includes(
        String(target?.tagName || "").toLowerCase(),
      );

      if (isTypingField || target?.isContentEditable) return;
      if (!["Enter", " ", "Escape"].includes(event.key)) return;

      const now = Date.now();
      if (now - lastAutoBeepAtRef.current < 45) return;
      lastAutoBeepAtRef.current = now;

      playPosBeep("key", { soft: true });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  async function bootstrap() {
    setLoading(true);

    try {
      const resolvedBranchId = userDefaultBranchId;

      const [contactPayload, dashboardPayload, branchPayload] =
        await Promise.all([
          fetchList("/api/contacts", {
            page_size: 100,
          }),
          axios.get(api("/api/pos/dashboard")),
          fetchList("/api/branches", {
            page_size: 100,
            active: true,
          }),
        ]);

      const branchRows = canViewAllBranches
        ? branchPayload.results || []
        : (branchPayload.results || []).filter((branch) => {
            return String(branch.id) === String(resolvedBranchId);
          });

      const fallbackBranchId =
        resolvedBranchId ||
        branchRows.find((branch) => branch.active)?.id ||
        branchRows[0]?.id ||
        null;

      let contactRows = contactPayload.results || [];

      if (!contactRows.some(isWalkInCustomer)) {
        const walkInPayload = await fetchList("/api/contacts", {
          search: "Walk-in",
          contact_type: "customer",
          page_size: 5,
        });

        const knownIds = new Set(contactRows.map((contact) => contact.id));
        contactRows = [
          ...contactRows,
          ...(walkInPayload.results || []).filter(
            (contact) => !knownIds.has(contact.id),
          ),
        ];
      }

      setBranches(branchRows);
      setActiveBranchId(fallbackBranchId);
      setContacts(contactRows);
      setDashboard(dashboardPayload.data || null);

      await loadTerminalsForBranch(fallbackBranchId, {
        silent: true,
        requestedTerminalId,
      });
    } catch (error) {
      showApiError(message, error, "Failed to load POS screen.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTerminalsForBranch(branchId, options = {}) {
    setTerminalLoading(true);

    try {
      const terminalParams = {
        page_size: 100,
        active: true,
      };

      if (branchId) {
        terminalParams.branch_id = branchId;
      }

      const terminalPayload = await fetchList(
        "/api/pos-terminals",
        terminalParams,
      );

      const terminalRows = terminalPayload.results || [];

      const scopedTerminals = branchId
        ? terminalRows.filter(
            (terminal) => String(terminal.branch_id) === String(branchId),
          )
        : terminalRows;

      const defaultTerminal =
        scopedTerminals.find(
          (terminal) =>
            String(terminal.id) === String(options.requestedTerminalId),
        ) ||
        scopedTerminals.find((terminal) => terminal.is_default) ||
        scopedTerminals[0] ||
        null;

      setTerminals(scopedTerminals);
      setTerminalId(defaultTerminal?.id ?? null);
      setCurrentShift(null);
      setProducts([]);
      setHeldSales([]);
      clearSale({ silentSound: true });

      return defaultTerminal;
    } catch (error) {
      if (!options.silent) {
        showApiError(message, error, "Failed to load POS terminals.");
      }

      setTerminals([]);
      setTerminalId(null);
      setCurrentShift(null);
      setProducts([]);
      setHeldSales([]);

      return null;
    } finally {
      setTerminalLoading(false);
    }
  }

  async function handleBranchChange(branchId) {
    if (!canViewAllBranches) return;

    setActiveBranchId(branchId);
    setTerminalId(null);
    setCurrentShift(null);
    setProducts([]);
    setHeldSales([]);
    clearSale({ silentSound: true });

    await loadTerminalsForBranch(branchId);
  }

  async function loadProducts(query = "") {
    if (!terminalId || !currentShift?.id) return;

    try {
      const response = await axios.get(api("/api/pos/products/search"), {
        params: {
          q: query || undefined,
          warehouse_id: selectedTerminal?.warehouse_id,
          branch_id: selectedTerminal?.branch_id || activeBranchId,
          limit: 40,
        },
      });

      setProducts(response.data || []);
    } catch (error) {
      setProducts([]);
      showApiError(message, error, "Failed to load POS products.");
    }
  }

  async function scanBarcode(code, options = {}) {
    const barcode = String(code || "").trim();
    if (!barcode) return;

    if (!terminalId || !currentShift?.id) {
      message.warning("Open a POS shift before scanning products.");
      playPosBeep("error");
      return;
    }

    setScannerState({
      status: "scanning",
      code: barcode,
      message: "Scanning...",
    });

    try {
      const response = await axios.get(api("/api/pos/products/search"), {
        params: {
          barcode,
          exact_barcode: true,
          warehouse_id: selectedTerminal?.warehouse_id,
          branch_id: selectedTerminal?.branch_id || activeBranchId,
          limit: 1,
        },
      });

      const product = (response.data || [])[0];

      if (!product?.id) {
        setScannerState({
          status: "error",
          code: barcode,
          message: `Not found: ${barcode}`,
        });
        playPosBeep("error");
        message.warning(`No saleable product found for barcode "${barcode}".`);

        if (options.manual) {
          void loadProducts(barcode);
        }

        barcodeRef.current?.focus();
        return;
      }

      addProduct(product, { scanned: true, barcode });

      setScannerState({
        status: "success",
        code: barcode,
        message: `${product.name} added`,
      });
      setRecentScanId(product.id);
      setTimeout(
        () =>
          setRecentScanId((current) =>
            current === product.id ? null : current,
          ),
        1200,
      );

      setSearchText("");
      barcodeRef.current?.focus();
    } catch (error) {
      setScannerState({
        status: "error",
        code: barcode,
        message: "Scan failed",
      });
      playPosBeep("error");
      showApiError(message, error, "Barcode scan failed.");
      barcodeRef.current?.focus();
    }
  }

  async function loadCurrentShift(targetTerminalId = terminalId, options = {}) {
    if (!targetTerminalId) {
      setCurrentShift(null);
      return null;
    }

    setShiftLoading(true);

    try {
      const targetTerminal = terminals.find(
        (terminal) => terminal.id === targetTerminalId,
      );

      const response = await axios.get(api("/api/pos-shifts/current"), {
        params: {
          pos_terminal_id: targetTerminalId,
          branch_id: targetTerminal?.branch_id || activeBranchId,
        },
      });

      const shift = response.data || null;

      if (
        options.enforceSelection &&
        (!shift?.id ||
          (requestedShiftId && String(shift.id) !== String(requestedShiftId)))
      ) {
        message.warning("Select an open terminal shift before selling.");
        router.visit(route("pos.index"));
        return null;
      }

      setCurrentShift(shift);

      if (!shift) {
        shiftForm.setFieldsValue({
          terminal_id: targetTerminalId,
          branch_id: targetTerminal?.branch_id || activeBranchId,
          opening_cash: 0,
          notes: "",
        });
      }

      return shift;
    } catch (error) {
      setCurrentShift(null);
      showApiError(message, error, "Failed to load current shift.");
      return null;
    } finally {
      setShiftLoading(false);
    }
  }

  async function loadHeldSales() {
    if (!terminalId) return;

    try {
      const payload = await fetchList("/api/pos-sales", {
        pos_terminal_id: terminalId,
        branch_id: selectedTerminal?.branch_id || activeBranchId,
        status: "held",
        page_size: 50,
      });

      setHeldSales(payload.results || []);
    } catch (error) {
      setHeldSales([]);
      showApiError(message, error, "Failed to load held POS sales.");
    }
  }

  function calculateCart() {
    const subtotal = cart.reduce((sum, item) => {
      return sum + Number(item.qty || 0) * Number(item.unit_price || 0);
    }, 0);

    const discountTotal = cart.reduce((sum, item) => {
      const base = Number(item.qty || 0) * Number(item.unit_price || 0);

      if (item.is_complimentary) {
        return sum + base;
      }

      const percentAmount = base * (Number(item.discount_percent || 0) / 100);

      return sum + Math.min(percentAmount, base);
    }, 0);

    const taxTotal = cart.reduce((sum, item) => {
      if (item.is_complimentary) {
        return sum;
      }

      const rate = Number(
        item.tax_rate?.rate_percent || item.tax_rate_percent || 0,
      );
      const base = Number(item.qty || 0) * Number(item.unit_price || 0);
      const discount = base * (Number(item.discount_percent || 0) / 100);

      return sum + Math.max(base - discount, 0) * (rate / 100);
    }, 0);

    const grandTotal = subtotal - discountTotal + taxTotal;

    const paidTotal = payments.reduce((sum, payment) => {
      if (payment.payment_method === "credit") {
        return sum;
      }

      return sum + Number(payment.amount || 0);
    }, 0);

    setSummary({
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      paid_total: paidTotal,
      balance_due: Math.max(grandTotal - paidTotal, 0),
      change_amount: Math.max(paidTotal - grandTotal, 0),
    });
  }

  const cartKey = (item) => `${item.product_id}:${item.variant_id || ""}`;
  const cartKeyFromProduct = (product) =>
    `${product.id}:${product.variant_id || ""}`;

  function addProduct(product, options = {}) {
    if (!currentShift?.id) {
      message.warning("Open a shift before adding products.");
      return;
    }

    if (
      product.track_inventory &&
      product.available_stock !== null &&
      product.available_stock !== undefined &&
      Number(product.available_stock) < 1
    ) {
      message.warning(`${product.name} is out of stock.`);
      playPosBeep("error");
      return;
    }

    setCart((current) => {
      const key = cartKeyFromProduct(product);
      const existing = current.find((item) => cartKey(item) === key);

      if (existing) {
        if (
          product.track_inventory &&
          product.available_stock !== null &&
          product.available_stock !== undefined &&
          Number(existing.qty || 0) + 1 > Number(product.available_stock || 0)
        ) {
          message.warning(
            `${product.name} has only ${product.available_stock} available.`,
          );
          playPosBeep("error");
          return current;
        }

        playPosBeep(options.scanned ? "scan" : "tap");

        return current.map((item) =>
          cartKey(item) === key
            ? { ...item, qty: Number(item.qty || 0) + 1 }
            : item,
        );
      }

      playPosBeep(options.scanned ? "scan" : "tap");

      return [
        ...current,
        {
          product_id: product.id,
          variant_id: product.variant_id ?? null,
          product_name: product.name,
          product_code: product.code,
          sku: product.sku ?? null,
          barcode: options.barcode || product.barcode,
          qty: 1,
          unit_price: Number(product.selling_price || 0),
          discount_percent: 0,
          tax_rate_id: product.tax_rate?.id ?? null,
          tax_rate: product.tax_rate ?? null,
          is_complimentary: false,
          complimentary_reason: "",
          available_stock: product.available_stock,
          track_inventory: product.track_inventory,
        },
      ];
    });

    barcodeRef.current?.focus();
  }

  function getPosAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    if (!beepContextRef.current) {
      beepContextRef.current = new AudioContext();
    }

    return beepContextRef.current;
  }

  function unlockPosAudio() {
    try {
      const audioContext = getPosAudioContext();
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        void audioContext.resume().then(() => {
          audioUnlockedRef.current = true;
        });
        return;
      }

      audioUnlockedRef.current = true;
    } catch {
      // Audio unlock is best-effort.
    }
  }

  function playPosBeep(type = "tap", options = {}) {
    try {
      const audioContext = getPosAudioContext();
      if (!audioContext) return;

      const requestedType = type || "tap";
      const patterns = {
        scan: [
          {
            frequency: 1760,
            start: 0,
            duration: 0.045,
            volume: 0.09,
            type: "square",
          },
          {
            frequency: 2349,
            start: 0.052,
            duration: 0.035,
            volume: 0.065,
            type: "square",
          },
        ],
        tap: [
          {
            frequency: 1250,
            start: 0,
            duration: 0.028,
            volume: 0.035,
            type: "triangle",
          },
        ],
        key: [
          {
            frequency: 960,
            start: 0,
            duration: 0.024,
            volume: 0.025,
            type: "triangle",
          },
        ],
        success: [
          {
            frequency: 1318,
            start: 0,
            duration: 0.055,
            volume: 0.065,
            type: "square",
          },
          {
            frequency: 1760,
            start: 0.07,
            duration: 0.055,
            volume: 0.06,
            type: "square",
          },
        ],
        checkout: [
          {
            frequency: 988,
            start: 0,
            duration: 0.045,
            volume: 0.055,
            type: "triangle",
          },
          {
            frequency: 1318,
            start: 0.055,
            duration: 0.055,
            volume: 0.052,
            type: "triangle",
          },
        ],
        complete: [
          {
            frequency: 1175,
            start: 0,
            duration: 0.055,
            volume: 0.07,
            type: "triangle",
          },
          {
            frequency: 1568,
            start: 0.065,
            duration: 0.065,
            volume: 0.065,
            type: "triangle",
          },
          {
            frequency: 2093,
            start: 0.145,
            duration: 0.075,
            volume: 0.06,
            type: "square",
          },
          {
            frequency: 125,
            start: 0.245,
            duration: 0.045,
            volume: 0.045,
            type: "sawtooth",
          },
        ],
        hold: [
          {
            frequency: 659,
            start: 0,
            duration: 0.05,
            volume: 0.05,
            type: "triangle",
          },
          {
            frequency: 523,
            start: 0.06,
            duration: 0.05,
            volume: 0.045,
            type: "triangle",
          },
        ],
        remove: [
          {
            frequency: 330,
            start: 0,
            duration: 0.045,
            volume: 0.045,
            type: "triangle",
          },
        ],
        clear: [
          {
            frequency: 392,
            start: 0,
            duration: 0.045,
            volume: 0.045,
            type: "square",
          },
          {
            frequency: 262,
            start: 0.055,
            duration: 0.045,
            volume: 0.04,
            type: "square",
          },
        ],
        open: [
          {
            frequency: 880,
            start: 0,
            duration: 0.055,
            volume: 0.055,
            type: "triangle",
          },
          {
            frequency: 1175,
            start: 0.065,
            duration: 0.055,
            volume: 0.05,
            type: "triangle",
          },
        ],
        cash: [
          {
            frequency: 784,
            start: 0,
            duration: 0.045,
            volume: 0.05,
            type: "triangle",
          },
          {
            frequency: 1046,
            start: 0.055,
            duration: 0.045,
            volume: 0.045,
            type: "triangle",
          },
        ],
        error: [
          {
            frequency: 196,
            start: 0,
            duration: 0.11,
            volume: 0.09,
            type: "sawtooth",
          },
          {
            frequency: 164,
            start: 0.12,
            duration: 0.12,
            volume: 0.08,
            type: "sawtooth",
          },
        ],
      };

      const notes = patterns[requestedType] || patterns.tap;

      const scheduleNotes = () => {
        const now = audioContext.currentTime + 0.004;
        const volumeMultiplier = options.soft ? 0.65 : 1;

        notes.forEach((note) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const start = now + note.start;
          const end = start + note.duration;

          oscillator.type = note.type || "square";
          oscillator.frequency.setValueAtTime(note.frequency, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(
            Math.max((note.volume || 0.04) * volumeMultiplier, 0.001),
            start + 0.006,
          );
          gain.gain.exponentialRampToValueAtTime(0.0001, end);

          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(start);
          oscillator.stop(end + 0.01);
        });
      };

      if (audioContext.state === "suspended") {
        void audioContext.resume().then(() => {
          audioUnlockedRef.current = true;
          scheduleNotes();
        });
        return;
      }

      audioUnlockedRef.current = true;
      scheduleNotes();
    } catch {
      // Browser audio is best-effort. It needs one click/key gesture before sound can start.
    }
  }

  function updateCartLine(index, key, value) {
    playPosBeep(key === "qty" ? "key" : "tap", { soft: true });

    setCart((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]:
                key === "qty" &&
                item.track_inventory &&
                item.available_stock !== null &&
                item.available_stock !== undefined
                  ? Math.min(
                      Number(value || 1),
                      Number(item.available_stock || 0),
                    )
                  : value,
            }
          : item,
      ),
    );
  }

  function removeLine(index) {
    playPosBeep("remove");
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removePaymentRow(index) {
    setPayments((current) => {
      if (current.length <= 1) {
        playPosBeep("error");
        message.warning("At least one payment method is required.");
        return current;
      }

      playPosBeep("remove");
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function selectPaymentMethod(method) {
    playPosBeep("tap");
    const amount =
      method === "credit" ? 0 : Math.max(Number(summary.grand_total || 0), 0);
    setPayments([
      { payment_method: method, amount, reference: "", transaction_no: "" },
    ]);
  }

  function clearSale(options = {}) {
    if (!options.silentSound && (cart.length > 0 || activeSaleId)) {
      playPosBeep("clear");
    }

    setCart([]);
    setPayments([{ ...emptyPayment }]);
    setActiveSaleId(null);
    setCustomerId(defaultCustomerId || null);

    if (!options.keepReceipt) {
      setSaleReceipt(null);
    }

    barcodeRef.current?.focus();
  }

  async function submitOpenShift(values) {
    if (!terminalId) {
      message.warning("Select a terminal before opening shift.");
      return;
    }

    if (!can("pos.shift.open")) {
      message.error("You do not have permission to open POS shift.");
      return;
    }

    setProcessing(true);

    try {
      const terminalBranchId = selectedTerminal?.branch_id || activeBranchId;

      const response = await axios.post(api("/api/pos-shifts/open"), {
        pos_terminal_id: terminalId,
        branch_id: terminalBranchId,
        opening_cash: values.opening_cash || 0,
        notes: values.notes || null,
      });

      setCurrentShift(response.data);
      shiftForm.resetFields();

      await loadHeldSales();

      playPosBeep("open");
      message.success("Shift opened.");

      setTimeout(() => {
        barcodeRef.current?.focus();
      }, 80);
    } catch (error) {
      showApiError(message, error, "Failed to open shift.");
    } finally {
      setProcessing(false);
    }
  }

  async function ensureActiveShift() {
    if (!terminalId) {
      message.warning("Select a terminal before continuing.");
      return null;
    }

    if (currentShift?.id) {
      return currentShift;
    }

    const shift = await loadCurrentShift(terminalId);

    if (shift?.id) {
      return shift;
    }

    message.warning("Open a shift before continuing.");
    return null;
  }

  async function holdSale() {
    const shift = await ensureActiveShift();

    if (!shift?.id) return;

    if (cart.length < 1) {
      message.warning("Add products before holding the cart.");
      return;
    }

    setProcessing(true);

    try {
      let saleId = activeSaleId;
      const payload = buildSalePayload("draft", shift.id);

      if (saleId) {
        await axios.patch(api(`/api/pos-sales/${saleId}`), payload);
      } else {
        const draftResponse = await axios.post(api("/api/pos-sales"), payload);
        saleId = draftResponse.data?.id;
      }

      await axios.post(
        api(`/api/pos-sales/${saleId}/hold`),
        buildSalePayload("held", shift.id),
      );

      await loadHeldSales();

      playPosBeep("hold");
      clearSale({ silentSound: true });
      message.success("Sale held successfully.");
    } catch (error) {
      showApiError(message, error, "Unable to hold sale.");
    } finally {
      setProcessing(false);
    }
  }

  async function completeSale() {
    const shift = await ensureActiveShift();

    if (!shift?.id) return;

    if (cart.length < 1) {
      message.warning("Cart is empty.");
      return;
    }

    if (checkoutError) {
      message.error(checkoutError);
      return;
    }

    setProcessing(true);

    try {
      let saleId = activeSaleId;
      const payload = buildSalePayload("draft", shift.id);

      if (saleId) {
        await axios.patch(api(`/api/pos-sales/${saleId}`), payload);
      } else {
        const draftResponse = await axios.post(api("/api/pos-sales"), payload);
        saleId = draftResponse.data?.id;
      }

      const response = await axios.post(
        api(`/api/pos-sales/${saleId}/complete`),
        {
          ...payload,
          approved: true,
          allow_credit_sale:
            payments.some((payment) => payment.payment_method === "credit") ||
            summary.balance_due > 0,
        },
      );

      setSaleReceipt(response.data);
      setCheckoutOpen(false);
      setReceiptOpen(true);

      await loadCurrentShift();
      await loadHeldSales();
      await loadProducts(searchText);

      playPosBeep("complete");
      clearSale({
        keepReceipt: true,
        silentSound: true,
      });

      message.success("Sale completed.");
    } catch (error) {
      showApiError(message, error, "Unable to complete sale.");
    } finally {
      setProcessing(false);
    }
  }

  function buildSalePayload(status = "draft", shiftId = currentShift?.id) {
    return {
      branch_id: selectedTerminal?.branch_id || activeBranchId,
      pos_terminal_id: terminalId,
      pos_shift_id: shiftId || null,
      warehouse_id: selectedTerminal?.warehouse_id,
      contact_id: effectiveCustomerId || null,
      status,
      sale_date: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      items: cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        barcode: item.barcode,
        qty: Number(item.qty || 0),
        unit_price: Number(item.unit_price || 0),
        discount_percent: Number(item.discount_percent || 0),
        tax_rate_id: item.tax_rate_id || null,
        is_complimentary: !!item.is_complimentary,
        complimentary_reason: item.complimentary_reason || null,
        remarks: item.remarks || null,
      })),
      payments: payments
        .filter(
          (payment) =>
            payment.payment_method === "credit" ||
            Number(payment.amount || 0) > 0,
        )
        .map((payment) => ({
          payment_method: payment.payment_method,
          amount:
            payment.payment_method === "credit"
              ? 0
              : Number(payment.amount || 0),
          payment_date: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          reference: payment.reference || null,
          transaction_no: payment.transaction_no || null,
        })),
    };
  }

  function resumeHeldSale(sale) {
    setActiveSaleId(sale.id);
    setCustomerId(sale.contact_id || defaultCustomerId || null);

    setCart(
      (sale.pos_sale_lines || []).map((line) => ({
        product_id: line.product_id,
        product_name: line.product_name,
        product_code: line.product_code,
        barcode: line.barcode,
        qty: Number(line.qty || 0),
        unit_price: Number(line.unit_price || 0),
        discount_percent: Number(line.discount_percent || 0),
        tax_rate_id: line.tax_rate_id || null,
        tax_rate: line.tax_rate || null,
        is_complimentary: !!line.is_complimentary,
        complimentary_reason: line.complimentary_reason || "",
        remarks: line.remarks || null,
      })),
    );

    setPayments(
      (sale.pos_payments || []).length > 0
        ? sale.pos_payments
        : [{ ...emptyPayment }],
    );
    setHeldOpen(false);

    playPosBeep("open");
    message.success(`Resumed ${sale.sale_no}.`);
  }

  async function submitAddTerminal(values) {
    setAddTerminalLoading(true);

    try {
      const branchId = canViewAllBranches
        ? values.branch_id || activeBranchId
        : activeBranchId;

      const response = await axios.post(api("/api/pos-terminals/"), {
        name: values.name,
        branch_id: branchId,
        warehouse_id: values.warehouse_id || null,
        active: true,
      });

      const newTerminal = response.data;

      if (String(newTerminal.branch_id) !== String(activeBranchId)) {
        setActiveBranchId(newTerminal.branch_id);
      }

      await loadTerminalsForBranch(newTerminal.branch_id);

      setTerminalId(newTerminal.id);
      setAddTerminalOpen(false);
      addTerminalForm.resetFields();

      message.success(`Terminal "${newTerminal.name}" created and selected.`);
    } catch (error) {
      showApiError(message, error, "Failed to create terminal.");
    } finally {
      setAddTerminalLoading(false);
    }
  }

  function openCashMovement(type) {
    if (!currentShift?.id) {
      message.warning("Open a shift before recording cash movement.");
      return;
    }

    setCashMovementType(type);
    cashMovementForm.setFieldsValue({
      type,
      amount: 0,
      reason: "",
      notes: "",
    });
    setCashMovementOpen(true);
  }

  async function submitCashMovement(values) {
    if (!currentShift?.id) return;

    setCashMovementLoading(true);

    try {
      await axios.post(api("/api/pos-cash-movements/"), {
        pos_terminal_id: terminalId,
        pos_shift_id: currentShift.id,
        branch_id: selectedTerminal?.branch_id || activeBranchId,
        type: values.type,
        amount: values.amount,
        reason: values.reason || null,
        notes: values.notes || null,
        approved: true,
      });

      setCashMovementOpen(false);
      cashMovementForm.resetFields();

      await loadCurrentShift();

      playPosBeep("cash");
      message.success("Cash movement recorded.");
    } catch (error) {
      showApiError(message, error, "Failed to record cash movement.");
    } finally {
      setCashMovementLoading(false);
    }
  }

  async function closeShift() {
    if (!currentShift) return;

    Modal.confirm({
      title: "End this POS shift?",
      content:
        "You will reconcile counted cash and close the shift for this terminal.",
      okText: "Continue",
      cancelText: "Cancel",
      okButtonProps: {
        danger: true,
      },
      onOk: () => {
        closeShiftForm.setFieldsValue({
          counted_cash: Number(currentShift.expected_cash || 0),
          closing_notes: "",
        });
        setCloseShiftOpen(true);
      },
    });
  }

  async function submitCloseShift(values) {
    if (!currentShift) return;

    const expectedCash = Number(currentShift.expected_cash || 0);
    const countedCash = Number(values.counted_cash || 0);
    const difference = Number((countedCash - expectedCash).toFixed(2));

    if (difference !== 0 && !values.closing_notes) {
      message.error(
        "Closing note is required when cash difference is not zero.",
      );
      return;
    }

    setCloseShiftLoading(true);

    try {
      const response = await axios.post(
        api(`/api/pos-shifts/${currentShift.id}/close`),
        {
          counted_cash: countedCash,
          closing_notes: values.closing_notes || null,
          has_cash_difference: difference !== 0,
        },
      );

      const closedShiftId = response.data?.id || currentShift.id;

      setCurrentShift(null);
      setProducts([]);
      setCloseShiftOpen(false);
      closeShiftForm.resetFields();
      clearSale({ silentSound: true });

      playPosBeep("complete");
      message.success("Shift closed.");
      router.visit(route("pos.shifts.closing-summary", closedShiftId));
    } catch (error) {
      showApiError(message, error, "Unable to close shift.");
    } finally {
      setCloseShiftLoading(false);
    }
  }

  const receiptTemplateSource = receiptTemplate || {
    name: "Fallback POS Receipt",
    template_key: "pos_sale.fallback",
    template_html: defaultPosReceiptTemplateHtml,
    template_css: defaultPosReceiptTemplateCss,
  };

  const receiptContext = useMemo(() => {
    if (!saleReceipt) return null;

    const lines = saleReceipt.pos_sale_lines || saleReceipt.posSaleLines || [];
    const receiptPayments =
      saleReceipt.pos_payments || saleReceipt.posPayments || [];
    const terminal =
      saleReceipt.pos_terminal ||
      saleReceipt.posTerminal ||
      selectedTerminal ||
      {};
    const shift =
      saleReceipt.pos_shift || saleReceipt.posShift || currentShift || {};
    const branch =
      saleReceipt.branch || selectedBranch || terminal.branch || {};
    const contact = saleReceipt.contact || {};
    const cashier = shift.cashier || saleReceipt.cashier || auth.user || {};
    const currency = saleReceipt.currency || {};

    const formatMoney = (value) => {
      const formatted = money(value);
      return currency.symbol
        ? `${currency.symbol} ${formatted}`
        : `Rs. ${formatted}`;
    };

    const paymentTotals = receiptPayments.reduce((totals, payment) => {
      const method = payment.payment_method || "cash";
      totals[method] = numeric(totals[method]) + numeric(payment.amount);
      return totals;
    }, {});

    const normalizedLines = lines.map((line) => {
      const qty = firstPresent(line.qty, line.quantity, 0);
      const unitPrice = firstPresent(line.unit_price, line.rate, line.price, 0);
      const lineTotal = firstPresent(
        line.line_total,
        line.total,
        line.amount,
        0,
      );

      return {
        ...line,
        product_name: firstPresent(
          line.product_name,
          line.product?.name,
          line.custom_product_name,
          line.description,
          "POS Item",
        ),
        item_name: firstPresent(
          line.product_name,
          line.product?.name,
          line.custom_product_name,
          line.description,
          "POS Item",
        ),
        description: firstPresent(
          line.description,
          line.remarks,
          line.complimentary_reason,
          "",
        ),
        qty: formatQty(qty),
        quantity: formatQty(qty),
        unit_price: formatMoney(unitPrice),
        rate: formatMoney(unitPrice),
        price: formatMoney(unitPrice),
        discount_amount: formatMoney(firstPresent(line.discount_amount, 0)),
        tax_amount: formatMoney(firstPresent(line.tax_amount, 0)),
        line_total: formatMoney(lineTotal),
        amount: formatMoney(lineTotal),
      };
    });

    const customerName = firstPresent(
      saleReceipt.customer_name,
      contact.name,
      contact.label,
      "Walk-in Customer",
    );

    return {
      record: saleReceipt,
      company: {
        name: firstPresent(
          companyInfo?.company_name,
          companyInfo?.name,
          saleReceipt.company?.name,
          branch.name,
          "KiteLedger",
        ),
        legal_name: firstPresent(
          companyInfo?.legal_name,
          companyInfo?.company_name,
          saleReceipt.company?.legal_name,
          "",
        ),
        address: compactAddress(saleReceipt, companyInfo),
        phone: firstPresent(
          companyInfo?.phone,
          saleReceipt.company?.phone,
          branch.phone,
          "",
        ),
        email: firstPresent(
          companyInfo?.email,
          saleReceipt.company?.email,
          branch.email,
          "",
        ),
        website: firstPresent(
          companyInfo?.website,
          saleReceipt.company?.website,
          "",
        ),
        pan_or_vat: firstPresent(
          companyInfo?.tax_number,
          companyInfo?.vat_number,
          saleReceipt.company?.tax_id,
          saleReceipt.company?.pan_no,
          "",
        ),
        tax_id: firstPresent(
          companyInfo?.tax_number,
          companyInfo?.vat_number,
          saleReceipt.company?.tax_id,
          saleReceipt.company?.pan_no,
          "",
        ),
        logo: firstPresent(
          companyInfo?.logo_url,
          companyInfo?.dark_logo_url,
          companyInfo?.logo,
          companyInfo?.dark_logo,
          "",
        ),
      },
      branch: {
        name: firstPresent(branch.name, ""),
        code: firstPresent(branch.code, ""),
        address: firstPresent(branch.address, ""),
        phone: firstPresent(branch.phone, ""),
      },
      terminal: {
        name: firstPresent(terminal.name, ""),
        code: firstPresent(terminal.code, ""),
      },
      cashier: {
        name: firstPresent(cashier.name, ""),
        email: firstPresent(cashier.email, ""),
      },
      customer: {
        name: customerName,
        phone: firstPresent(
          saleReceipt.customer_phone,
          contact.phone,
          contact.mobile,
          "",
        ),
        email: firstPresent(saleReceipt.customer_email, contact.email, ""),
        address: firstPresent(contact.address, contact.billing_address, ""),
        pan_no: firstPresent(contact.pan_no, contact.vat_no, ""),
        vat_no: firstPresent(contact.vat_no, contact.pan_no, ""),
      },
      party: {
        name: customerName,
        phone: firstPresent(
          saleReceipt.customer_phone,
          contact.phone,
          contact.mobile,
          "",
        ),
        email: firstPresent(saleReceipt.customer_email, contact.email, ""),
        address: firstPresent(contact.address, contact.billing_address, ""),
      },
      document: {
        type: "pos_sale",
        title: "POS Sales Receipt",
        number: firstPresent(saleReceipt.sale_no, saleReceipt.id, "Receipt"),
        date: formatDateTime(
          firstPresent(saleReceipt.sale_date, saleReceipt.created_at),
        ),
        status: humanize(firstPresent(saleReceipt.status, "completed")),
        payment_status: humanize(
          firstPresent(saleReceipt.payment_status, "paid"),
        ),
        reference: firstPresent(
          saleReceipt.reference,
          saleReceipt.invoice?.invoice_no,
          "",
        ),
        notes: firstPresent(saleReceipt.receipt_note, saleReceipt.notes, ""),
      },
      currency: {
        code: firstPresent(currency.code, ""),
        symbol: firstPresent(currency.symbol, ""),
        name: firstPresent(currency.name, ""),
      },
      totals: {
        subtotal: formatMoney(firstPresent(saleReceipt.subtotal, 0)),
        discount: formatMoney(firstPresent(saleReceipt.discount_total, 0)),
        tax: formatMoney(firstPresent(saleReceipt.tax_total, 0)),
        round_off: formatMoney(firstPresent(saleReceipt.round_off, 0)),
        grand_total: formatMoney(firstPresent(saleReceipt.grand_total, 0)),
        total: formatMoney(firstPresent(saleReceipt.grand_total, 0)),
        paid: formatMoney(firstPresent(saleReceipt.paid_total, 0)),
        paid_amount: formatMoney(firstPresent(saleReceipt.paid_total, 0)),
        balance: formatMoney(firstPresent(saleReceipt.balance_due, 0)),
        balance_due: formatMoney(firstPresent(saleReceipt.balance_due, 0)),
        change_amount: formatMoney(firstPresent(saleReceipt.change_amount, 0)),
      },
      payment: {
        cash: paymentTotals.cash ? formatMoney(paymentTotals.cash) : "",
        card: paymentTotals.card ? formatMoney(paymentTotals.card) : "",
        online: paymentTotals.online ? formatMoney(paymentTotals.online) : "",
        wallet: paymentTotals.wallet ? formatMoney(paymentTotals.wallet) : "",
        bank_transfer: paymentTotals.bank_transfer
          ? formatMoney(paymentTotals.bank_transfer)
          : "",
        method: receiptPayments
          .map((payment) => humanize(payment.payment_method))
          .filter(Boolean)
          .join(", "),
      },
      payments: receiptPayments.map((payment) => ({
        ...payment,
        method: humanize(payment.payment_method),
        payment_method: humanize(payment.payment_method),
        amount: formatMoney(payment.amount),
        reference: firstPresent(payment.reference, payment.transaction_no, ""),
      })),
      items: normalizedLines,
      lines: normalizedLines,
      prepared_by: firstPresent(
        saleReceipt.user_add?.name,
        saleReceipt.userAdd?.name,
        auth.user?.name,
        "",
      ),
      approved_by: firstPresent(
        saleReceipt.approved_by?.name,
        saleReceipt.approvedBy?.name,
        "",
      ),
      printed_at: dayjs().format("YYYY-MM-DD HH:mm"),
    };
  }, [
    auth.user,
    companyInfo,
    currentShift,
    saleReceipt,
    selectedBranch,
    selectedTerminal,
  ]);

  const renderedReceipt = useMemo(() => {
    if (!receiptContext) {
      return {
        html: "",
        css: defaultPosReceiptTemplateCss,
      };
    }

    const templateHtml =
      receiptTemplateSource.template_html || defaultPosReceiptTemplateHtml;
    const extractedTemplate = extractTemplateBody(templateHtml);
    const embeddedCss = scopeReceiptStyles(extractedTemplate.styles);
    const templateCss = scopeReceiptStyles(
      receiptTemplateSource.template_css || "",
    );
    const css = [
      defaultPosReceiptTemplateCss,
      embeddedCss,
      templateCss,
      posReceiptPrintPageCss,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      html: renderPrintTemplate(
        extractedTemplate.html || defaultPosReceiptTemplateHtml,
        receiptContext,
      ),
      css,
    };
  }, [receiptContext, receiptTemplateSource]);

  const resolvedPaperSize = useMemo(
    () =>
      resolveReceiptPaperSize(receiptTemplate, selectedTerminal, companyInfo),
    [receiptTemplate, selectedTerminal, companyInfo],
  );

  const cartColumns = [
    {
      title: "Item",
      key: "item",
      width: 170,
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <Text
            strong
            ellipsis
            style={{
              display: "block",
              maxWidth: 150,
              fontSize: 12,
            }}
          >
            {record.product_name}
          </Text>

          <br />

          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.product_code || record.barcode || "POS Item"}
          </Text>

          {record.is_complimentary && (
            <div style={{ marginTop: 4 }}>
              <Tag color="blue">Complimentary</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Qty",
      key: "qty",
      width: 104,
      render: (_, record, index) => (
        <Space.Compact size="small">
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() =>
              updateCartLine(
                index,
                "qty",
                Math.max(Number(record.qty || 1) - 1, 1),
              )
            }
          />

          <InputNumber
            size="small"
            controls={false}
            min={1}
            value={record.qty}
            style={{ width: 42 }}
            onChange={(value) => updateCartLine(index, "qty", value || 1)}
          />

          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              updateCartLine(index, "qty", Number(record.qty || 0) + 1)
            }
          />
        </Space.Compact>
      ),
    },
    {
      title: "Price",
      key: "price",
      width: 76,
      render: (_, record, index) => (
        <InputNumber
          size="small"
          controls={false}
          min={0}
          value={record.unit_price}
          style={{ width: 68 }}
          onChange={(value) => updateCartLine(index, "unit_price", value || 0)}
        />
      ),
    },
    {
      title: "Disc %",
      key: "discount",
      width: 62,
      render: (_, record, index) => (
        <InputNumber
          size="small"
          controls={false}
          min={0}
          max={100}
          value={record.discount_percent}
          style={{ width: 54 }}
          onChange={(value) =>
            updateCartLine(index, "discount_percent", value || 0)
          }
        />
      ),
    },
    {
      title: "Free",
      key: "complimentary",
      width: 68,
      align: "center",
      render: (_, record, index) => (
        <Switch
          size="small"
          checked={!!record.is_complimentary}
          onChange={(checked) =>
            updateCartLine(index, "is_complimentary", checked)
          }
        />
      ),
    },
    {
      title: "Total",
      key: "line_total",
      width: 88,
      align: "right",
      render: (_, record) => {
        const base = Number(record.qty || 0) * Number(record.unit_price || 0);

        if (record.is_complimentary) {
          return (
            <Space direction="vertical" size={0} align="end">
              <Text strong style={{ fontSize: 12 }}>
                {money(0)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                free
              </Text>
            </Space>
          );
        }

        const discount = base * (Number(record.discount_percent || 0) / 100);
        const taxRate = Number(record.tax_rate?.rate_percent || 0);
        const tax = Math.max(base - discount, 0) * (taxRate / 100);

        return (
          <Text strong style={{ fontSize: 12 }}>
            {money(base - discount + tax)}
          </Text>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 38,
      render: (_, __, index) => (
        <Button
          danger
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => removeLine(index)}
        />
      ),
    },
  ];

  const noTerminalView = (
    <div style={centerShellStyle}>
      <Card
        bordered={false}
        style={{ ...cardStyle, width: "100%", maxWidth: 560 }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Text strong>No POS terminal found for this branch.</Text>
              <Text type="secondary">
                {can("pos.terminal.create")
                  ? "Create a terminal first to start selling."
                  : "Contact administrator to create a POS terminal for your branch."}
              </Text>
            </Space>
          }
        />

        {can("pos.terminal.create") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={() => setAddTerminalOpen(true)}
          >
            Create Terminal
          </Button>
        )}
      </Card>
    </div>
  );

  return (
    <PosLayout>
      <Head title="POS" />

      <div style={pageStyle}>
        {loading || shiftLoading || terminalLoading ? (
          <div
            style={{
              minHeight: 420,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Spin />
          </div>
        ) : terminals.length < 1 ? (
          noTerminalView
        ) : !currentShift ? (
          <div style={centerShellStyle}>
            <Space
              direction="vertical"
              size={12}
              style={{ width: "100%", maxWidth: 620 }}
            >
              {terminalWarnings.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="Terminal setup needs attention"
                  description={terminalWarnings.join(" ")}
                />
              )}

              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Open a POS shift to start selling."
              />
            </Space>
          </div>
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <PosTopBar
              terminal={selectedTerminal}
              shift={currentShift}
              canCloseShift={can("pos.shift.close")}
              onCloseShift={closeShift}
              extraActions={
                <>
                  {currentShift && can("pos.cash_movement.create") && (
                    <>
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        onClick={() => openCashMovement("cash_in")}
                      >
                        Cash In
                      </Button>
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        onClick={() => openCashMovement("cash_out")}
                      >
                        Cash Out
                      </Button>
                    </>
                  )}
                  {currentShift && can("pos.sale.update") && (
                    <Button
                      size="small"
                      icon={<PauseCircleOutlined />}
                      onClick={() => setHeldOpen(true)}
                    >
                      Held
                    </Button>
                  )}
                </>
              }
            />

            {(terminalWarnings.length > 0 || checkoutError) && (
              <Alert
                type={checkoutError ? "warning" : "info"}
                showIcon
                message={checkoutError || "Terminal setup warning"}
                description={terminalWarnings.join(" ")}
              />
            )}

            <Row gutter={12} align="stretch">
              <Col xs={24} xl={15}>
                <Card
                  bordered={false}
                  style={cardStyle}
                  bodyStyle={{ padding: 14 }}
                >
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: "100%" }}
                  >
                    <div style={panelHeaderStyle}>
                      <Space direction="vertical" size={0}>
                        <Text strong>Product Counter</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Scan, search, and add items fast.
                        </Text>
                      </Space>
                      <Tag color="blue" style={{ margin: 0 }}>
                        Live POS
                      </Tag>
                    </div>

                    <div style={scannerShellStyle}>
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Space.Compact style={{ width: "100%" }}>
                          <Input
                            ref={barcodeRef}
                            prefix={<SearchOutlined />}
                            placeholder="Search or scan barcode"
                            value={searchText}
                            onChange={(event) =>
                              setSearchText(event.target.value)
                            }
                            onPressEnter={() => {
                              const value = searchText.trim();
                              if (value)
                                void scanBarcode(value, { manual: true });
                            }}
                          />

                          <Button onClick={() => loadProducts(searchText)}>
                            Search
                          </Button>
                        </Space.Compact>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Tag
                            color={
                              scannerState.status === "success"
                                ? "green"
                                : scannerState.status === "error"
                                  ? "red"
                                  : scannerState.status === "scanning"
                                    ? "blue"
                                    : "default"
                            }
                            style={{ margin: 0 }}
                          >
                            {scannerState.message}
                          </Tag>
                          {scannerState.code ? (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Last scan: {scannerState.code}
                            </Text>
                          ) : null}
                        </div>
                      </Space>
                    </div>

                    {products.length < 1 ? (
                      <Empty description="No saleable products found" />
                    ) : (
                      <Row gutter={[10, 10]}>
                        {products.map((product) => (
                          <Col xs={24} sm={12} lg={8} xxl={6} key={product.id}>
                            <Card
                              hoverable
                              size="small"
                              onClick={() => addProduct(product)}
                              className="pos-product-card"
                              style={productCardStyle(product)}
                              bodyStyle={{ padding: 12, height: "100%" }}
                            >
                              <Space
                                direction="vertical"
                                size={4}
                                style={{ width: "100%" }}
                              >
                                <Text strong>{product.name}</Text>

                                <Text type="secondary">
                                  {product.code ||
                                    product.barcode ||
                                    product.sku}
                                </Text>

                                <Space
                                  style={{
                                    justifyContent: "space-between",
                                    width: "100%",
                                  }}
                                >
                                  <Text strong>
                                    Rs. {money(product.selling_price)}
                                  </Text>

                                  <Badge
                                    count={
                                      product.track_inventory
                                        ? `Stock ${product.available_stock ?? 0}`
                                        : "Non-stock"
                                    }
                                    style={{
                                      backgroundColor: token.colorPrimary,
                                    }}
                                  />
                                </Space>
                              </Space>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} xl={9}>
                <Card
                  bordered={false}
                  style={cardStyle}
                  bodyStyle={{ padding: 14 }}
                >
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: "100%" }}
                  >
                    <div style={panelHeaderStyle}>
                      <Space direction="vertical" size={0}>
                        <Text strong>Current Cart</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {cart.length} item{cart.length === 1 ? "" : "s"} added
                        </Text>
                      </Space>
                      <Text strong style={{ color: token.colorPrimary }}>
                        Rs. {money(summary.grand_total)}
                      </Text>
                    </div>

                    <Select
                      showSearch
                      placeholder="Select customer"
                      value={effectiveCustomerId}
                      options={customerOptions}
                      onChange={(value) =>
                        setCustomerId(value || defaultCustomerId || null)
                      }
                      style={{ width: "100%" }}
                      optionFilterProp="label"
                    />

                    <Table
                      className="pos-cart-table"
                      size="small"
                      rowKey={(record, index) =>
                        `${record.product_id}-${index}`
                      }
                      columns={cartColumns}
                      dataSource={cart}
                      pagination={false}
                      locale={{ emptyText: "No items in cart" }}
                      scroll={{ x: 540, y: 320 }}
                    />

                    <div style={totalStripStyle}>
                      <Descriptions
                        size="small"
                        column={1}
                        labelStyle={{
                          color: token.colorTextSecondary,
                          fontSize: 12,
                        }}
                        contentStyle={{
                          justifyContent: "flex-end",
                          fontSize: 12,
                        }}
                        items={[
                          {
                            key: "subtotal",
                            label: "Subtotal",
                            children: `Rs. ${money(summary.subtotal)}`,
                          },
                          {
                            key: "discount",
                            label: "Discount",
                            children: `Rs. ${money(summary.discount_total)}`,
                          },
                          {
                            key: "tax",
                            label: "Tax",
                            children: `Rs. ${money(summary.tax_total)}`,
                          },
                          {
                            key: "total",
                            label: "Grand Total",
                            children: (
                              <Text
                                strong
                                style={{
                                  fontSize: 18,
                                  color: token.colorPrimary,
                                }}
                              >
                                Rs. {money(summary.grand_total)}
                              </Text>
                            ),
                          },
                          {
                            key: "paid",
                            label: "Paid",
                            children: `Rs. ${money(summary.paid_total)}`,
                          },
                          {
                            key: "change",
                            label: "Change",
                            children: `Rs. ${money(summary.change_amount)}`,
                          },
                        ]}
                      />
                    </div>

                    <Space
                      className="pos-cart-actions"
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => clearSale()}
                      >
                        Clear
                      </Button>

                      <Button
                        icon={<PauseCircleOutlined />}
                        onClick={holdSale}
                        loading={processing}
                      >
                        Hold
                      </Button>

                      <Button
                        type="primary"
                        icon={<CreditCardOutlined />}
                        onClick={() => {
                          playPosBeep("checkout");
                          setCheckoutOpen(true);
                        }}
                        disabled={!!checkoutError}
                      >
                        Checkout
                      </Button>
                    </Space>
                  </Space>
                </Card>

                {dashboard && (
                  <Card
                    bordered={false}
                    style={{
                      ...cardStyle,
                      marginTop: 12,
                    }}
                  >
                    <Row gutter={10}>
                      <Col span={12}>
                        <div style={metricCardStyle}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Today Sales
                          </Text>
                          <div>
                            <Text strong>
                              Rs. {money(dashboard.today_sales)}
                            </Text>
                          </div>
                        </div>
                      </Col>

                      <Col span={12}>
                        <div style={metricCardStyle}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Open Shifts
                          </Text>
                          <div>
                            <Text strong>{dashboard.open_shift_count}</Text>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                )}
              </Col>
            </Row>
          </Space>
        )}
      </div>

      <Modal
        title="Open POS Shift"
        open={false}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        destroyOnClose={false}
        width={560}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Text type="secondary">
            Select the terminal and count the opening cash before using POS.
          </Text>

          <div style={mutedBoxStyle}>
            <Descriptions
              size="small"
              column={1}
              items={[
                {
                  key: "branch",
                  label: "Branch",
                  children:
                    selectedTerminal?.branch?.name ||
                    selectedTerminal?.branch_name ||
                    selectedBranch?.name ||
                    "-",
                },
                {
                  key: "terminal",
                  label: "Terminal",
                  children: selectedTerminal
                    ? `${selectedTerminal.name} (${selectedTerminal.code})`
                    : "-",
                },
                {
                  key: "warehouse",
                  label: "Warehouse",
                  children:
                    selectedTerminal?.warehouse?.name ||
                    selectedTerminal?.warehouse_name ||
                    "-",
                },
              ]}
            />
          </div>

          <Form
            form={shiftForm}
            layout="vertical"
            onFinish={submitOpenShift}
            initialValues={{ opening_cash: 0 }}
          >
            {canViewAllBranches && (
              <Form.Item label="Branch">
                <Select
                  value={activeBranchId}
                  options={branchOptions}
                  onChange={handleBranchChange}
                  placeholder="Select branch"
                />
              </Form.Item>
            )}

            <Form.Item label="Terminal" required>
              <Space.Compact style={{ width: "100%" }}>
                <Select
                  style={{ flex: 1 }}
                  value={terminalId}
                  options={terminalOptions}
                  loading={terminalLoading}
                  onChange={(value) => {
                    setTerminalId(value);
                    setCurrentShift(null);
                    setProducts([]);
                    clearSale({ silentSound: true });
                  }}
                  placeholder="Select terminal"
                />

                {can("pos.terminal.create") && (
                  <Button
                    icon={<PlusOutlined />}
                    title="Create new terminal"
                    onClick={() => setAddTerminalOpen(true)}
                  />
                )}
              </Space.Compact>
            </Form.Item>

            <Form.Item
              name="opening_cash"
              label="Opening Cash"
              rules={[
                {
                  required: true,
                  message: "Opening cash is required.",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                prefix="Rs."
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Optional shift note" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={processing}
              disabled={!terminalId || !can("pos.shift.open")}
              block
            >
              Open Shift
            </Button>
          </Form>
        </Space>
      </Modal>

      <Modal
        title="Checkout"
        open={checkoutOpen}
        onCancel={() => setCheckoutOpen(false)}
        width={820}
        destroyOnClose
        footer={null}
        styles={{
          body: {
            padding: "16px 20px",
            background: token.colorBgContainer,
          },
        }}
      >
        <Row gutter={20}>
          <Col xs={24} sm={10}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  display: "block",
                }}
              >
                Payment Method
              </Text>

              <Row gutter={[8, 8]}>
                {paymentMethodBoxes.map(({ value, label, icon }) => {
                  const isSelected = payments[0]?.payment_method === value;
                  return (
                    <Col span={12} key={value}>
                      <div
                        className="pos-payment-method-box"
                        onClick={() => selectPaymentMethod(value)}
                        style={{
                          border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                          borderRadius: token.borderRadiusLG + 2,
                          background: isSelected
                            ? token.colorPrimaryBg
                            : token.colorFillQuaternary,
                          boxShadow: isSelected
                            ? token.boxShadowTertiary
                            : "none",
                          padding: "14px 8px",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            color: isSelected
                              ? token.colorPrimary
                              : token.colorTextSecondary,
                            marginBottom: 6,
                            lineHeight: 1,
                          }}
                        >
                          {icon}
                        </div>
                        <Text
                          strong={isSelected}
                          style={{
                            fontSize: 12,
                            color: isSelected
                              ? token.colorPrimary
                              : token.colorText,
                          }}
                        >
                          {label}
                        </Text>
                      </div>
                    </Col>
                  );
                })}
              </Row>

              {payments.length > 1 && (
                <Space
                  direction="vertical"
                  size={6}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Additional Payments
                  </Text>
                  {payments.slice(1).map((payment, idx) => (
                    <Space.Compact key={idx + 1} style={{ width: "100%" }}>
                      <Select
                        size="small"
                        style={{ flex: 1 }}
                        value={payment.payment_method}
                        options={paymentOptions}
                        onChange={(value) =>
                          setPayments((prev) =>
                            prev.map((p, i) =>
                              i === idx + 1
                                ? { ...p, payment_method: value }
                                : p,
                            ),
                          )
                        }
                      />
                      <InputNumber
                        size="small"
                        style={{ width: 110 }}
                        min={0}
                        value={payment.amount}
                        prefix="Rs."
                        onChange={(value) =>
                          setPayments((prev) =>
                            prev.map((p, i) =>
                              i === idx + 1 ? { ...p, amount: value || 0 } : p,
                            ),
                          )
                        }
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removePaymentRow(idx + 1)}
                      />
                    </Space.Compact>
                  ))}
                </Space>
              )}

              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  playPosBeep("tap");
                  setPayments((prev) => [...prev, { ...emptyPayment }]);
                }}
                style={{ width: "100%", marginTop: 4 }}
              >
                Split Payment
              </Button>
            </Space>
          </Col>

          <Col xs={24} sm={14}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {checkoutError && (
                <Alert type="warning" showIcon message={checkoutError} />
              )}

              <div
                style={{
                  padding: 14,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgLayout,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 8 }}
                >
                  Payment Amount
                </Text>
                <InputNumber
                  style={{ width: "100%", fontSize: 16 }}
                  size="large"
                  min={0}
                  value={payments[0]?.amount}
                  disabled={payments[0]?.payment_method === "credit"}
                  prefix="Rs."
                  onChange={(value) =>
                    setPayments((prev) =>
                      prev.map((p, i) =>
                        i === 0 ? { ...p, amount: value || 0 } : p,
                      ),
                    )
                  }
                />

                <Row gutter={8} style={{ marginTop: 10 }}>
                  <Col span={12}>
                    <Input
                      size="small"
                      placeholder="Reference"
                      value={payments[0]?.reference}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((p, i) =>
                            i === 0 ? { ...p, reference: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      size="small"
                      placeholder="Transaction No."
                      value={payments[0]?.transaction_no}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((p, i) =>
                            i === 0
                              ? { ...p, transaction_no: e.target.value }
                              : p,
                          ),
                        )
                      }
                    />
                  </Col>
                </Row>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorFillAlter,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text type="secondary">Grand Total</Text>
                  <Text strong>Rs. {money(summary.grand_total)}</Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text type="secondary">Amount Received</Text>
                  <Text>Rs. {money(summary.paid_total)}</Text>
                </div>
                <Divider style={{ margin: "8px 0" }} />
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text strong style={{ fontSize: 15 }}>
                    {summary.change_amount > 0.009
                      ? "Change Due"
                      : "Balance Due"}
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: 15,
                      color:
                        summary.change_amount > 0.009
                          ? token.colorSuccess
                          : summary.balance_due > 0.009
                            ? token.colorError
                            : token.colorSuccess,
                    }}
                  >
                    Rs.{" "}
                    {money(
                      summary.change_amount > 0.009
                        ? summary.change_amount
                        : summary.balance_due,
                    )}
                  </Text>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<DollarOutlined />}
                onClick={completeSale}
                loading={processing}
                disabled={!!checkoutError}
                block
                style={{
                  height: 52,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                Complete Sale
              </Button>
            </Space>
          </Col>
        </Row>
      </Modal>

      <Modal
        title="Held Sales"
        open={heldOpen}
        onCancel={() => setHeldOpen(false)}
        footer={null}
        width={520}
      >
        <List
          dataSource={heldSales}
          renderItem={(sale) => (
            <List.Item
              actions={[
                <Button
                  key="resume"
                  type="link"
                  onClick={() => resumeHeldSale(sale)}
                >
                  Resume
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{sale.sale_no}</Text>
                    <Tag color={saleStatusColor(sale.status)}>
                      {sale.status}
                    </Tag>
                  </Space>
                }
                description={`${sale.customer_name || sale.contact?.name || "Walk-in"} • Rs. ${money(
                  sale.grand_total,
                )}`}
              />
            </List.Item>
          )}
          locale={{
            emptyText: "No held carts",
          }}
        />
      </Modal>

      <Modal
        title="Receipt Preview"
        open={receiptOpen}
        onCancel={() => setReceiptOpen(false)}
        width={620}
        footer={null}
      >
        {saleReceipt ? (
          <Spin spinning={receiptTemplateLoading}>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {receiptTemplateError && (
                <Alert type="warning" showIcon message={receiptTemplateError} />
              )}

              <div className="pos-receipt-print-area">
                <style>{`@page { size: ${resolvedPaperSize}; margin: 0; }`}</style>
                <PrintablePdfEmailWrapper
                  title="POS Sales Receipt"
                  subTitle={saleReceipt.sale_no}
                  fileName={`pos-receipt-${saleReceipt.sale_no || saleReceipt.id || "receipt"}.pdf`}
                  pageSize="80mm"
                  pageOrientation="portrait"
                  allowDownload={false}
                  allowEmail={false}
                  printButtonText="Print Receipt"
                  previewBackground={token.colorFillAlter}
                  printStyles={renderedReceipt.css}
                  contentClassName="pos-receipt-print-document"
                  contentStyle={{
                    width: "80mm",
                    maxWidth: "80mm",
                    padding: "3mm",
                  }}
                >
                  <style>{renderedReceipt.css}</style>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderedReceipt.html }}
                  />
                </PrintablePdfEmailWrapper>
              </div>
            </Space>
          </Spin>
        ) : (
          <Empty description="No receipt loaded" />
        )}
      </Modal>

      <Modal
        title="Create POS Terminal"
        open={addTerminalOpen}
        onCancel={() => {
          setAddTerminalOpen(false);
          addTerminalForm.resetFields();
        }}
        onOk={() => addTerminalForm.submit()}
        confirmLoading={addTerminalLoading}
        destroyOnClose
      >
        <Form
          form={addTerminalForm}
          layout="vertical"
          onFinish={submitAddTerminal}
          initialValues={{
            branch_id: activeBranchId,
          }}
        >
          <Form.Item
            name="name"
            label="Terminal Name"
            rules={[
              {
                required: true,
                message: "Terminal name is required.",
              },
            ]}
          >
            <Input placeholder="e.g. Counter 1" />
          </Form.Item>

          {canViewAllBranches ? (
            <Form.Item name="branch_id" label="Branch">
              <Select
                allowClear
                placeholder="Select branch"
                options={branchOptions}
              />
            </Form.Item>
          ) : (
            <Form.Item label="Branch">
              <Input readOnly value={selectedBranch?.name || "-"} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={cashMovementType === "cash_in" ? "Cash In" : "Cash Out"}
        open={cashMovementOpen}
        onCancel={() => {
          setCashMovementOpen(false);
          cashMovementForm.resetFields();
        }}
        onOk={() => cashMovementForm.submit()}
        confirmLoading={cashMovementLoading}
        destroyOnClose
      >
        <Form
          form={cashMovementForm}
          layout="vertical"
          onFinish={submitCashMovement}
          initialValues={{
            type: cashMovementType,
            amount: 0,
          }}
        >
          <Form.Item
            name="type"
            label="Movement Type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "cash_in", label: "Cash In" },
                { value: "cash_out", label: "Cash Out" },
                { value: "expense", label: "Expense" },
                { value: "drop", label: "Cash Drop" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              {
                required: true,
                message: "Amount is required.",
              },
              {
                type: "number",
                min: 0.01,
                message: "Amount must be greater than 0.",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              prefix="Rs."
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="reason" label="Reason / Category">
            <Input placeholder="e.g. Opening float, Petty cash expense" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>

          {currentShift && (
            <div
              style={{
                padding: 10,
                background: token.colorFillAlter,
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                fontSize: 12,
              }}
            >
              <Space>
                <ClockCircleOutlined />
                <span>
                  Shift: <strong>{currentShift.shift_no}</strong>
                  {" · "}Terminal:{" "}
                  <strong>{selectedTerminal?.name || "-"}</strong>
                  {" · "}Branch:{" "}
                  <strong>
                    {selectedTerminal?.branch?.name ||
                      selectedTerminal?.branch_name ||
                      selectedBranch?.name ||
                      "-"}
                  </strong>
                </span>
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="Close POS Shift"
        open={closeShiftOpen}
        onCancel={() => {
          setCloseShiftOpen(false);
          closeShiftForm.resetFields();
        }}
        onOk={() => closeShiftForm.submit()}
        confirmLoading={closeShiftLoading}
        okText="Close Shift"
        destroyOnClose
      >
        <Form
          form={closeShiftForm}
          layout="vertical"
          onFinish={submitCloseShift}
        >
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                key: "opening",
                label: "Opening Cash",
                children: `Rs. ${money(currentShift?.opening_cash)}`,
              },
              {
                key: "cashSales",
                label: "Cash Sales",
                children: `Rs. ${money(currentShift?.total_cash_sales)}`,
              },
              {
                key: "cardSales",
                label: "Card Sales",
                children: `Rs. ${money(currentShift?.total_card_sales)}`,
              },
              {
                key: "onlineSales",
                label: "Online Sales",
                children: `Rs. ${money(currentShift?.total_online_sales)}`,
              },
              {
                key: "refunds",
                label: "Refunds",
                children: `Rs. ${money(currentShift?.total_refunds)}`,
              },
              {
                key: "expenses",
                label: "Cash Out / Expenses / Drop",
                children: `Rs. ${money(currentShift?.total_expenses)}`,
              },
              {
                key: "totalSales",
                label: "Total Sales",
                children: `Rs. ${money(currentShift?.total_sales)}`,
              },
              {
                key: "expected",
                label: "Expected Cash",
                children: (
                  <Text strong>Rs. {money(currentShift?.expected_cash)}</Text>
                ),
              },
            ]}
          />

          <Form.Item
            name="counted_cash"
            label="Counted Cash"
            rules={[
              { required: true, message: "Counted cash is required." },
              {
                type: "number",
                min: 0,
                message: "Counted cash cannot be negative.",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              prefix="Rs."
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const difference = Number(
                Number(getFieldValue("counted_cash") || 0) -
                  Number(currentShift?.expected_cash || 0),
              );

              return (
                <Alert
                  type={Math.abs(difference) < 0.01 ? "success" : "warning"}
                  showIcon
                  message={`Difference: Rs. ${money(difference)}`}
                  style={{ marginBottom: 12 }}
                />
              );
            }}
          </Form.Item>

          <Form.Item name="closing_notes" label="Closing Note">
            <Input.TextArea
              rows={3}
              placeholder="Required if cash difference is not zero"
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>
        {`
                    .pos-product-card:hover {
                        transform: translateY(-1px);
                        box-shadow: ${token.boxShadowTertiary};
                        border-color: ${token.colorPrimaryBorder};
                    }

                    .pos-cart-table .ant-table {
                        border-radius: ${token.borderRadiusLG}px;
                        overflow: hidden;
                    }

                    .pos-cart-table .ant-table-thead > tr > th {
                        background: ${token.colorFillAlter};
                        color: ${token.colorTextSecondary};
                        font-size: 11px;
                        font-weight: 700;
                        padding: 6px 4px;
                        white-space: nowrap;
                    }

                    .pos-cart-table .ant-table-tbody > tr > td {
                        padding: 5px 4px;
                        vertical-align: middle;
                        border-bottom-color: ${token.colorBorderSecondary};
                    }

                    .pos-cart-table .ant-input-number-input {
                        padding-inline: 5px;
                        text-align: center;
                    }

                    .pos-cart-table .ant-btn-sm {
                        width: 24px;
                        padding-inline: 0;
                    }

                    .pos-cart-actions .ant-btn {
                        flex: 1;
                    }

                    @media (max-width: 767px) {
                        .pos-cart-actions {
                            display: grid !important;
                            grid-template-columns: repeat(3, minmax(0, 1fr));
                            gap: 8px;
                        }

                        .pos-cart-actions .ant-space-item {
                            min-width: 0;
                        }

                        .pos-cart-actions .ant-btn {
                            width: 100%;
                            padding-inline: 8px;
                        }
                    }

                    @media print {
                        body * {
                            visibility: hidden !important;
                        }

                        .pos-receipt-print-area,
                        .pos-receipt-print-area * {
                            visibility: visible !important;
                        }

                        .pos-receipt-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: var(--pos-receipt-width, 80mm) !important;
                        }
                    }
                `}
      </style>
    </PosLayout>
  );
}
