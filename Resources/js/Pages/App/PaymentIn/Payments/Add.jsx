import { useEffect, useMemo, useState } from 'react';
import { Col, Row, Space, Switch, Typography } from 'antd';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const money = (value) =>
  toNumber(value).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const currencySymbolFromCode = {
  NPR: 'रू',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
};

const normalizeCurrencyResponse = (payload) => {
  if (!payload) return null;

  if (Array.isArray(payload)) return payload[0] || null;

  if (Array.isArray(payload.results)) return payload.results[0] || null;

  if (typeof payload === 'object') {
    const values = Object.values(payload);
    return values.find((item) => item && typeof item === 'object') || null;
  }

  return null;
};

const getCurrencySymbol = (values = {}) => {
  const currency =
    values?.currency_id ??
    values?.currency ??
    values?.currency_id_detail ??
    values?.currency_detail;

  if (currency && typeof currency === 'object') {
    return (
      currency.symbol ||
      currency.currency_symbol ||
      currencySymbolFromCode[currency.code] ||
      currency.code ||
      'रू'
    );
  }

  return 'रू';
};

const moneyWithSymbol = (value, symbol = 'रू') =>
  `${symbol ? `${symbol} ` : ''}${money(value)}`;

const { Text } = Typography;

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'object') {
    return value.id ?? value.value ?? null;
  }

  return value;
};

const cleanText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const nullIfEmpty = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const formatDate = (value) => {
  if (!value) return null;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : null;
  }

  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);

  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }

  const fallback = dayjs(value);

  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
};

const emptyAllocation = {
  id: undefined,
  invoice_id: null,
  invoice_no: '',
  invoice_total: 0,
  outstanding_amount: 0,
  allocated_amount: 0,
};

const getInvoiceNo = (invoice = {}) =>
  invoice.invoice_no ||
  invoice.number ||
  invoice.code ||
  invoice.reference ||
  invoice.label ||
  '';

const getInvoiceTotal = (invoice = {}) =>
  toNumber(
    invoice.total ??
      invoice.grand_total ??
      invoice.amount ??
      invoice.invoice_total ??
      invoice.net_total
  );

const getInvoiceOutstanding = (invoice = {}) =>
  toNumber(
    invoice.outstanding_amount ??
      invoice.balance_due ??
      invoice.due_amount ??
      invoice.remaining_amount ??
      invoice.unpaid_amount ??
      invoice.balance ??
      invoice.total ??
      invoice.grand_total
  );

const normalizeAllocation = (line = {}) => {
  const invoiceObject =
    typeof line.invoice_id === 'object'
      ? line.invoice_id
      : line.invoice || line.invoice_id_detail || null;

  return {
    ...(line.id ? { id: line.id } : {}),

    invoice_id: asId(line.invoice_id ?? line.invoice),
    allocated_amount: roundMoney(line.allocated_amount),

    invoice_no:
      cleanText(line.invoice_no).trim() ||
      cleanText(getInvoiceNo(invoiceObject)).trim() ||
      null,
  };
};

const calculatePaymentSummary = (values = {}) => {
  const paymentAmount = roundMoney(values.amount);
  const bankCharges = values._bank_charges_applicable ? roundMoney(values.bank_charges) : 0;
  const tdsCharges = values._tds_applicable ? roundMoney(values.tds_charges) : 0;

  const settlementTotal = roundMoney(paymentAmount + bankCharges + tdsCharges);

  const allocatedTotal = roundMoney(
    (Array.isArray(values.items) ? values.items : []).reduce(
      (sum, item) => sum + toNumber(item?.allocated_amount),
      0
    )
  );

  const difference = roundMoney(settlementTotal - allocatedTotal);

  return {
    paymentAmount,
    bankCharges,
    tdsCharges,
    settlementTotal,
    allocatedTotal,
    difference,
  };
};

