import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Alert,
    Badge,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Input,
    Modal,
    Popconfirm,
    Skeleton,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    theme,
    message as antMessage,
} from 'antd';
import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined,
    CalendarOutlined,
    CopyOutlined,
    DisconnectOutlined,
    DollarCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    ExportOutlined,
    FileTextOutlined,
    LinkOutlined,
    PrinterOutlined,
    ReloadOutlined,
    RollbackOutlined,
    StopOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrintablePdfEmailWrapper from '@/Components/PrintableComponent';

const { Text, Title } = Typography;
const { useToken } = theme;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const PROVIDER_LABELS = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    razorpay: 'Razorpay',
    khalti: 'Khalti',
    esewa: 'eSewa',
};

const PROVIDER_COLORS = {
    stripe: '#635BFF',
    paypal: '#003087',
    razorpay: '#3395FF',
    khalti: '#5C2D91',
    esewa: '#60BB46',
};

const APPROVED_STATUSES = new Set([
    'posted',
    'approved',
    'issued',
    'confirmed',
    'sent',
    'accepted',
    'fulfilled',
    'paid',
    'part_paid',
    'received',
]);

const SUPPORTED_PAYMENT_IN_DOCUMENT_TYPES = new Set([
    'quotation',
    'proforma_invoice',
    'sales_order',
    'invoice',
    'customer_payment',
    'credit_note',
]);

const normalizeDocumentType = (value) => {
    const normalized = String(value || '').toLowerCase();

    const map = {
        payment: 'customer_payment',
        payment_in: 'customer_payment',
        customer_receipt: 'customer_payment',
        receipt: 'customer_payment',
        sales_return: 'credit_note',
        credit_note_sales_return: 'credit_note',
    };

    return map[normalized] || normalized;
};

const humanize = (value = '') =>
    String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

const firstPresent = (...values) =>
    values.find((value) => value !== undefined && value !== null && value !== '');

const asArray = (value) => (Array.isArray(value) ? value : []);

export const formatDate = (value) => {
    if (!value) return '-';

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format('DD MMM YYYY') : value;
};

export const getRelationName = (value) => {
    if (!value) return '-';
    if (typeof value === 'string' || typeof value === 'number') return String(value);

    return (
        value.display_name ||
        value.company_name ||
        value.person_name ||
        value.name ||
        value.label ||
        value.account_name ||
        value.bank_name ||
        value.title ||
        value.invoice_no ||
        value.bill_no ||
        value.quotation_no ||
        value.sales_order_no ||
        value.proforma_no ||
        value.sales_return_no ||
        value.purchase_order_no ||
        value.payment_no ||
        value.expense_no ||
        value.debit_note_no ||
        value.code ||
        '-'
    );
};

const numeric = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

