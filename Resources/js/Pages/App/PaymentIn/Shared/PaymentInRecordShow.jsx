import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Empty,
    Skeleton,
    Space,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    PrinterOutlined,
    FileTextOutlined,
    DollarCircleOutlined,
    UserOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    EditOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrintablePdfEmailWrapper from '@/Components/PrintableComponent';

const { Text, Title } = Typography;
const { useToken } = theme;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const APPROVED_STATUSES = new Set([
    'posted',
    'approved',
    'issued',
    'confirmed',
    'accepted',
    'fulfilled',
    'paid',
    'part_paid',
    'received',
]);

const SUPPORTED_PAYMENT_IN_DOCUMENT_TYPES = new Set([
    'quotation',
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

const buildPrintContext = (record, documentType, title) => {
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

    return {
        record,

        document: {
            type: normalizedDocumentType,
            title: documentTitle,
            number: getDocumentNumber(record, normalizedDocumentType, title),
            date: formatDate(getDocumentDate(record, normalizedDocumentType)),
            due_date: formatDate(getDueLikeValue(record, normalizedDocumentType)),
            reference: firstPresent(record?.reference, record?.reference_no, '-'),
            status: humanize(record?.status || 'draft'),
            notes: record?.notes || '',
        },

        party: {
            name: getRelationName(record?.contact),
            phone: getPartyPhone(record),
            email: getPartyEmail(record),
            address: getPartyAddress(record),
            pan_no: firstPresent(record?.contact?.pan_no, record?.contact?.vat_no, ''),
            vat_no: firstPresent(record?.contact?.vat_no, record?.contact?.pan_no, ''),
        },

        currency: {
            code: currency?.code || '',
            symbol: currency?.symbol || '',
            name: currency?.name || '',
        },

        totals: {
            subtotal: formatMoney(subtotal, currency),
            discount: formatMoney(discount, currency),
            tax: formatMoney(tax, currency),
            grand_total: formatMoney(total, currency),
            total: formatMoney(total, currency),
            paid: formatMoney(paid, currency),
            balance: formatMoney(balance, currency),
        },

        payment: {
            amount: formatMoney(total, currency),
            allocated_amount: formatMoney(
                lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0),
                currency
            ),
            method: firstPresent(record?.payment_method, record?.method, '-'),
            account: getRelationName(record?.account),
        },

        lines: lines.map((row) => normalizePrintLine(row, currency)),
    };
};

const renderPrintTemplate = (templateHtml, context) => {
    let output = templateHtml || '';

    output = output.replace(/{{#([\w.]+)}}([\s\S]*?){{\/\1}}/g, (_, path, block) => {
        const value = getPath(context, path);

        if (!Array.isArray(value)) return '';

        return value
            .map((item, index) =>
                block.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
                    const cleanKey = key.trim();

                    if (cleanKey === '@index') return index + 1;

                    return escapeHtml(getPath(item, cleanKey, getPath(context, cleanKey, '')));
                })
            )
            .join('');
    });

    output = output.replace(/{{\s*([^}]+)\s*}}/g, (_, path) => {
        return escapeHtml(getPath(context, path.trim(), ''));
    });

    return output;
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
}) {
    const normalizedDocumentType = normalizeDocumentType(documentType);

    const context = useMemo(
        () => buildPrintContext(record, normalizedDocumentType, title),
        [record, normalizedDocumentType, title]
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
            toolbarExtra={
                templateError ? (
                    <Tag color="warning">Using fallback template</Tag>
                ) : (
                    <Tag color="success">{resolvedTemplate.template_key || 'default'}</Tag>
                )
            }
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
}) {
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

                <Space>
                    {editRoute && recordId && (
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
                const response = await axios.get(
                    api(`/api/printing-templates/resolve?document_type=${encodeURIComponent(normalizedDocumentType)}`)
                );

                if (!active) return;

                setPrintTemplate(response.data?.data ?? response.data ?? null);
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

            <Drawer
                title="Print Preview"
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                width={1180}
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
                        description={`Printing is configured only for Quotation, Sales Order, Invoice, Payment, and Credit Note. Current type: ${documentType}`}
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
                    />
                )}
            </Drawer>
        </AuthenticatedLayout>
    );
}