const PaymentTotals = ({ values = {} }) => {
  const summary = calculatePaymentSummary(values);
  const symbol = getCurrencySymbol(values);

  return (
    <Row style={{ marginTop: 0 }}>
      <Col xs={24}>
        <div className="payment-total-card">
          <div className="payment-total-row">
            <span>Payment Amount</span>
            <strong>{moneyWithSymbol(summary.paymentAmount, symbol)}</strong>
          </div>

          <div className="payment-total-row">
            <span>Bank Charges</span>
            <strong>
              {summary.bankCharges > 0
                ? moneyWithSymbol(summary.bankCharges, symbol)
                : '-'}
            </strong>
          </div>

          <div className="payment-total-row">
            <span>TDS Amount</span>
            <strong>
              {summary.tdsCharges > 0
                ? moneyWithSymbol(summary.tdsCharges, symbol)
                : '-'}
            </strong>
          </div>

          <div className="payment-total-row">
            <span>Settlement Total</span>
            <strong>{moneyWithSymbol(summary.settlementTotal, symbol)}</strong>
          </div>

          <div className="payment-total-row">
            <span>Allocated To Invoices</span>
            <strong>{moneyWithSymbol(summary.allocatedTotal, symbol)}</strong>
          </div>

          <div className="payment-total-row payment-total-grand">
            <span>
              {summary.difference < 0 ? 'Over Allocated' : 'Unallocated'}
            </span>
            <strong>{moneyWithSymbol(Math.abs(summary.difference), symbol)}</strong>
          </div>
        </div>
      </Col>
    </Row>
  );
};

const visitPaymentShow = (id) => {
  if (!id) return;

  if (typeof route === 'function') {
    router.visit(route('payment-in.payments.show', id));
    return;
  }

  router.visit(`/payment-in/payments/${id}`);
};