export const formatMoney = (amount, currency) => {
    const prefix = currency?.symbol || currency?.code || currency?.name || '';

    const formatted = numeric(amount).toLocaleString('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return prefix ? `${prefix} ${formatted}` : formatted;
};

const formatQty = (value) =>
    numeric(value).toLocaleString('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return '-';

    return `${numeric(value).toLocaleString('en-NP', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}%`;
};

const isShort = (value) => typeof value === 'string' && value.trim() && value.trim().length <= 160;

export const cleanStatusTag = (status) => {
    const normalized = String(status || 'draft').toLowerCase();

    const color =
        normalized === 'draft'
            ? 'default'
            : normalized === 'cancelled' ||
                normalized === 'void' ||
                normalized === 'rejected'
              ? 'error'
              : APPROVED_STATUSES.has(normalized)
                ? 'success'
                : 'processing';

    return (
        <Tag color={color} style={{ marginInlineEnd: 0 }}>
            {humanize(normalized)}
        </Tag>
    );
};

export const approvalTag = (record) => {
    const approved = record?.approved;

    if (approved === true) {
        return (
            <Tag color="success" style={{ marginInlineEnd: 0 }}>
                Approved
            </Tag>
        );
    }

    if (approved === false) {
        return (
            <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                Draft
            </Tag>
        );
    }

    return APPROVED_STATUSES.has(String(record?.status || '').toLowerCase()) ? (
        <Tag color="success" style={{ marginInlineEnd: 0 }}>
            Approved
        </Tag>
    ) : (
        <Tag style={{ marginInlineEnd: 0 }}>Draft</Tag>
    );
};

const documentTypeConfig = {
    quotation: {
        numberLabel: 'Quotation No',
        numberKeys: ['quotation_no', 'code'],
        dateLabel: 'Quotation Date',
        dateKeys: ['quotation_date', 'date'],
        dueLabel: 'Expiry Date',
        dueKeys: ['expiry_date'],
        linesKeys: ['quotationLines', 'quotation_lines', 'items'],
    },
    proforma_invoice: {
        numberLabel: 'Proforma No',
        numberKeys: ['proforma_no', 'code'],
        dateLabel: 'Proforma Date',
        dateKeys: ['proforma_date', 'date'],
        dueLabel: 'Expiry Date',
        dueKeys: ['expiry_date', 'due_date'],
        linesKeys: ['proformaInvoiceLines', 'proforma_invoice_lines', 'items'],
    },
    sales_order: {
        numberLabel: 'Sales Order No',
        numberKeys: ['sales_order_no', 'code'],
        dateLabel: 'Sales Order Date',
        dateKeys: ['sales_order_date', 'date'],
        dueLabel: 'Due Date',
        dueKeys: ['due_date'],
        linesKeys: ['salesOrderLines', 'sales_order_lines', 'items'],
    },
    invoice: {
        numberLabel: 'Invoice No',
        numberKeys: ['invoice_no', 'code'],
        dateLabel: 'Invoice Date',
        dateKeys: ['invoice_date', 'date'],
        dueLabel: 'Due Date',
        dueKeys: ['due_date'],
        linesKeys: ['invoiceLines', 'invoice_lines', 'items'],
    },
    customer_payment: {
        numberLabel: 'Payment No',
        numberKeys: ['payment_no', 'code'],
        dateLabel: 'Payment Date',
        dateKeys: ['payment_date', 'date'],
        dueLabel: 'Reference',
        dueKeys: ['reference'],
        linesKeys: ['customerPaymentLines', 'customer_payment_lines', 'items'],
    },
    credit_note: {
        numberLabel: 'Credit Note No',
        numberKeys: ['sales_return_no', 'note_number', 'code'],
        dateLabel: 'Credit Note Date',
        dateKeys: ['sales_return_date', 'date'],
        dueLabel: 'Reference',
        dueKeys: ['reference', 'reference_no'],
        linesKeys: ['salesReturnLines', 'sales_return_lines', 'items'],
    },
};

const getDocumentConfig = (documentType) => {
    const normalized = normalizeDocumentType(documentType);
    return documentTypeConfig[normalized] || documentTypeConfig.invoice;
};

const getLines = (record, documentType) => {
    const keys = getDocumentConfig(documentType).linesKeys;

    for (const key of keys) {
        if (Array.isArray(record?.[key])) return record[key];
    }

    return [];
};

const getInvoicePaymentAllocations = (record) =>
    firstPresent(record?.customerPaymentLines, record?.customer_payment_lines, []) || [];

const getDocumentNumber = (record, documentType, title) =>
    firstPresent(...getDocumentConfig(documentType).numberKeys.map((key) => record?.[key])) || title;

const getDocumentDate = (record, documentType) =>
    firstPresent(...getDocumentConfig(documentType).dateKeys.map((key) => record?.[key]));

const getDueLikeValue = (record, documentType) =>
    firstPresent(...getDocumentConfig(documentType).dueKeys.map((key) => record?.[key]));

const taxLabel = (row) => {
    const relation = row?.taxRate || row?.tax_rate;

    if (relation) {
        const label = getRelationName(relation);

        if (label !== '-') return label;

        if (relation?.rate_percent !== undefined && relation?.rate_percent !== null) {
            return formatPercent(relation.rate_percent);
        }
    }

    return row?.tax_code ? humanize(row.tax_code) : '-';
};

const lineProductName = (row) =>
    getRelationName(row?.product) !== '-'
        ? getRelationName(row?.product)
        : firstPresent(row?.product_name, row?.custom_product_name, row?.description) || '-';

const getPrintDocumentTitle = (documentType, fallbackTitle) => {
    const normalized = normalizeDocumentType(documentType);

    const map = {
        quotation: 'Quotation',
        sales_order: 'Sales Order',
        invoice: 'Invoice',
        customer_payment: 'Payment Receipt',
        credit_note: 'Credit Note',
    };

    return map[normalized] || fallbackTitle || 'Document';
};

const getPrintFileName = (record, documentType, title) => {
    const number = getDocumentNumber(record, documentType, title);
    return `${String(number || title || 'document').replace(/[^\w.-]+/g, '_')}.pdf`;
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

const getPath = (object, path, fallback = '') => {
    if (!path) return fallback;

    return String(path)
        .split('.')
        .reduce((current, key) => {
            if (current === null || current === undefined) return fallback;
            return current[key];
        }, object) ?? fallback;
};

const getPartyEmail = (record) =>
    firstPresent(
        record?.contact?.email,
        record?.customer?.email,
        record?.party?.email,
        ''
    );

const getPartyPhone = (record) =>
    firstPresent(
        record?.contact?.phone,
        record?.contact?.mobile,
        record?.customer?.phone,
        record?.party?.phone,
        ''
    );

const getPartyAddress = (record) =>
    firstPresent(
        record?.contact?.address,
        record?.contact?.billing_address,
        record?.customer?.address,
        record?.party?.address,
        ''
    );

const compactAddress = (companyInfo = null) =>
    firstPresent(
        companyInfo?.address,
        [companyInfo?.address_line_1, companyInfo?.address_line_2, companyInfo?.city, companyInfo?.state, companyInfo?.postal_code, companyInfo?.country]
            .filter(Boolean)
            .join(', '),
        ''
    );

const normalizePrintLine = (row, currency) => {
    const qty = firstPresent(row?.qty, row?.quantity, 0);
    const unitPrice = firstPresent(row?.unit_price, row?.rate, row?.price, 0);
    const discountAmount = firstPresent(row?.discount_amount, 0);
    const discountPercent = firstPresent(row?.discount_percent, '');
    const taxAmount = firstPresent(row?.tax_amount, 0);
    const lineTotal = firstPresent(row?.line_total, row?.total, row?.amount, 0);

    return {
        ...row,

        product_name: lineProductName(row),
        item_name: lineProductName(row),
        description: row?.description || '-',

        qty: formatQty(qty),
        quantity: formatQty(qty),

        unit_price: formatMoney(unitPrice, currency),
        rate: formatMoney(unitPrice, currency),
        price: formatMoney(unitPrice, currency),

        discount_percent:
            discountPercent === null || discountPercent === undefined || discountPercent === ''
                ? '-'
                : formatPercent(discountPercent),

        discount_amount: formatMoney(discountAmount, currency),

        tax: taxLabel(row),
        tax_amount: formatMoney(taxAmount, currency),

        line_total: formatMoney(lineTotal, currency),
        amount: formatMoney(firstPresent(row?.amount, lineTotal), currency),

        raw_qty: numeric(qty),
        raw_unit_price: numeric(unitPrice),
        raw_discount_amount: numeric(discountAmount),
        raw_tax_amount: numeric(taxAmount),
        raw_line_total: numeric(lineTotal),
    };
};

const buildPrintContext = (record, documentType, title, companyInfo = null) => {
    const normalizedDocumentType = normalizeDocumentType(documentType);
    const currency = record?.currency;
    const lines = getLines(record, normalizedDocumentType);
    const documentTitle = getPrintDocumentTitle(normalizedDocumentType, title);

    const subtotal = firstPresent(
        record?.subtotal,
        record?.sub_total,
        lines.reduce((sum, row) => {
            return sum + numeric(firstPresent(row?.amount, row?.subtotal, row?.line_total));
        }, 0)
    );

    const discount = firstPresent(
        record?.discount_total,
        record?.total_discount,
        lines.reduce((sum, row) => sum + numeric(row?.discount_amount), 0)
    );

    const tax = firstPresent(
        record?.tax_total,
        record?.total_tax,
        lines.reduce((sum, row) => sum + numeric(row?.tax_amount), 0)
    );

    const total = firstPresent(record?.grand_total, record?.total, record?.amount, 0);
    const paid = firstPresent(record?.paid_total, record?.paid_amount, 0);
    const balance = firstPresent(record?.balance_due, Math.max(numeric(total) - numeric(paid), 0));

    const isVoid = !!(record?.void);
    const isDraft = !record?.void && record?.approved !== true;

    return {
        record,

        company: {
            name: firstPresent(companyInfo?.company_name, record?.company?.name, record?.branch?.name, 'KiteLedger'),
            legal_name: firstPresent(companyInfo?.legal_name, companyInfo?.company_name, record?.company?.legal_name, record?.company?.name, ''),
            address: firstPresent(compactAddress(companyInfo), record?.company?.address, record?.branch?.address, ''),
            phone: firstPresent(companyInfo?.phone, record?.company?.phone, record?.branch?.phone, ''),
            email: firstPresent(companyInfo?.email, record?.company?.email, record?.branch?.email, ''),
            website: firstPresent(companyInfo?.website, record?.company?.website, ''),
            pan_or_vat: firstPresent(companyInfo?.tax_number, companyInfo?.vat_number, record?.company?.tax_id, ''),
            registration_number: firstPresent(companyInfo?.registration_number, record?.company?.registration_number, ''),
            footer: firstPresent(companyInfo?.footer, ''),
            tax_id: firstPresent(companyInfo?.tax_number, companyInfo?.vat_number, record?.company?.pan_no, ''),
            logo: firstPresent(companyInfo?.logo_url, companyInfo?.dark_logo_url, companyInfo?.logo, companyInfo?.dark_logo, ''),
            watermark: companyInfo?.watermark_url || '',
            initials: String(firstPresent(companyInfo?.company_name, record?.company?.name, record?.branch?.name, 'KL'))
                .split(/\s+/)
                .map((part) => part.charAt(0))
                .join('')
                .slice(0, 3)
                .toUpperCase(),
        },

        branch: {
            name: firstPresent(record?.branch?.name, ''),
            address: firstPresent(record?.branch?.address, ''),
            phone: firstPresent(record?.branch?.phone, ''),
        },

        document: {
            type: normalizedDocumentType,
            title: documentTitle,
            number: getDocumentNumber(record, normalizedDocumentType, title),
            date: formatDate(getDocumentDate(record, normalizedDocumentType)),
            due_date: formatDate(getDueLikeValue(record, normalizedDocumentType)),
            reference: firstPresent(record?.reference, record?.reference_no, '-'),
            status: humanize(record?.status || 'draft'),
            notes: record?.notes || '',
            terms: firstPresent(record?.terms, record?.payment_terms, ''),
            void: isVoid,
            voided: isVoid,
            is_draft: isDraft,
            approved: !!(record?.approved),
            voided_reason: record?.voided_reason || '',
            approved_at: formatDate(record?.approved_at),
            voided_at: formatDate(record?.voided_at),
            show_watermark: !!(companyInfo?.show_watermark ?? true),
        },

        party: {
            name: getRelationName(record?.contact),
            phone: getPartyPhone(record),
            email: getPartyEmail(record),
            address: getPartyAddress(record),
            pan_no: firstPresent(record?.contact?.pan_no, record?.contact?.vat_no, ''),
            vat_no: firstPresent(record?.contact?.vat_no, record?.contact?.pan_no, ''),
            tax_id: firstPresent(record?.contact?.tax_id, record?.contact?.pan_no, record?.contact?.vat_no, ''),
        },

        customer: {
            name: getRelationName(record?.contact),
            phone: getPartyPhone(record),
            email: getPartyEmail(record),
            address: getPartyAddress(record),
        },
        account: {
            name: getRelationName(record?.account),
        },

        currency: {
            code: currency?.code || '',
            symbol: currency?.symbol || '',
            name: currency?.name || '',
        },

        exchange_rate: record?.exchange_rate ? Number(record.exchange_rate).toFixed(2) : '',
        subtotal: formatMoney(subtotal, currency),
        discount: formatMoney(discount, currency),
        tax: formatMoney(tax, currency),
        total: formatMoney(total, currency),
        amount_paid: formatMoney(paid, currency),
        balance_due: formatMoney(balance, currency),
        notes: record?.notes || '',
        terms: firstPresent(record?.terms, record?.payment_terms, ''),

        totals: {
            subtotal: formatMoney(subtotal, currency),
            discount: formatMoney(discount, currency),
            tax: formatMoney(tax, currency),
            grand_total: formatMoney(total, currency),
            total: formatMoney(total, currency),
            paid: formatMoney(paid, currency),
            balance: formatMoney(balance, currency),
            amount_in_words: firstPresent(record?.amount_in_words, record?.total_in_words, ''),
        },

        payment: {
            amount: formatMoney(total, currency),
            allocated_amount: formatMoney(
                lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0),
                currency
            ),
            method: firstPresent(record?.payment_method, record?.method, '-'),
            account: getRelationName(record?.account),
            reference_number: firstPresent(record?.reference_no, record?.reference, ''),
            source_account: getRelationName(record?.account),
            destination_account: getRelationName(record?.contact),
        },

        prepared_by: firstPresent(record?.userAdd?.name, record?.created_by?.name, ''),
        approved_by: firstPresent(record?.approvedBy?.name, record?.approved_by?.name, ''),
        printed_at: new Date().toLocaleString(),
        settings: {
            show_watermark: !!(companyInfo?.show_watermark ?? true),
        },

        lines: lines.map((row) => normalizePrintLine(row, currency)),
        items: lines.map((row) => normalizePrintLine(row, currency)),
    };
};

const buildSalesOrderPrefillFromQuotation = (record) => ({
    _source: 'quotation',
    _source_id: record?.id,
    _source_no: record?.quotation_no,
    contact_id: record?.contact?.id ?? record?.contact_id ?? null,
    contact_id_detail: record?.contact ?? null,
    currency_id: record?.currency?.id ?? record?.currency_id ?? null,
    currency_id_detail: record?.currency ?? null,
    exchange_rate: record?.exchange_rate ?? 1,
    credit_term_id: record?.creditTerm?.id ?? record?.credit_term?.id ?? record?.credit_term_id ?? null,
    credit_term_id_detail: record?.creditTerm ?? record?.credit_term ?? null,
    notes: record?.notes ?? '',
    reference: record?.quotation_no ?? '',
    items: asArray(getLines(record, 'quotation')).map((line) => ({
        product_id: line?.product?.id ?? line?.product_id ?? null,
        product_id_detail: line?.product ?? null,
        product_name: lineProductName(line),
        description: line?.description ?? '',
        qty: numeric(firstPresent(line?.qty, line?.quantity, 1)),
        unit_price: numeric(firstPresent(line?.unit_price, line?.rate, 0)),
        discount_percent: numeric(line?.discount_percent ?? 0),
        discount_amount: numeric(line?.discount_amount ?? 0),
        tax_rate_id: line?.taxRate?.id ?? line?.tax_rate?.id ?? line?.tax_rate_id ?? null,
        tax_rate_id_detail: line?.taxRate ?? line?.tax_rate ?? null,
        tax_amount: numeric(line?.tax_amount ?? 0),
        line_total: numeric(firstPresent(line?.line_total, line?.amount, 0)),
    })),
});

const buildInvoicePrefillFromSalesOrder = (record) => ({
    _source: 'sales_order',
    _source_id: record?.id,
    _source_no: record?.sales_order_no,
    contact_id: record?.contact?.id ?? record?.contact_id ?? null,
    contact_id_detail: record?.contact ?? null,
    currency_id: record?.currency?.id ?? record?.currency_id ?? null,
    currency_id_detail: record?.currency ?? null,
    exchange_rate: record?.exchange_rate ?? 1,
    credit_term_id: record?.creditTerm?.id ?? record?.credit_term?.id ?? record?.credit_term_id ?? null,
    credit_term_id_detail: record?.creditTerm ?? record?.credit_term ?? null,
    notes: record?.notes ?? '',
    reference: record?.sales_order_no ?? '',
    items: asArray(getLines(record, 'sales_order')).map((line) => ({
        product_id: line?.product?.id ?? line?.product_id ?? null,
        product_id_detail: line?.product ?? null,
        product_name: lineProductName(line),
        description: line?.description ?? '',
        qty: numeric(firstPresent(line?.qty, line?.quantity, 1)),
        unit_price: numeric(firstPresent(line?.unit_price, line?.rate, 0)),
        discount_percent: numeric(line?.discount_percent ?? 0),
        discount_amount: numeric(line?.discount_amount ?? 0),
        tax_rate_id: line?.taxRate?.id ?? line?.tax_rate?.id ?? line?.tax_rate_id ?? null,
        tax_rate_id_detail: line?.taxRate ?? line?.tax_rate ?? null,
        tax_amount: numeric(line?.tax_amount ?? 0),
        line_total: numeric(firstPresent(line?.line_total, line?.amount, 0)),
    })),
});

const buildPaymentPrefillFromInvoice = (record) => {
    const total = numeric(firstPresent(record?.grand_total, record?.total, 0));
    const balanceDue = numeric(firstPresent(record?.balance_due, total));

    return {
        _source: 'invoice',
        _source_id: record?.id,
        _source_no: record?.invoice_no,
        contact_id: record?.contact?.id ?? record?.contact_id ?? null,
        contact_id_detail: record?.contact ?? null,
        currency_id: record?.currency?.id ?? record?.currency_id ?? null,
        currency_id_detail: record?.currency ?? null,
        exchange_rate: record?.exchange_rate ?? 1,
        amount: balanceDue,
        items: [
            {
                invoice_id: record?.id,
                invoice_id_detail: { id: record?.id, invoice_no: record?.invoice_no },
                invoice_no: record?.invoice_no ?? '',
                invoice_total: total,
                outstanding_amount: balanceDue,
                allocated_amount: balanceDue,
            },
        ],
    };
};

const renderPrintTemplate = (templateHtml, context) => {
    const resolve = (scope, path, fallback = '') => {
        const scoped = getPath(scope, path, undefined);
        return scoped !== undefined && scoped !== null ? scoped : getPath(context, path, fallback);
    };

    const render = (template, scope = context) =>
        String(template || '')
            .replace(/{{([#^])([\w.]+)}}([\s\S]*?){{\/\2}}/g, (_, mode, path, block) => {
                const value = resolve(scope, path, null);
                const truthy = Array.isArray(value) ? value.length > 0 : !!value;

                if (mode === '^') {
                    return truthy ? '' : render(block, scope);
                }

                if (Array.isArray(value)) {
                    return value
                        .map((item, index) => render(block, { ...context, ...(item || {}), '@index': index + 1 }))
                        .join('');
                }

                if (!truthy) return '';

                return render(block, typeof value === 'object' ? { ...context, ...value } : scope);
            })
            .replace(/{{\s*([^}]+)\s*}}/g, (_, path) => {
                const cleanPath = path.trim();
                if (cleanPath === '@index') return escapeHtml(resolve(scope, cleanPath, ''));
                return escapeHtml(resolve(scope, cleanPath, ''));
            });

    return render(templateHtml);
};

const defaultPrintTemplateHtml = `
<div class="print-document">
    <div class="print-header">
        <div>
            <h1>{{document.title}}</h1>
            <p class="muted">{{document.number}}</p>
        </div>

        <div class="print-meta">
            <p><strong>Date:</strong> {{document.date}}</p>
            <p><strong>Due / Ref:</strong> {{document.due_date}}</p>
            <p><strong>Status:</strong> {{document.status}}</p>
        </div>
    </div>

    <div class="party-box">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> {{party.name}}</p>
        <p><strong>Phone:</strong> {{party.phone}}</p>
        <p><strong>Email:</strong> {{party.email}}</p>
        <p><strong>Address:</strong> {{party.address}}</p>
    </div>

    <table class="print-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Item</th>
                <th>Description</th>
                <th class="right">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Tax</th>
                <th class="right">Total</th>
            </tr>
        </thead>

        <tbody>
            {{#lines}}
            <tr>
                <td>{{@index}}</td>
                <td>{{product_name}}</td>
                <td>{{description}}</td>
                <td class="right">{{qty}}</td>
                <td class="right">{{unit_price}}</td>
                <td class="right">{{tax_amount}}</td>
                <td class="right">{{line_total}}</td>
            </tr>
            {{/lines}}
        </tbody>
    </table>

    <div class="summary-box">
        <div><span>Subtotal</span><strong>{{totals.subtotal}}</strong></div>
        <div><span>Discount</span><strong>{{totals.discount}}</strong></div>
        <div><span>Tax</span><strong>{{totals.tax}}</strong></div>
        <div class="grand-total"><span>Grand Total</span><strong>{{totals.grand_total}}</strong></div>
    </div>

    <div class="notes">
        <strong>Notes:</strong>
        <p>{{document.notes}}</p>
    </div>
</div>
`.trim();

const defaultPrintTemplateCss = `
.print-document {
    font-family: Arial, sans-serif;
    color: #111827;
    font-size: 12px;
    line-height: 1.45;
    padding: 24px;
}

.print-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 2px solid #111827;
    padding-bottom: 14px;
    margin-bottom: 18px;
}

.print-header h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
}

.print-header p {
    margin: 4px 0;
}

.muted {
    color: #6b7280;
}

.print-meta {
    text-align: right;
}

.party-box {
    border: 1px solid #d1d5db;
    padding: 12px;
    margin-bottom: 18px;
    border-radius: 6px;
}

.party-box h3 {
    margin: 0 0 8px;
    font-size: 14px;
}

.party-box p {
    margin: 3px 0;
}

.print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
}

.print-table th,
.print-table td {
    border: 1px solid #d1d5db;
    padding: 8px;
    vertical-align: top;
}

.print-table th {
    background: #f3f4f6;
    font-weight: 700;
    text-align: left;
}

.right {
    text-align: right;
}

.summary-box {
    width: 280px;
    margin-left: auto;
    margin-top: 18px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
}

.summary-box div {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
}

.summary-box div:last-child {
    border-bottom: 0;
}

.summary-box .grand-total {
    background: #f3f4f6;
    font-size: 14px;
}

.notes {
    margin-top: 24px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
}

.notes p {
    margin: 4px 0 0;
}

@media print {
    .print-document {
        padding: 18px;
    }
}
`.trim();

function DynamicPrintTemplatePreview({
    record,
    documentType,
    title,
    template,
    templateError,
    companyInfo,
}) {
    const normalizedDocumentType = normalizeDocumentType(documentType);

    const context = useMemo(
        () => buildPrintContext(record, normalizedDocumentType, title, companyInfo),
        [record, normalizedDocumentType, title, companyInfo]
    );

    const resolvedTemplate = template || {
        name: 'Fallback Template',
        template_key: `${normalizedDocumentType}.fallback`,
        template_html: defaultPrintTemplateHtml,
        template_css: defaultPrintTemplateCss,
    };

    const html = useMemo(
        () => renderPrintTemplate(resolvedTemplate.template_html, context),
        [resolvedTemplate.template_html, context]
    );

    const fileName = getPrintFileName(record, normalizedDocumentType, title);

    return (
        <PrintablePdfEmailWrapper
            title={context.document.title}
            subTitle={context.document.number}
            fileName={fileName}
            pageSize="A4"
            pageOrientation="portrait"
            showPageFrame
            previewBackground="#f3f4f6"
            printStyles={resolvedTemplate.template_css || ''}
            defaultEmailValues={{
                to: context.party.email,
                subject: `${context.document.title} ${context.document.number}`,
                body: `Dear ${context.party.name || 'Customer'},\n\nPlease find attached ${context.document.title} ${context.document.number}.\n\nThank you.`,
            }}
            emailExtraPayload={{
                document_type: normalizedDocumentType,
                document_number: context.document.number,
                record_id: record?.id,
            }}
             
            contentStyle={{
                width: '210mm',
                minHeight: '297mm',
            }}
        >
            <style>{resolvedTemplate.template_css || ''}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </PrintablePdfEmailWrapper>
    );
}

function InfoTable({ rows = [], compact = false }) {
    const filteredRows = rows.filter(Boolean);

    if (!filteredRows.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No details available" />;
    }

    return (
        <div className={compact ? 'payment-record-show__info is-compact' : 'payment-record-show__info'}>
            {filteredRows.map((row) => (
                <div className="payment-record-show__info-row" key={row.label}>
                    <div className="payment-record-show__info-label">{row.label}</div>
                    <div className="payment-record-show__info-value">{row.value}</div>
                </div>
            ))}
        </div>
    );
}

function SummaryRail({ title, documentNumber, total, rows, party }) {
    return (
        <aside className="payment-record-show__rail">
            <Card className="payment-record-show__rail-card">
                <div className="payment-record-show__doc-icon">
                    <FileTextOutlined />
                </div>

                <div className="payment-record-show__rail-heading">
                    <Text type="secondary">{title}</Text>
                    <Title level={4}>{documentNumber}</Title>
                </div>

                <div className="payment-record-show__rail-party">
                    <UserOutlined />
                    <Text ellipsis>{party || '-'}</Text>
                </div>

                <div className="payment-record-show__amount-box">
                    <Text type="secondary">Document Total</Text>
                    <strong>{total}</strong>
                </div>

                <InfoTable rows={rows} compact />
            </Card>
        </aside>
    );
}

function SummaryCards({ items = [] }) {
    return (
        <div className="payment-record-show__summary">
            {items.filter(Boolean).map((item) => (
                <Card key={item.label} className={`payment-record-show__summary-card ${item.tone || ''}`}>
                    <div className="payment-record-show__summary-icon">
                        {item.icon || <DollarCircleOutlined />}
                    </div>

                    <div className="payment-record-show__summary-content">
                        <Text type="secondary">{item.label}</Text>
                        <strong>{item.value}</strong>
                    </div>
                </Card>
            ))}
        </div>
    );
}

function HeaderBlock({
    title,
    backRoute,
    backLabel,
    documentNumber,
    record,
    loading,
    onPrint,
    editRoute,
    recordId,
    documentType,
    onConvertToSalesOrder,
    onConvertToInvoice,
    onCollectPayment,
    onSharePaymentLink,
}) {
    const normalizedType = normalizeDocumentType(documentType);
    const isApproved = record?.approved === true;
    const isVoided = record?.void === true;

    return (
        <Card className="payment-record-show__header-card border-none">
            <div className="payment-record-show__header">
                <div className="payment-record-show__header-left">
                    <Link href={route(backRoute)}>
                        <Button type="text" icon={<ArrowLeftOutlined />}>
                            {backLabel}
                        </Button>
                    </Link>

                    <div className="payment-record-show__title-wrap">
                        <Title level={4}>{title}</Title>

                        {!loading && record ? (
                            <Space size={8} wrap>
                                <Text type="secondary">{documentNumber}</Text>
                                {cleanStatusTag(record?.status)}
                                {approvalTag(record)}
                            </Space>
                        ) : (
                            <Text type="secondary">Loading document details</Text>
                        )}
                    </div>
                </div>

                <Space wrap>
                    {normalizedType === 'quotation' && isApproved && (
                        <Tooltip title="Create a Sales Order from this Quotation">
                            <Button
                                type="primary"
                                ghost
                                icon={<ArrowRightOutlined />}
                                disabled={loading || !record}
                                onClick={onConvertToSalesOrder}
                            >
                                Convert to Sales Order
                            </Button>
                        </Tooltip>
                    )}

                    {normalizedType === 'sales_order' && isApproved && (
                        <Tooltip title="Create an Invoice from this Sales Order">
                            <Button
                                type="primary"
                                ghost
                                icon={<ArrowRightOutlined />}
                                disabled={loading || !record}
                                onClick={onConvertToInvoice}
                            >
                                Convert to Invoice
                            </Button>
                        </Tooltip>
                    )}

                    {normalizedType === 'invoice' && isApproved && !isVoided && (
                        <Tooltip title="Collect payment for this Invoice">
                            <Button
                                type="primary"
                                icon={<DollarCircleOutlined />}
                                disabled={loading || !record}
                                onClick={onCollectPayment}
                            >
                                Collect Payment
                            </Button>
                        </Tooltip>
                    )}

                    {normalizedType === 'invoice' && isApproved && !isVoided && (
                        <Tooltip title="Generate or share a payment link so your customer can pay online">
                            <Button
                                icon={<LinkOutlined />}
                                disabled={loading || !record}
                                onClick={onSharePaymentLink}
                            >
                                Share Payment Link
                            </Button>
                        </Tooltip>
                    )}

                    {editRoute && recordId && !isVoided && !isApproved && (
                        <Link href={route(editRoute, recordId)}>
                            <Button icon={<EditOutlined />} disabled={loading || !record}>
                                Edit
                            </Button>
                        </Link>
                    )}

                    <Button icon={<PrinterOutlined />} onClick={onPrint} disabled={loading || !record}>
                        Print Preview
                    </Button>
                </Space>
            </div>
        </Card>
    );
}

function buildRailRows(record, documentType) {
    const normalizedDocumentType = normalizeDocumentType(documentType);
    const config = getDocumentConfig(normalizedDocumentType);

    return [
        { label: config.numberLabel, value: getDocumentNumber(record, normalizedDocumentType, config.numberLabel) },
        { label: config.dateLabel, value: formatDate(getDocumentDate(record, normalizedDocumentType)) },
        { label: 'Customer', value: getRelationName(record?.contact) },
        record?.warehouse ? { label: 'Warehouse', value: getRelationName(record.warehouse) } : null,
        {
            label: 'Currency',
            value:
                firstPresent(
                    record?.currency?.code,
                    record?.currency?.symbol,
                    getRelationName(record?.currency)
                ) || '-',
        },
        { label: 'Status', value: cleanStatusTag(record?.status) },
        { label: 'Approval', value: approvalTag(record) },
        isShort(record?.notes) ? { label: 'Notes', value: record.notes } : null,
    ];
}

function buildOverviewRows(record, documentType) {
    const normalizedDocumentType = normalizeDocumentType(documentType);
    const config = getDocumentConfig(normalizedDocumentType);

    return [
        { label: config.numberLabel, value: getDocumentNumber(record, normalizedDocumentType, config.numberLabel) },
        { label: config.dateLabel, value: formatDate(getDocumentDate(record, normalizedDocumentType)) },
        { label: 'Customer', value: getRelationName(record?.contact) },
        {
            label: config.dueLabel,
            value:
                config.dueLabel === 'Reference'
                    ? getDueLikeValue(record, normalizedDocumentType) || '-'
                    : formatDate(getDueLikeValue(record, normalizedDocumentType)),
        },
        config.dueLabel !== 'Reference'
            ? { label: 'Reference', value: firstPresent(record?.reference, record?.reference_no) || '-' }
            : null,
        record?.warehouse ? { label: 'Warehouse', value: getRelationName(record.warehouse) } : null,
        record?.creditTerm || record?.credit_term
            ? { label: 'Credit Term', value: getRelationName(record?.creditTerm || record?.credit_term) }
            : null,
        {
            label: 'Currency',
            value:
                firstPresent(
                    record?.currency?.code,
                    record?.currency?.symbol,
                    getRelationName(record?.currency)
                ) || '-',
        },
        { label: 'Status', value: cleanStatusTag(record?.status) },
        { label: 'Approval Status', value: approvalTag(record) },
        normalizedDocumentType === 'customer_payment'
            ? { label: 'Payment Account', value: getRelationName(record?.account) }
            : null,
        normalizedDocumentType === 'customer_payment'
            ? { label: 'Payment Method', value: firstPresent(record?.payment_method, record?.method) || '-' }
            : null,
        normalizedDocumentType === 'customer_payment'
            ? {
                  label: 'Bank Charges Account',
                  value: getRelationName(record?.bankChargesAccount || record?.bank_charges_account),
              }
            : null,
        normalizedDocumentType === 'customer_payment'
            ? {
                  label: 'TDS Account',
                  value: getRelationName(record?.tdsChargesAccount || record?.tds_charges_account),
              }
            : null,
        isShort(record?.notes) ? { label: 'Notes', value: record.notes } : null,
    ].filter(Boolean);
}

function buildSummaryCards(record, documentType) {
    const normalizedDocumentType = normalizeDocumentType(documentType);
    const currency = record?.currency;
    const total = numeric(firstPresent(record?.grand_total, record?.total, record?.amount));
    const paid = numeric(firstPresent(record?.paid_total, record?.paid_amount));
    const balance = numeric(firstPresent(record?.balance_due, Math.max(total - paid, 0)));

    if (normalizedDocumentType === 'invoice') {
        return [
            {
                label: 'Total Amount',
                value: formatMoney(total, currency),
                icon: <DollarCircleOutlined />,
                tone: 'is-primary',
            },
            {
                label: 'Paid Total',
                value: formatMoney(paid, currency),
                icon: <CheckCircleOutlined />,
                tone: 'is-success',
            },
            {
                label: 'Balance Due',
                value: formatMoney(balance, currency),
                icon: <CalendarOutlined />,
                tone: balance > 0 ? 'is-warning' : 'is-success',
            },
        ];
    }

    if (normalizedDocumentType === 'customer_payment') {
        const lines = getLines(record, normalizedDocumentType);
        const allocated = lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0);
        const bankCharges = numeric(record?.bank_charges);
        const tdsCharges = numeric(record?.tds_charges);

        return [
            {
                label: 'Payment Amount',
                value: formatMoney(total, currency),
                icon: <DollarCircleOutlined />,
                tone: 'is-primary',
            },
            {
                label: 'Allocated Amount',
                value: formatMoney(allocated, currency),
                icon: <CheckCircleOutlined />,
                tone: 'is-success',
            },
            {
                label: 'Unallocated Amount',
                value: formatMoney(Math.max(total - allocated, 0), currency),
                icon: <CalendarOutlined />,
                tone: Math.max(total - allocated, 0) > 0 ? 'is-warning' : 'is-success',
            },
            bankCharges
                ? {
                      label: 'Bank Charges',
                      value: formatMoney(bankCharges, currency),
                      tone: 'is-muted',
                  }
                : null,
            tdsCharges
                ? {
                      label: 'TDS Charges',
                      value: formatMoney(tdsCharges, currency),
                      tone: 'is-muted',
                  }
                : null,
        ];
    }

    return [
        {
            label: 'Total Amount',
            value: formatMoney(total, currency),
            icon: <DollarCircleOutlined />,
            tone: 'is-primary',
        },
    ];
}

function lineTable(title, columns, dataSource, emptyText, summary) {
    return (
        <Card title={title} className="payment-record-show__card" key={title}>
            <Table
                size="small"
                rowKey={(row, index) => row?.id || `${title}-${index}`}
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                scroll={{ x: 980 }}
                rowClassName={(_, index) =>
                    index % 2 === 0
                        ? 'payment-record-show__table-row'
                        : 'payment-record-show__table-row is-alt'
                }
                locale={{
                    emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />,
                }}
                summary={summary}
            />
        </Card>
    );
}

function buildMainCards(record, documentType) {
    const normalizedDocumentType = normalizeDocumentType(documentType);
    const currency = record?.currency;
    const lines = getLines(record, normalizedDocumentType);
    const cards = [];

    const salesLikeColumns = [
        {
            title: 'Product / Item',
            key: 'product',
            width: 220,
            render: (_, row) => <Text strong>{lineProductName(row)}</Text>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 260,
            render: (value) => value || '-',
        },
        {
            title: 'Qty',
            key: 'qty',
            width: 90,
            align: 'right',
            render: (_, row) => formatQty(firstPresent(row?.qty, row?.quantity)),
        },
        {
            title: 'Unit Price',
            key: 'unit_price',
            width: 130,
            align: 'right',
            render: (_, row) => formatMoney(row?.unit_price, currency),
        },
        {
            title: 'Discount %',
            key: 'discount_percent',
            width: 110,
            align: 'right',
            render: (_, row) => formatPercent(row?.discount_percent),
        },
        {
            title: 'Tax',
            key: 'tax',
            width: 140,
            render: (_, row) => taxLabel(row),
        },
        {
            title: 'Tax Amount',
            key: 'tax_amount',
            width: 130,
            align: 'right',
            render: (_, row) => formatMoney(row?.tax_amount, currency),
        },
        {
            title: 'Line Total',
            key: 'line_total',
            width: 140,
            align: 'right',
            render: (_, row) => (
                <Text strong>{formatMoney(firstPresent(row?.line_total, row?.amount), currency)}</Text>
            ),
        },
    ];

    if (
        [
            'quotation',
            'sales_order',
            'invoice',
            'credit_note',
        ].includes(normalizedDocumentType)
    ) {
        const titleMap = {
            quotation: 'Quotation Lines',
            sales_order: 'Sales Order Lines',
            invoice: 'Invoice Lines',
            credit_note: 'Credit Note Lines',
        };

        const effectiveColumns = salesLikeColumns
            .map((column) =>
                normalizedDocumentType === 'credit_note'
                    ? column.key === 'discount_percent'
                        ? null
                        : column
                    : column
            )
            .filter(Boolean);

        cards.push(
            lineTable(
                titleMap[normalizedDocumentType],
                effectiveColumns,
                lines,
                'No line items',
                () => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={effectiveColumns.length - 1}>
                            Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={effectiveColumns.length - 1} align="right">
                            {formatMoney(
                                lines.reduce(
                                    (sum, row) =>
                                        sum + numeric(firstPresent(row?.line_total, row?.amount)),
                                    0
                                ),
                                currency
                            )}
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )
            )
        );
    }

    if (normalizedDocumentType === 'invoice') {
        const allocations = asArray(getInvoicePaymentAllocations(record));

        cards.push(
            lineTable(
                'Payment Allocations',
                [
                    {
                        title: 'Payment No',
                        key: 'payment_no',
                        render: (_, row) => getRelationName(row?.customerPayment || row?.customer_payment),
                    },
                    {
                        title: 'Payment Date',
                        key: 'payment_date',
                        render: (_, row) =>
                            formatDate(
                                firstPresent(
                                    row?.customerPayment?.payment_date,
                                    row?.customer_payment?.payment_date
                                )
                            ),
                    },
                    {
                        title: 'Allocated Amount',
                        key: 'allocated_amount',
                        align: 'right',
                        render: (_, row) => formatMoney(row?.allocated_amount, currency),
                    },
                    {
                        title: 'Payment Amount',
                        key: 'payment_amount',
                        align: 'right',
                        render: (_, row) =>
                            formatMoney(
                                firstPresent(row?.customerPayment?.amount, row?.customer_payment?.amount),
                                currency
                            ),
                    },
                    {
                        title: 'Status',
                        key: 'status',
                        render: (_, row) =>
                            cleanStatusTag(
                                firstPresent(row?.customerPayment?.status, row?.customer_payment?.status)
                            ),
                    },
                ],
                allocations,
                'No payment allocations'
            )
        );
    }

    if (normalizedDocumentType === 'customer_payment') {
        cards.push(
            lineTable(
                'Payment Allocation Lines',
                [
                    {
                        title: 'Invoice No',
                        key: 'invoice',
                        render: (_, row) => getRelationName(row?.invoice),
                    },
                    {
                        title: 'Invoice Date',
                        key: 'invoice_date',
                        render: (_, row) => formatDate(row?.invoice?.invoice_date),
                    },
                    {
                        title: 'Allocated Amount',
                        key: 'allocated_amount',
                        align: 'right',
                        render: (_, row) => formatMoney(row?.allocated_amount, currency),
                    },
                    {
                        title: 'Invoice Total',
                        key: 'invoice_total',
                        align: 'right',
                        render: (_, row) => formatMoney(row?.invoice?.total, currency),
                    },
                    {
                        title: 'Balance Due',
                        key: 'balance_due',
                        align: 'right',
                        render: (_, row) => formatMoney(row?.invoice?.balance_due, currency),
                    },
                ],
                lines,
                'No invoice allocations',
                () => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}>
                            Total Allocated
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                            {formatMoney(
                                lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0),
                                currency
                            )}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} colSpan={2} />
                    </Table.Summary.Row>
                )
            )
        );
    }

    return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Link Drawer