export default function PaymentAdd(props) {
  const [baseCurrency, setBaseCurrency] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('kiteledger_payment_prefill');
      if (stored) {
        sessionStorage.removeItem('kiteledger_payment_prefill');
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setPrefillData(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    fetch(api('/api/currencies/?is_base=true&active=true&page_size=1'), {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const currency = normalizeCurrencyResponse(payload);

        if (currency?.id) {
          setBaseCurrency(currency);
        }
      })
      .catch(() => {});
  }, []);

  const fields = useMemo(
    () => [
      {
        name: 'contact_id',
        label: 'Customer Name',
        type: 'fkSelect',
        required: true,
        col: 16,
        placeholder: 'Select Customer',
        fkUrl: api('/api/contacts/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',

        quickAdd: {
          title: 'Customer',
          buttonLabel: 'Add New Customer',
          apiUrl: api('/api/contacts/'),
          initialValues: {
            contact_type: 'customer',
            type: 'customer',
            name: '',
            phone: '',
            email: '',
            address: '',
            active: true,
          },
          validationSchema: Yup.object({
            name: Yup.string().required('Customer name is required'),
          }),
          fields: [
            {
              name: 'name',
              label: 'Customer Name',
              type: 'text',
              col: 24,
              required: true,
            },
            {
              name: 'phone',
              label: 'Phone',
              type: 'phone',
              col: 12,
              defaultCountryCode: '+977',
            },
            {
              name: 'email',
              label: 'Email',
              type: 'text',
              col: 12,
            },
            {
              name: 'address',
              label: 'Address',
              type: 'textarea',
              col: 24,
              rows: 2,
            },
          ],
          transformPayload: (values) => ({
            ...values,
            contact_type: values.contact_type || 'customer',
            type: values.type || 'customer',
            active: true,
          }),
        },
      },
      {
        name: 'payment_no',
        label: 'Payment No',
        type: 'text',
        col: 8,
        readOnly: true,
        placeholder: 'Auto-generated',
        disabled: true,
      },
      {
        name: 'payment_date',
        label: 'Payment Date',
        type: 'datePicker',
        required: true,
        col: 8,
        format: 'DD-MM-YYYY',
      },
      {
        name: 'account_id',
        label: 'Payment Account',
        type: 'fkSelect',
        required: true,
        col: 8,
        placeholder: 'Select Account',
        fkUrl: api('/api/accounts/?nature=bank&active=true'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
      },
      {
        name: 'payment_method',
        label: 'Payment Method',
        type: 'select',
        required: true,
        col: 8,
        placeholder: 'Payment Method',
        options: [
          { value: 'cash', label: 'Cash' },
          { value: 'cheque', label: 'Cheque' },
          { value: 'bank_transfer', label: 'Bank Transfer' },
          { value: 'online', label: 'Online' },
        ],
      },
      {
        name: 'currency_id',
        label: 'Currency',
        type: 'fkSelect',
        col: 8,
        placeholder: 'Currency',
        fkUrl: api('/api/currencies/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        storeFullObject: true,
        fkLabel: (record) =>
          [record?.code, record?.symbol, record?.name].filter(Boolean).join(' - '),
      },
      {
        name: 'amount',
        label: 'Payment Amount',
        type: 'number',
        required: true,
        col: 8,
        min: 0,
        addonBefore: ({ values }) => getCurrencySymbol(values),
        prefix: ({ values }) => getCurrencySymbol(values),
      },
      {
        name: '_bank_charges_applicable',
        label: 'Bank Charges',
        type: 'custom',
        col: 8,
        render: ({ values, setFieldValue }) => (
          <Space align="center">
            <Switch
              checked={!!values._bank_charges_applicable}
              onChange={(checked) => {
                setFieldValue('_bank_charges_applicable', checked);
                if (!checked) {
                  setFieldValue('bank_charges_account_id', null);
                  setFieldValue('bank_charges_account_id_detail', null, false);
                  setFieldValue('bank_charges', 0);
                }
              }}
            />
            <Text>Bank Charges Applicable</Text>
          </Space>
        ),
      },
      {
        name: '_tds_applicable',
        label: 'TDS',
        type: 'custom',
        col: 8,
        render: ({ values, setFieldValue }) => (
          <Space align="center">
            <Switch
              checked={!!values._tds_applicable}
              onChange={(checked) => {
                setFieldValue('_tds_applicable', checked);
                if (!checked) {
                  setFieldValue('tds_charges_account_id', null);
                  setFieldValue('tds_charges_account_id_detail', null, false);
                  setFieldValue('tds_charges', 0);
                }
              }}
            />
            <Text>TDS Applicable</Text>
          </Space>
        ),
      },
      {
        name: 'bank_charges_account_id',
        label: 'Bank Charges Account',
        type: 'fkSelect',
        col: 8,
        condition: (values) => !!values._bank_charges_applicable,
        placeholder: 'Select Account',
        fkUrl: api('/api/accounts/?active=true'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        allowClear: true,
      },
      {
        name: 'bank_charges',
        label: 'Bank Charges',
        type: 'number',
        col: 8,
        min: 0,
        condition: (values) => !!values._bank_charges_applicable,
        addonBefore: ({ values }) => getCurrencySymbol(values),
        prefix: ({ values }) => getCurrencySymbol(values),
      },
      {
        name: 'tds_charges_account_id',
        label: 'TDS Account',
        type: 'fkSelect',
        col: 8,
        condition: (values) => !!values._tds_applicable,
        placeholder: 'Select Account',
        fkUrl: api('/api/accounts/?active=true'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        allowClear: true,
      },
      {
        name: 'tds_charges',
        label: 'TDS Amount',
        type: 'number',
        col: 8,
        min: 0,
        condition: (values) => !!values._tds_applicable,
        addonBefore: ({ values }) => getCurrencySymbol(values),
        prefix: ({ values }) => getCurrencySymbol(values),
      },
      {
        name: 'reference',
        label: 'Reference',
        type: 'text',
        col: 8,
        placeholder: 'Reference / Cheque / Transaction ID',
      },
      {
        name: 'items',
        label: 'Invoice Allocations',
        type: 'objectArray',
        col: 24,
        addButtonLabel: 'Add Invoice',
        defaultItem: { ...emptyAllocation },
        headerBg: '#4b5563',
        headerColor: '#ffffff',
        rowStartExpanded: false,

        columns: [
          {
            key: 'invoice_id',
            name: 'invoice_id',
            label: 'Invoice',
            type: 'fkSelect',
            width: '45%',
            placeholder: 'Select Invoice',
            fkUrl: api('/api/invoices/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'invoice_no',
            storeFullObject: true,
            labelField: 'invoice_no',

            fkLabel: (record) => {
              const invoiceNo = getInvoiceNo(record);
              const customer =
                record?.contact?.name ||
                record?.contact_name ||
                record?.contact_id_detail?.label ||
                '';

              return [invoiceNo, customer].filter(Boolean).join(' - ');
            },

            fkOptionRender: (record) => {
              const invoiceNo = getInvoiceNo(record);
              const customer =
                record?.contact?.name ||
                record?.contact_name ||
                record?.contact_id_detail?.label ||
                '';

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    width: '100%',
                  }}
                >
                  <span>
                    {[invoiceNo, customer].filter(Boolean).join(' - ')}
                  </span>
                  <span style={{ opacity: 0.75 }}>
                    {money(getInvoiceOutstanding(record))}
                  </span>
                </div>
              );
            },

            onSelectRecord: (record, row) => {
              const outstanding = getInvoiceOutstanding(record);

              return {
                ...row,
                invoice_id: record,
                invoice_no: getInvoiceNo(record),
                invoice_total: getInvoiceTotal(record),
                outstanding_amount: outstanding,
                allocated_amount:
                  toNumber(row?.allocated_amount) > 0
                    ? toNumber(row.allocated_amount)
                    : outstanding,
              };
            },
          },
          {
            key: 'outstanding_amount',
            name: 'outstanding_amount',
            label: 'Outstanding',
            type: 'number',
            width: '20%',
            min: 0,
            disabled: true,
            addonBefore: ({ values }) => getCurrencySymbol(values),
            prefix: ({ values }) => getCurrencySymbol(values),
          },
          {
            key: 'allocated_amount',
            name: 'allocated_amount',
            label: 'Allocated Amount',
            type: 'number',
            width: '25%',
            min: 0,
            addonBefore: ({ values }) => getCurrencySymbol(values),
            prefix: ({ values }) => getCurrencySymbol(values),
          },
        ],
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        col: 12,
        rows: 5,
        placeholder: 'Notes',
      },
      {
        name: '_payment_totals',
        label: '',
        type: 'custom',
        col: 12,
        render: ({ values }) => <PaymentTotals values={values} />,
      },
    ],
    [baseCurrency]
  );

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        contact_id: Yup.mixed()
          .test('customer-required', 'Customer is required', (value) => !!asId(value))
          .required('Customer is required'),

        payment_date: Yup.mixed().required('Payment date is required'),

        account_id: Yup.mixed()
          .test('account-required', 'Payment account is required', (value) => !!asId(value))
          .required('Payment account is required'),

        payment_method: Yup.string().required('Payment method is required'),

        amount: Yup.number()
          .typeError('Payment amount is required')
          .moreThan(0, 'Payment amount must be greater than 0')
          .required('Payment amount is required'),

        bank_charges: Yup.number()
          .typeError('Bank charges must be a number')
          .min(0, 'Bank charges cannot be negative')
          .nullable(),

        tds_charges: Yup.number()
          .typeError('TDS amount must be a number')
          .min(0, 'TDS amount cannot be negative')
          .nullable(),

        items: Yup.array()
          .of(
            Yup.object().shape({
              invoice_id: Yup.mixed().nullable(),

              allocated_amount: Yup.number()
                .typeError('Allocated amount must be a number')
                .min(0, 'Allocated amount cannot be negative')
                .nullable(),
            })
          )
          .nullable(),
      }),
    []
  );

  const crudInitialValues = useMemo(() => {
    const defaults = {
      payment_no: '',
      payment_date: dayjs(),
      contact_id: null,
      account_id: null,
      currency_id: baseCurrency,
      amount: 0,
      payment_method: 'cash',
      _bank_charges_applicable: false,
      bank_charges_account_id: null,
      bank_charges: 0,
      _tds_applicable: false,
      tds_charges_account_id: null,
      tds_charges: 0,
      reference: '',
      notes: '',
      items: [],
      deleted_item_ids: [],
    };

    if (!prefillData) return defaults;

    const prefillItems = Array.isArray(prefillData.items) && prefillData.items.length
      ? prefillData.items.map((line) => ({
          ...emptyAllocation,
          invoice_id: line.invoice_id_detail ?? line.invoice_id ?? null,
          invoice_no: line.invoice_no || '',
          invoice_total: toNumber(line.invoice_total) || 0,
          outstanding_amount: toNumber(line.outstanding_amount) || 0,
          allocated_amount: toNumber(line.allocated_amount) || 0,
        }))
      : [];

    return {
      ...defaults,
      contact_id: prefillData.contact_id_detail ?? prefillData.contact_id ?? null,
      currency_id: prefillData.currency_id_detail ?? prefillData.currency_id ?? baseCurrency,
      amount: toNumber(prefillData.amount) || 0,
      reference: prefillData._source_no || prefillData.reference || '',
      items: prefillItems,
      deleted_item_ids: [],
    };
  }, [baseCurrency, prefillData]);

  const transformPayload = (values = {}) => {
    const items = (Array.isArray(values.items) ? values.items : [])
      .map(normalizeAllocation)
      .filter(
        (line) =>
          !!asId(line.invoice_id) && toNumber(line.allocated_amount) > 0
      );

    return {
      payment_no: nullIfEmpty(values.payment_no),
      payment_date: formatDate(values.payment_date),

      contact_id: asId(values.contact_id ?? values.contact),
      account_id: asId(values.account_id ?? values.account),
      currency_id: asId(values.currency_id ?? values.currency),

      amount: roundMoney(values.amount),
      payment_method: nullIfEmpty(values.payment_method),

      bank_charges_account_id: values._bank_charges_applicable
        ? asId(values.bank_charges_account_id ?? values.bankChargesAccount)
        : null,
      bank_charges: values._bank_charges_applicable && toNumber(values.bank_charges)
        ? roundMoney(values.bank_charges)
        : null,

      tds_charges_account_id: values._tds_applicable
        ? asId(values.tds_charges_account_id ?? values.tdsChargesAccount)
        : null,
      tds_charges: values._tds_applicable && toNumber(values.tds_charges)
        ? roundMoney(values.tds_charges)
        : null,

      reference: nullIfEmpty(values.reference),
      notes: nullIfEmpty(values.notes),

      items,

      deleted_item_ids: Array.isArray(values.deleted_item_ids)
        ? values.deleted_item_ids.filter(Boolean)
        : [],
    };
  };

  return (
    <AuthenticatedLayout auth={props.auth} user={props.auth?.user}>
      <Head title="New Customer Payment" />

      <style>
        {`
          .payment-form-drawer .ant-drawer-content {
            background: #ffffff;
          }

          .payment-form-drawer .ant-drawer-header {
            min-height: 38px;
            padding: 0 14px;
            border-bottom: 1px solid #d9dee7;
            background: #ffffff;
          }

          .payment-form-drawer .ant-drawer-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          }

          .payment-form-drawer .ant-drawer-body {
            padding: 12px 14px 24px;
            background: #ffffff;
          }

          .payment-form-drawer .ant-form {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          .payment-form-drawer .ant-form-item {
            margin-bottom: 12px;
          }

          .payment-form-drawer .ant-form-item-label {
            padding-bottom: 3px;
          }

          .payment-form-drawer .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }

          .payment-form-drawer .ant-input,
          .payment-form-drawer .ant-input-number,
          .payment-form-drawer .ant-picker,
          .payment-form-drawer .ant-select-selector {
            min-height: 31px;
            border-radius: 0 !important;
            border-color: #cbd5e1 !important;
            background: #ffffff;
            box-shadow: none !important;
          }

          .payment-form-drawer .ant-input-number {
            width: 100%;
          }

          .payment-form-drawer textarea.ant-input {
            min-height: 76px;
            resize: vertical;
          }

          .payment-form-drawer .ant-input[disabled],
          .payment-form-drawer .ant-input-number-disabled,
          .payment-form-drawer .ant-select-disabled .ant-select-selector {
            color: #111827;
            background: #eef2f7 !important;
          }

          .payment-form-drawer .ant-form-item-explain,
          .payment-form-drawer .ant-form-item-extra {
            font-size: 11px;
          }

          .payment-form-drawer .ant-btn-primary {
            min-width: 88px;
            height: 31px;
            border-radius: 0;
            background: #16a34a;
            border-color: #16a34a;
            font-weight: 700;
          }

          .payment-form-drawer .ant-btn-primary:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          .payment-form-drawer .ant-btn {
            border-radius: 0;
          }

          .payment-form-drawer .ant-table-wrapper,
          .payment-form-drawer [class*="objectArray"],
          .payment-form-drawer [class*="ObjectArray"] {
            margin-top: 8px;
          }

          .payment-form-drawer .ant-table {
            border: 1px solid #cbd5e1;
            border-radius: 0;
          }

          .payment-form-drawer .ant-table-thead > tr > th {
            background: #4b5563 !important;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
            border-bottom: 0;
          }

          .payment-form-drawer .ant-table-tbody > tr > td {
            padding: 7px 10px;
            vertical-align: top;
          }

          .payment-form-drawer .ant-table-tbody .ant-form-item {
            margin-bottom: 0;
          }

          .payment-total-card {
            border: 1px solid #d8dee8;
            background: #eef2f8;
          }

          .payment-total-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 9px 12px;
            font-size: 13px;
            color: #111827;
          }

          .payment-total-row strong {
            font-weight: 600;
          }

          .payment-total-grand {
            margin-top: 8px;
            padding-top: 14px;
            padding-bottom: 14px;
            border-top: 1px solid #d8dee8;
            font-size: 15px;
            font-weight: 700;
          }

          .payment-total-grand strong {
            font-size: 18px;
          }

          @media (max-width: 900px) {
            .payment-form-drawer .ant-drawer-body {
              padding: 12px;
            }
          }
        `}
      </style>

      <ReusableCrud
        key={baseCurrency?.id || 'payment-add'}
        title="Customer Payments"
        addTitle="New Customer Payment"
        drawerClassName="payment-form-drawer"
        apiUrl={api('/api/customer-payments/')}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        ui_type="add form"
        form_ui="drawer"
        drawerWidth="100vw"
        onAddSuccess={(record) => {
          if (record?.id) {
            visitPaymentShow(record.id);
          }
        }}
      />
    </AuthenticatedLayout>
  );
}