// ─────────────────────────────────────────────────────────────────────────────
function PaymentLinkDrawer({ open, onClose, invoiceId, invoiceNo, currency }) {
    const { token } = theme.useToken();

    const [linkData, setLinkData]       = useState(null);
    const [payments, setPayments]       = useState([]);
    const [loading, setLoading]         = useState(false);
    const [generating, setGenerating]   = useState(false);
    const [disabling, setDisabling]     = useState(false);

    const load = useCallback(async () => {
        if (!open || !invoiceId) return;
        setLoading(true);
        try {
            const [linkRes, paymentsRes] = await Promise.allSettled([
                axios.get(api(`/api/invoices/${invoiceId}/payment-link`)),
                axios.get(api('/api/online-payments/'), {
                    params: { invoice_id: invoiceId, page_size: 20 },
                }),
            ]);
            if (linkRes.status === 'fulfilled') setLinkData(linkRes.value.data);
            if (paymentsRes.status === 'fulfilled')
                setPayments(paymentsRes.value.data?.results || paymentsRes.value.data || []);
        } catch {
            // silent — individual settled errors handled above
        } finally {
            setLoading(false);
        }
    }, [open, invoiceId]);

    useEffect(() => { load(); }, [load]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(api(`/api/invoices/${invoiceId}/payment-link`));
            setLinkData(res.data);
            antMessage.success('Payment link generated');
        } catch (e) {
            antMessage.error(e?.response?.data?.message || 'Failed to generate link');
        } finally {
            setGenerating(false);
        }
    };

    const handleDisable = async () => {
        setDisabling(true);
        try {
            await axios.delete(api(`/api/invoices/${invoiceId}/payment-link`));
            setLinkData((prev) => ({
                ...prev,
                link: { ...prev?.link, active: false },
                public_url: null,
            }));
            antMessage.success('Payment link disabled');
        } catch (e) {
            antMessage.error(e?.response?.data?.message || 'Failed to disable link');
        } finally {
            setDisabling(false);
        }
    };

    const publicUrl = linkData?.public_url;
    const link      = linkData?.link;
    const isActive  = !!(link?.active && !link?.is_expired && publicUrl);
    const isExpired = !!(link && link.is_expired);

    const statusTag = !link
        ? <Tag>No link yet</Tag>
        : isActive
        ? <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag>
        : isExpired
        ? <Tag color="warning" icon={<WarningOutlined />}>Expired</Tag>
        : <Tag icon={<StopOutlined />}>Disabled</Tag>;

    const paymentStatusColor = { succeeded: 'success', failed: 'error', refunded: 'warning', pending: 'processing' };

    return (
        <Drawer
            title={<Space><LinkOutlined />Share Payment Link</Space>}
            open={open}
            onClose={onClose}
            width={520}
            destroyOnClose={false}
            styles={{ body: { padding: 20, background: token.colorBgLayout } }}
        >
            {loading ? (
                <Skeleton active paragraph={{ rows: 10 }} />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* ── Status & URL ─────────────────────────────────────── */}
                    <Card size="small" style={{ borderRadius: token.borderRadiusLG }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Typography.Text strong>Payment Link</Typography.Text>
                            {statusTag}
                        </div>

                        {isActive ? (
                            <>
                                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                    Share this link with your customer so they can pay online.
                                </Typography.Text>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input value={publicUrl} readOnly style={{ fontSize: 12 }} />
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                            navigator.clipboard?.writeText(publicUrl);
                                            antMessage.success('Link copied to clipboard');
                                        }}
                                    >
                                        Copy
                                    </Button>
                                    <Tooltip title="Open in new tab">
                                        <Button icon={<ExportOutlined />} onClick={() => window.open(publicUrl, '_blank')} />
                                    </Tooltip>
                                </Space.Compact>
                            </>
                        ) : (
                            <Alert
                                type="info"
                                showIcon
                                message={!link
                                    ? 'No payment link exists yet. Generate one to let customers pay online.'
                                    : isExpired
                                    ? 'This payment link has expired. Regenerate to create a fresh one.'
                                    : 'This payment link is disabled. Regenerate to reactivate it.'}
                            />
                        )}
                    </Card>

                    {/* ── QR Code ──────────────────────────────────────────── */}
                    {isActive && (
                        <Card
                            size="small"
                            style={{ borderRadius: token.borderRadiusLG, textAlign: 'center' }}
                            title={<Space><span>QR Code</span><Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>— customer scans to pay</Typography.Text></Space>}
                        >
                            <div style={{ padding: '12px 0' }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(publicUrl)}&size=200x200&margin=10&bgcolor=ffffff`}
                                    alt="Payment QR Code"
                                    width={200}
                                    height={200}
                                    style={{
                                        border: '6px solid #fff',
                                        borderRadius: 8,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                    }}
                                />
                                <div style={{ marginTop: 10 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        Invoice #{invoiceNo}
                                    </Typography.Text>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ── Link details ─────────────────────────────────────── */}
                    {link && (
                        <Card size="small" title="Link Details" style={{ borderRadius: token.borderRadiusLG }}>
                            <Descriptions size="small" column={1} bordered>
                                <Descriptions.Item label="Status">{statusTag}</Descriptions.Item>
                                {link.expires_at && (
                                    <Descriptions.Item label="Expires">
                                        {formatDate(link.expires_at)}
                                    </Descriptions.Item>
                                )}
                                {link.last_accessed_at && (
                                    <Descriptions.Item label="Last Accessed">
                                        {formatDate(link.last_accessed_at)}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Card>
                    )}

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <Card size="small" title="Actions" style={{ borderRadius: token.borderRadiusLG }}>
                        <Space wrap>
                            <Button
                                type={!link || !isActive ? 'primary' : 'default'}
                                icon={<ReloadOutlined />}
                                loading={generating}
                                onClick={handleGenerate}
                            >
                                {!link ? 'Generate Link' : 'Regenerate Link'}
                            </Button>

                            {link && isActive && (
                                <Popconfirm
                                    title="Disable payment link?"
                                    description="Customers will no longer be able to pay via this link."
                                    onConfirm={handleDisable}
                                    okText="Disable"
                                    okButtonProps={{ danger: true }}
                                    cancelText="Cancel"
                                >
                                    <Button danger icon={<DisconnectOutlined />} loading={disabling}>
                                        Disable Link
                                    </Button>
                                </Popconfirm>
                            )}

                            <Tooltip title="Refresh status">
                                <Button icon={<ReloadOutlined />} onClick={load} />
                            </Tooltip>
                        </Space>
                    </Card>

                    {/* ── Online Payment History ────────────────────────────── */}
                    <Card
                        size="small"
                        title={
                            <Space>
                                Online Payments
                                <Badge count={payments.length} color="#1677ff" overflowCount={99} />
                            </Space>
                        }
                        style={{ borderRadius: token.borderRadiusLG }}
                    >
                        {payments.length === 0 ? (
                            <Empty
                                description="No online payments received yet"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                style={{ padding: '20px 0' }}
                            />
                        ) : (
                            <Table
                                size="small"
                                rowKey="id"
                                dataSource={payments}
                                pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true }}
                                columns={[
                                    {
                                        title: 'Date',
                                        dataIndex: 'paid_at',
                                        width: 100,
                                        render: (v, r) => formatDate(v || r.created_at),
                                    },
                                    {
                                        title: 'Method',
                                        dataIndex: 'provider',
                                        width: 100,
                                        render: (v) => (
                                            <Tag color={PROVIDER_COLORS[v] ? undefined : 'blue'}
                                                style={PROVIDER_COLORS[v] ? { background: PROVIDER_COLORS[v] + '18', borderColor: PROVIDER_COLORS[v], color: PROVIDER_COLORS[v] } : {}}>
                                                {PROVIDER_LABELS[v] || v}
                                            </Tag>
                                        ),
                                    },
                                    {
                                        title: 'Amount',
                                        dataIndex: 'amount',
                                        align: 'right',
                                        render: (v, r) => {
                                            const sym = r.currency?.symbol || currency?.symbol || '';
                                            return `${sym}${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        },
                                    },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        width: 100,
                                        render: (v) => (
                                            <Tag color={paymentStatusColor[v] || 'default'}>
                                                {String(v || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                            </Tag>
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </Card>

                </div>
            )}
        </Drawer>
    );
}

export default function PaymentInRecordShow({
    id,
    title,
    endpoint,
    backRoute,
    backLabel,
    documentType,
    editRoute,
}) {
    const { token } = useToken();

    const normalizedDocumentType = normalizeDocumentType(documentType);

    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [printOpen, setPrintOpen] = useState(false);

    const [printTemplate, setPrintTemplate] = useState(null);
    const [printTemplateLoading, setPrintTemplateLoading] = useState(false);
    const [printTemplateError, setPrintTemplateError] = useState('');
    const [companyInfo, setCompanyInfo] = useState(null);

    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);

    const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);

    const handleApprove = async () => {
        if (!record) return;
        setApproveLoading(true);
        try {
            const baseEndpoint = endpoint.replace(/\/+$/, '');
            await axios.post(api(`${baseEndpoint}/${record.id}/approve`));
            const response = await axios.get(api(`${baseEndpoint}/${record.id}`));
            setRecord(response.data?.data ?? response.data);
            setApproveModalOpen(false);
        } catch {
            //
        } finally {
            setApproveLoading(false);
        }
    };

    const handleConvertToSalesOrder = () => {
        if (!record) return;
        try {
            sessionStorage.setItem('kiteledger_so_prefill', JSON.stringify(buildSalesOrderPrefillFromQuotation(record)));
        } catch {}
        if (typeof route === 'function') {
            router.visit(route('payment-in.sales-orders.add'));
        } else {
            router.visit('/payment-in/sales-orders/add');
        }
    };

    const handleConvertToInvoice = () => {
        if (!record) return;
        try {
            sessionStorage.setItem('kiteledger_invoice_prefill', JSON.stringify(buildInvoicePrefillFromSalesOrder(record)));
        } catch {}
        if (typeof route === 'function') {
            router.visit(route('payment-in.invoices.add'));
        } else {
            router.visit('/payment-in/invoices/add');
        }
    };

    const handleCollectPayment = () => {
        if (!record) return;
        try {
            sessionStorage.setItem('kiteledger_payment_prefill', JSON.stringify(buildPaymentPrefillFromInvoice(record)));
        } catch {}
        if (typeof route === 'function') {
            router.visit(route('payment-in.payments.add'));
        } else {
            router.visit('/payment-in/payments/add');
        }
    };

    useEffect(() => {
        let active = true;
        const baseEndpoint = endpoint.replace(/\/+$/, '');

        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await axios.get(api(`${baseEndpoint}/${id}`));

                if (!active) return;

                setRecord(response.data?.data ?? response.data);
            } catch (err) {
                if (!active) return;

                setRecord(null);
                setError(err?.response?.data?.message || `Failed to load ${title}.`);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [endpoint, id, title]);

    useEffect(() => {
        if (!printOpen || !record || !normalizedDocumentType) return;

        let active = true;

        const loadPrintTemplate = async () => {
            setPrintTemplateLoading(true);
            setPrintTemplateError('');
            setPrintTemplate(null);

            try {
                const [templateResponse, companyResponse] = await Promise.all([
                    axios.get(api(`/api/printing-templates/resolve?document_type=${encodeURIComponent(normalizedDocumentType)}`)),
                    axios.get(api('/api/app-settings/current')).catch(() => ({ data: null })),
                ]);

                if (!active) return;

                setPrintTemplate(templateResponse.data?.data ?? templateResponse.data ?? null);
                setCompanyInfo(companyResponse.data?.data ?? companyResponse.data ?? null);
            } catch (err) {
                if (!active) return;

                setPrintTemplate(null);
                setPrintTemplateError(
                    err?.response?.data?.message ||
                        'No active print template found. Fallback template is being used.'
                );
            } finally {
                if (active) setPrintTemplateLoading(false);
            }
        };

        loadPrintTemplate();

        return () => {
            active = false;
        };
    }, [printOpen, record, normalizedDocumentType]);

    const documentNumber = useMemo(
        () => getDocumentNumber(record, normalizedDocumentType, title),
        [record, normalizedDocumentType, title]
    );

    const totalDisplay = useMemo(
        () => formatMoney(firstPresent(record?.grand_total, record?.total, record?.amount), record?.currency),
        [record]
    );

    const railRows = useMemo(
        () => buildRailRows(record, normalizedDocumentType),
        [record, normalizedDocumentType]
    );

    const overviewRows = useMemo(
        () => buildOverviewRows(record, normalizedDocumentType),
        [record, normalizedDocumentType]
    );

    const summaryItems = useMemo(
        () => buildSummaryCards(record, normalizedDocumentType),
        [record, normalizedDocumentType]
    );

    const mainCards = useMemo(
        () => buildMainCards(record, normalizedDocumentType),
        [record, normalizedDocumentType]
    );

    const partyName = useMemo(() => getRelationName(record?.contact), [record]);

    const uiVars = {
        '--payment-record-show-bg': token.colorBgLayout,
        '--payment-record-show-surface': token.colorBgContainer,
        '--payment-record-show-surface-elevated': token.colorBgElevated,
        '--payment-record-show-surface-soft': token.colorFillAlter,
        '--payment-record-show-surface-muted': token.colorFillQuaternary,
        '--payment-record-show-border': token.colorBorderSecondary,
        '--payment-record-show-border-strong': token.colorBorder,
        '--payment-record-show-text': token.colorText,
        '--payment-record-show-text-secondary': token.colorTextSecondary,
        '--payment-record-show-text-tertiary': token.colorTextTertiary,
        '--payment-record-show-primary': token.colorPrimary,
        '--payment-record-show-primary-bg': token.colorPrimaryBg,
        '--payment-record-show-success': token.colorSuccess,
        '--payment-record-show-success-bg': token.colorSuccessBg,
        '--payment-record-show-warning': token.colorWarning,
        '--payment-record-show-warning-bg': token.colorWarningBg,
        '--payment-record-show-radius': `${token.borderRadiusLG}px`,
        '--payment-record-show-radius-sm': `${token.borderRadius}px`,
        '--payment-record-show-padding': `${token.padding}px`,
        '--payment-record-show-padding-lg': `${token.paddingLG}px`,
        '--payment-record-show-padding-sm': `${token.paddingSM}px`,
        '--payment-record-show-padding-xs': `${token.paddingXS}px`,
        '--payment-record-show-font-size-sm': `${token.fontSizeSM}px`,
        '--payment-record-show-font-size': `${token.fontSize}px`,
        '--payment-record-show-font-size-lg': `${token.fontSizeLG}px`,
        '--payment-record-show-box-shadow': token.boxShadowTertiary,
    };

    return (
        <AuthenticatedLayout
            header={
                <HeaderBlock
                    title={title}
                    backRoute={backRoute}
                    backLabel={backLabel}
                    documentNumber={documentNumber}
                    record={record}
                    loading={loading}
                    onPrint={() => setPrintOpen(true)}
                    editRoute={editRoute}
                    recordId={id}
                    documentType={normalizedDocumentType}
                    onConvertToSalesOrder={handleConvertToSalesOrder}
                    onConvertToInvoice={handleConvertToInvoice}
                    onCollectPayment={handleCollectPayment}
                    onSharePaymentLink={() => setPaymentLinkOpen(true)}
                />
            }
        >
            <Head title={documentNumber || title} />

            <style>{`
                .payment-record-show {
                    min-height: calc(100vh - 64px);
                    background: var(--payment-record-show-bg);
                    color: var(--payment-record-show-text);
                    padding: var(--payment-record-show-padding);
                }

                .payment-record-show__shell {
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding);
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .payment-record-show__header-card.ant-card,
                .payment-record-show__rail-card.ant-card,
                .payment-record-show__card.ant-card,
                .payment-record-show__summary-card.ant-card {
                    border-color: var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius);
                    box-shadow: var(--payment-record-show-box-shadow);
                    overflow: hidden;
                }

                .payment-record-show__header-card .ant-card-body {
                    padding: var(--payment-record-show-padding-sm) var(--payment-record-show-padding);
                }

                .payment-record-show__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--payment-record-show-padding);
                }

                .payment-record-show__header-left {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__title-wrap {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .payment-record-show__title-wrap h4 {
                    margin: 0 !important;
                    line-height: 1.2 !important;
                }

                .payment-record-show__body {
                    display: grid;
                    grid-template-columns: 300px minmax(0, 1fr);
                    gap: var(--payment-record-show-padding);
                    align-items: start;
                }

                .payment-record-show__rail {
                    position: sticky;
                    top: var(--payment-record-show-padding);
                    min-width: 0;
                }

                .payment-record-show__rail-card .ant-card-body {
                    padding: var(--payment-record-show-padding);
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__doc-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--payment-record-show-primary-bg);
                    color: var(--payment-record-show-primary);
                    font-size: 20px;
                }

                .payment-record-show__rail-heading {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding-bottom: var(--payment-record-show-padding-sm);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__rail-heading h4 {
                    margin: 0 !important;
                    font-size: 18px !important;
                    line-height: 1.25 !important;
                    word-break: break-word;
                }

                .payment-record-show__rail-party {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    padding: 10px 12px;
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius-sm);
                    background: var(--payment-record-show-surface-muted);
                }

                .payment-record-show__amount-box {
                    padding: var(--payment-record-show-padding-sm);
                    border-radius: var(--payment-record-show-radius-sm);
                    background: var(--payment-record-show-primary-bg);
                    border: 1px solid color-mix(in srgb, var(--payment-record-show-primary) 20%, transparent);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .payment-record-show__amount-box strong {
                    font-size: 22px;
                    line-height: 1.15;
                    color: var(--payment-record-show-primary);
                }

                .payment-record-show__main {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding);
                }

                .payment-record-show__summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__summary-card .ant-card-body {
                    min-height: 96px;
                    padding: var(--payment-record-show-padding);
                    display: flex;
                    align-items: flex-start;
                    gap: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__summary-card {
                    position: relative;
                }

                .payment-record-show__summary-card::before {
                    content: '';
                    position: absolute;
                    inset-inline: 0;
                    top: 0;
                    height: 3px;
                    background: var(--payment-record-show-primary);
                }

                .payment-record-show__summary-card.is-success::before {
                    background: var(--payment-record-show-success);
                }

                .payment-record-show__summary-card.is-warning::before {
                    background: var(--payment-record-show-warning);
                }

                .payment-record-show__summary-card.is-muted::before {
                    background: var(--payment-record-show-border-strong);
                }

                .payment-record-show__summary-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--payment-record-show-primary);
                    background: var(--payment-record-show-primary-bg);
                    flex: 0 0 auto;
                    font-size: 17px;
                }

                .payment-record-show__summary-card.is-success .payment-record-show__summary-icon {
                    color: var(--payment-record-show-success);
                    background: var(--payment-record-show-success-bg);
                }

                .payment-record-show__summary-card.is-warning .payment-record-show__summary-icon {
                    color: var(--payment-record-show-warning);
                    background: var(--payment-record-show-warning-bg);
                }

                .payment-record-show__summary-card.is-muted .payment-record-show__summary-icon {
                    color: var(--payment-record-show-text-secondary);
                    background: var(--payment-record-show-surface-soft);
                }

                .payment-record-show__summary-content {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .payment-record-show__summary-content strong {
                    font-size: 20px;
                    line-height: 1.2;
                    color: var(--payment-record-show-text);
                }

                .payment-record-show__card .ant-card-head {
                    min-height: 44px;
                    padding: 0 var(--payment-record-show-padding);
                    border-bottom: 1px solid var(--payment-record-show-border);
                    background: var(--payment-record-show-surface-elevated);
                }

                .payment-record-show__card .ant-card-head-title {
                    font-size: var(--payment-record-show-font-size);
                    font-weight: 700;
                }

                .payment-record-show__card .ant-card-body {
                    padding: var(--payment-record-show-padding);
                    min-width: 0;
                }

                .payment-record-show__info {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius-sm);
                    overflow: hidden;
                    background: var(--payment-record-show-surface);
                }

                .payment-record-show__info.is-compact {
                    grid-template-columns: 1fr;
                }

                .payment-record-show__info-row {
                    min-width: 0;
                    display: grid;
                    grid-template-columns: 140px minmax(0, 1fr);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:nth-last-child(-n + 2) {
                    border-bottom: 0;
                }

                .payment-record-show__info.is-compact .payment-record-show__info-row:last-child {
                    border-bottom: 0;
                }

                .payment-record-show__info-row:nth-child(odd) {
                    border-right: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info.is-compact .payment-record-show__info-row {
                    grid-template-columns: 112px minmax(0, 1fr);
                    border-right: 0;
                }

                .payment-record-show__info-label,
                .payment-record-show__info-value {
                    min-width: 0;
                    padding: 9px 11px;
                    font-size: var(--payment-record-show-font-size-sm);
                    line-height: 1.35;
                    word-break: break-word;
                }

                .payment-record-show__info-label {
                    color: var(--payment-record-show-text-secondary);
                    background: var(--payment-record-show-surface-muted);
                    font-weight: 600;
                    border-right: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__info-value {
                    color: var(--payment-record-show-text);
                    background: var(--payment-record-show-surface);
                }

                .payment-record-show .ant-table {
                    font-size: var(--payment-record-show-font-size-sm);
                }

                .payment-record-show .ant-table-wrapper .ant-table-container {
                    border-radius: var(--payment-record-show-radius-sm);
                    overflow: hidden;
                }

                .payment-record-show .ant-table-wrapper .ant-table-thead > tr > th {
                    padding: 9px 11px !important;
                    background: var(--payment-record-show-surface-muted) !important;
                    border-color: var(--payment-record-show-border) !important;
                    color: var(--payment-record-show-text-secondary) !important;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .payment-record-show .ant-table-wrapper .ant-table-tbody > tr > td,
                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    padding: 9px 11px !important;
                    border-color: var(--payment-record-show-border) !important;
                }

                .payment-record-show__table-row.is-alt > td {
                    background: var(--payment-record-show-surface-muted);
                }

                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    background: var(--payment-record-show-surface-soft);
                    font-weight: 700;
                }

                .payment-record-show__state {
                    padding: var(--payment-record-show-padding-lg);
                    background: var(--payment-record-show-surface);
                    border: 1px solid var(--payment-record-show-border);
                    border-radius: var(--payment-record-show-radius);
                    box-shadow: var(--payment-record-show-box-shadow);
                }

                @media (max-width: 1100px) {
                    .payment-record-show__body {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__rail {
                        position: static;
                    }

                    .payment-record-show__rail-card .ant-card-body {
                        display: grid;
                        grid-template-columns: auto minmax(0, 1fr);
                        align-items: start;
                    }

                    .payment-record-show__rail-heading,
                    .payment-record-show__rail-party,
                    .payment-record-show__amount-box,
                    .payment-record-show__info {
                        grid-column: 1 / -1;
                    }
                }

                @media (max-width: 768px) {
                    .payment-record-show {
                        padding: var(--payment-record-show-padding-sm);
                    }

                    .payment-record-show__header {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .payment-record-show__header-left {
                        align-items: flex-start;
                    }

                    .payment-record-show__summary {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info-row,
                    .payment-record-show__info.is-compact .payment-record-show__info-row {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__info-row:nth-child(odd) {
                        border-right: 0;
                    }

                    .payment-record-show__info-label {
                        border-right: 0;
                        border-bottom: 1px solid var(--payment-record-show-border);
                    }

                    .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:nth-last-child(-n + 2) {
                        border-bottom: 1px solid var(--payment-record-show-border);
                    }

                    .payment-record-show__info:not(.is-compact) .payment-record-show__info-row:last-child {
                        border-bottom: 0;
                    }
                }
            `}</style>

            <div className="payment-record-show" style={uiVars}>
                <div className="payment-record-show__shell">
                    {loading ? (
                        <div className="payment-record-show__state">
                            <Skeleton active paragraph={{ rows: 10 }} />
                        </div>
                    ) : error ? (
                        <div className="payment-record-show__state">
                            <Alert
                                type="warning"
                                showIcon
                                message={error}
                                description="The document layout is ready, but this record could not be loaded from the current API response."
                            />
                        </div>
                    ) : !record ? (
                        <div className="payment-record-show__state">
                            <Empty description={`${title} not found`} />
                        </div>
                    ) : (
                        <div className="payment-record-show__body">
                            <SummaryRail
                                title={title}
                                documentNumber={documentNumber}
                                total={totalDisplay}
                                rows={railRows}
                                party={partyName}
                            />

                            <main className="payment-record-show__main">
                                {record?.void && (
                                    <Alert
                                        type="error"
                                        showIcon
                                        icon={<StopOutlined />}
                                        message="This transaction has been voided"
                                        description={record?.voided_reason ? `Reason: ${record.voided_reason}` : 'This transaction is voided and cannot be edited or approved.'}
                                        style={{ marginBottom: 0 }}
                                    />
                                )}
                                {!record?.void && record?.approved !== true && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        icon={<ExclamationCircleOutlined />}
                                        message="This transaction is still in draft and has not been approved."
                                        description="Approve it to assign the final document number and finalize it."
                                        action={
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={<CheckCircleOutlined />}
                                                onClick={() => setApproveModalOpen(true)}
                                            >
                                                Approve
                                            </Button>
                                        }
                                        style={{ marginBottom: 0 }}
                                    />
                                )}
                                <SummaryCards items={summaryItems} />

                                <Card title={`${title} Details`} className="payment-record-show__card">
                                    <InfoTable rows={overviewRows} />
                                </Card>

                                {mainCards}
                            </main>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                title="Approve Transaction"
                open={approveModalOpen}
                onOk={handleApprove}
                confirmLoading={approveLoading}
                onCancel={() => setApproveModalOpen(false)}
                okText="Confirm Approve"
                okButtonProps={{ type: 'primary' }}
            >
                <p>Are you sure you want to approve this transaction?</p>
                <p>The final document number will be assigned after approval and the transaction will be finalized.</p>
            </Modal>

            {/* ── Payment Link Drawer ──────────────────────────────────── */}
            {normalizedDocumentType === 'invoice' && (
                <PaymentLinkDrawer
                    open={paymentLinkOpen}
                    onClose={() => setPaymentLinkOpen(false)}
                    invoiceId={id}
                    invoiceNo={documentNumber}
                    currency={record?.currency}
                />
            )}

            <Drawer
                title="Print Preview"
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                width={900}
                destroyOnClose={false}
                styles={{
                    body: {
                        background: token.colorBgLayout,
                        padding: 16,
                    },
                }}
            >
                {!SUPPORTED_PAYMENT_IN_DOCUMENT_TYPES.has(normalizedDocumentType) ? (
                    <Alert
                        type="warning"
                        showIcon
                        message="Unsupported document type"
                        description={`Printing is configured for Quotation, Proforma Invoice, Sales Order, Invoice, Payment, and Credit Note. Current type: ${documentType}`}
                    />
                ) : printTemplateLoading ? (
                    <Skeleton active paragraph={{ rows: 12 }} />
                ) : !record ? (
                    <Empty description="No record found for printing" />
                ) : (
                    <DynamicPrintTemplatePreview
                        record={record}
                        documentType={normalizedDocumentType}
                        title={title}
                        template={printTemplate}
                        templateError={printTemplateError}
                        companyInfo={companyInfo}
                    />
                )}
            </Drawer>
        </AuthenticatedLayout>
    );
}
