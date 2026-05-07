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
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title } = Typography;
const { useToken } = theme;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const APPROVED_STATUSES = new Set(['posted', 'approved', 'issued', 'confirmed', 'accepted', 'fulfilled', 'paid', 'part_paid', 'received']);

const humanize = (value = '') =>
    String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const asArray = (value) => (Array.isArray(value) ? value : []);

export const formatDate = (value) => {
    if (!value) return '-';

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
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
    const prefix =
        currency?.symbol ||
        currency?.code ||
        currency?.name ||
        '';

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
            : normalized === 'cancelled' || normalized === 'void' || normalized === 'rejected'
                ? 'error'
                : APPROVED_STATUSES.has(normalized)
                    ? 'success'
                    : 'processing';

    return <Tag color={color}>{humanize(normalized)}</Tag>;
};

export const approvalTag = (record) => {
    const approved = record?.approved;

    if (approved === true) return <Tag color="success">Approved</Tag>;
    if (approved === false) return <Tag color="warning">Draft</Tag>;

    return APPROVED_STATUSES.has(String(record?.status || '').toLowerCase())
        ? <Tag color="success">Approved</Tag>
        : <Tag>Draft</Tag>;
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
    purchase_order: {
        numberLabel: 'Purchase Order No',
        numberKeys: ['purchase_order_no', 'code'],
        dateLabel: 'Purchase Order Date',
        dateKeys: ['purchase_order_date', 'date'],
        dueLabel: 'Reference',
        dueKeys: ['reference'],
        linesKeys: ['purchaseOrderLines', 'purchase_order_lines', 'items'],
    },
    purchase_bill: {
        numberLabel: 'Purchase Bill No',
        numberKeys: ['bill_no', 'code'],
        dateLabel: 'Bill Date',
        dateKeys: ['bill_date', 'date'],
        dueLabel: 'Due Date',
        dueKeys: ['due_date'],
        linesKeys: ['purchaseBillLines', 'purchase_bill_lines', 'items'],
    },
    expense: {
        numberLabel: 'Expense No',
        numberKeys: ['expense_no', 'code'],
        dateLabel: 'Expense Date',
        dateKeys: ['expense_date', 'date'],
        dueLabel: 'Due Date',
        dueKeys: ['due_date'],
        linesKeys: ['expenseLines', 'expense_lines', 'items'],
    },
    debit_note: {
        numberLabel: 'Debit Note No',
        numberKeys: ['debit_note_no', 'code'],
        dateLabel: 'Debit Note Date',
        dateKeys: ['debit_note_date', 'date'],
        dueLabel: 'Reference',
        dueKeys: ['reference'],
        linesKeys: ['debitNoteLines', 'debit_note_lines', 'items'],
    },
    supplier_payment: {
        numberLabel: 'Payment No',
        numberKeys: ['payment_no', 'code'],
        dateLabel: 'Payment Date',
        dateKeys: ['payment_date', 'date'],
        dueLabel: 'Reference',
        dueKeys: ['reference'],
        linesKeys: ['supplierPaymentLines', 'supplier_payment_lines', 'items'],
    },
};

const getDocumentConfig = (documentType) => documentTypeConfig[documentType] || documentTypeConfig.invoice;

const getLines = (record, documentType) => {
    const keys = getDocumentConfig(documentType).linesKeys;
    for (const key of keys) {
        if (Array.isArray(record?.[key])) return record[key];
    }

    return [];
};

const getInvoicePaymentAllocations = (record) =>
    firstPresent(record?.customerPaymentLines, record?.customer_payment_lines, []) || [];

const getPurchaseBillPaymentAllocations = (record) =>
    firstPresent(record?.supplierPaymentLines, record?.supplier_payment_lines, []) || [];

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

const accountName = (row) =>
    getRelationName(row?.chartOfAccount || row?.chart_of_account) !== '-'
        ? getRelationName(row?.chartOfAccount || row?.chart_of_account)
        : '-';

function InfoTable({ rows = [] }) {
    return (
        <table className="payment-record-show__info-table">
            <tbody>
                {rows.filter(Boolean).map((row) => (
                    <tr key={row.label}>
                        <th>{row.label}</th>
                        <td>{row.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SummaryRail({ title, documentNumber, total, rows }) {
    return (
        <aside className="payment-record-show__rail">
            <div className="payment-record-show__entity">
                <div className="payment-record-show__entity-text">
                    <Title level={4}>{documentNumber}</Title>
                    <Text type="secondary">{title}</Text>
                </div>
            </div>

            <div className="payment-record-show__amount">
                <Text type="secondary">Document Total</Text>
                <strong>{total}</strong>
            </div>

            <InfoTable rows={rows} />
        </aside>
    );
}

function SummaryCards({ items = [] }) {
    return (
        <div className="payment-record-show__summary">
            {items.filter(Boolean).map((item) => (
                <Card key={item.label} className="payment-record-show__summary-card">
                    <Text type="secondary">{item.label}</Text>
                    <strong>{item.value}</strong>
                </Card>
            ))}
        </div>
    );
}

function buildRailRows(record, documentType) {
    const config = getDocumentConfig(documentType);
    const isPurchase = ['purchase_order', 'purchase_bill', 'expense', 'debit_note', 'supplier_payment'].includes(documentType);
    const partyLabel = isPurchase ? 'Supplier' : documentType === 'expense' ? 'Party' : 'Customer';

    return [
        { label: config.numberLabel, value: getDocumentNumber(record, documentType, config.numberLabel) },
        { label: config.dateLabel, value: formatDate(getDocumentDate(record, documentType)) },
        { label: partyLabel, value: getRelationName(record?.contact) },
        record?.warehouse ? { label: 'Warehouse', value: getRelationName(record.warehouse) } : null,
        { label: 'Currency', value: firstPresent(record?.currency?.code, record?.currency?.symbol, getRelationName(record?.currency)) || '-' },
        { label: 'Status', value: cleanStatusTag(record?.status) },
        { label: 'Approval', value: approvalTag(record) },
        isShort(record?.notes) ? { label: 'Notes', value: record.notes } : null,
    ];
}

function buildOverviewRows(record, documentType) {
    const config = getDocumentConfig(documentType);
    const isPurchase = ['purchase_order', 'purchase_bill', 'expense', 'debit_note', 'supplier_payment'].includes(documentType);
    const partyLabel = isPurchase ? 'Supplier' : documentType === 'expense' ? 'Party' : 'Customer';

    const rows = [
        { label: config.numberLabel, value: getDocumentNumber(record, documentType, config.numberLabel) },
        { label: config.dateLabel, value: formatDate(getDocumentDate(record, documentType)) },
        { label: partyLabel, value: getRelationName(record?.contact) },
        { label: config.dueLabel, value: config.dueLabel === 'Reference' ? (getDueLikeValue(record, documentType) || '-') : formatDate(getDueLikeValue(record, documentType)) },
        config.dueLabel !== 'Reference' ? { label: 'Reference', value: firstPresent(record?.reference, record?.reference_no) || '-' } : null,
        record?.warehouse ? { label: 'Warehouse', value: getRelationName(record.warehouse) } : null,
        record?.creditTerm || record?.credit_term ? { label: 'Credit Term', value: getRelationName(record?.creditTerm || record?.credit_term) } : null,
        { label: 'Currency', value: firstPresent(record?.currency?.code, record?.currency?.symbol, getRelationName(record?.currency)) || '-' },
        { label: 'Status', value: cleanStatusTag(record?.status) },
        { label: 'Approval Status', value: approvalTag(record) },
        documentType === 'customer_payment' || documentType === 'supplier_payment'
            ? { label: 'Payment Account', value: getRelationName(record?.account) }
            : null,
        documentType === 'customer_payment'
            ? { label: 'Payment Method', value: firstPresent(record?.payment_method, record?.method) || '-' }
            : null,
        documentType === 'supplier_payment'
            ? { label: 'Payment Method', value: firstPresent(record?.method, record?.payment_method) || '-' }
            : null,
        documentType === 'customer_payment' || documentType === 'supplier_payment'
            ? { label: 'Bank Charges Account', value: getRelationName(record?.bankChargesAccount || record?.bank_charges_account) }
            : null,
        documentType === 'customer_payment' || documentType === 'supplier_payment' || documentType === 'expense'
            ? { label: 'TDS Account', value: getRelationName(record?.tdsChargesAccount || record?.tds_charges_account) }
            : null,
        isShort(record?.notes) ? { label: 'Notes', value: record.notes } : null,
    ];

    return rows.filter(Boolean);
}

function buildSummaryCards(record, documentType) {
    const currency = record?.currency;
    const total = numeric(firstPresent(record?.grand_total, record?.total, record?.amount));
    const paid = numeric(firstPresent(record?.paid_total, record?.paid_amount));
    const balance = numeric(firstPresent(record?.balance_due, Math.max(total - paid, 0)));

    if (documentType === 'invoice' || documentType === 'purchase_bill') {
        return [
            { label: 'Total Amount', value: formatMoney(total, currency) },
            { label: 'Paid Total', value: formatMoney(paid, currency) },
            { label: 'Balance Due', value: formatMoney(balance, currency) },
        ];
    }

    if (documentType === 'customer_payment' || documentType === 'supplier_payment') {
        const lines = getLines(record, documentType);
        const allocated = lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0);
        const bankCharges = numeric(record?.bank_charges);
        const tdsCharges = numeric(record?.tds_charges);

        return [
            { label: 'Payment Amount', value: formatMoney(total, currency) },
            { label: 'Allocated Amount', value: formatMoney(allocated, currency) },
            { label: 'Unallocated Amount', value: formatMoney(Math.max(total - allocated, 0), currency) },
            bankCharges ? { label: 'Bank Charges', value: formatMoney(bankCharges, currency) } : null,
            tdsCharges ? { label: 'TDS Charges', value: formatMoney(tdsCharges, currency) } : null,
        ];
    }

    if (documentType === 'expense') {
        return [
            { label: 'Total Amount', value: formatMoney(total, currency) },
            numeric(record?.tds_charges) ? { label: 'TDS Charges', value: formatMoney(record?.tds_charges, currency) } : null,
        ];
    }

    return [
        { label: 'Total Amount', value: formatMoney(total, currency) },
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
                locale={{ emptyText: <Empty description={emptyText} /> }}
                summary={summary}
            />
        </Card>
    );
}

function buildMainCards(record, documentType) {
    const currency = record?.currency;
    const lines = getLines(record, documentType);
    const cards = [];

    const salesLikeColumns = [
        {
            title: 'Product / Item',
            key: 'product',
            width: 220,
            render: (_, row) => lineProductName(row),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 240,
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
            render: (_, row) => formatMoney(firstPresent(row?.line_total, row?.amount), currency),
        },
    ];

    if (['quotation', 'proforma_invoice', 'sales_order', 'invoice', 'credit_note', 'purchase_order', 'purchase_bill', 'debit_note'].includes(documentType)) {
        const titleMap = {
            quotation: 'Quotation Lines',
            proforma_invoice: 'Proforma Invoice Lines',
            sales_order: 'Sales Order Lines',
            invoice: 'Invoice Lines',
            credit_note: 'Credit Note Lines',
            purchase_order: 'Purchase Order Lines',
            purchase_bill: 'Purchase Bill Lines',
            debit_note: 'Debit Note Lines',
        };

        cards.push(
            lineTable(
                titleMap[documentType],
                salesLikeColumns.map((column) =>
                    documentType === 'credit_note' || documentType === 'debit_note'
                        ? (column.key === 'discount_percent' ? null : column)
                        : column
                ).filter(Boolean),
                lines,
                'No line items',
                () => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={7}>
                            Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                            {formatMoney(lines.reduce((sum, row) => sum + numeric(firstPresent(row?.line_total, row?.amount)), 0), currency)}
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )
            )
        );
    }

    if (documentType === 'expense') {
        cards.push(
            lineTable(
                'Expense Lines',
                [
                    {
                        title: 'Account / Expense Head',
                        key: 'account',
                        width: 220,
                        render: (_, row) => accountName(row),
                    },
                    {
                        title: 'Description',
                        dataIndex: 'description',
                        key: 'description',
                        width: 280,
                        render: (value) => value || '-',
                    },
                    {
                        title: 'Amount',
                        key: 'amount',
                        width: 130,
                        align: 'right',
                        render: (_, row) => formatMoney(row?.amount, currency),
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
                        render: (_, row) => formatMoney(firstPresent(row?.line_total, row?.amount), currency),
                    },
                ],
                lines,
                'No expense lines',
                () => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5}>
                            Total
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                            {formatMoney(lines.reduce((sum, row) => sum + numeric(firstPresent(row?.line_total, row?.amount)), 0), currency)}
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )
            )
        );
    }

    if (documentType === 'invoice') {
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
                        render: (_, row) => formatDate(firstPresent(row?.customerPayment?.payment_date, row?.customer_payment?.payment_date)),
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
                        render: (_, row) => formatMoney(firstPresent(row?.customerPayment?.amount, row?.customer_payment?.amount), currency),
                    },
                    {
                        title: 'Status',
                        key: 'status',
                        render: (_, row) => cleanStatusTag(firstPresent(row?.customerPayment?.status, row?.customer_payment?.status)),
                    },
                ],
                allocations,
                'No payment allocations'
            )
        );
    }

    if (documentType === 'purchase_bill') {
        const allocations = asArray(getPurchaseBillPaymentAllocations(record));

        cards.push(
            lineTable(
                'Supplier Payment Allocations',
                [
                    {
                        title: 'Payment No',
                        key: 'payment_no',
                        render: (_, row) => getRelationName(row?.supplierPayment || row?.supplier_payment),
                    },
                    {
                        title: 'Payment Date',
                        key: 'payment_date',
                        render: (_, row) => formatDate(firstPresent(row?.supplierPayment?.payment_date, row?.supplier_payment?.payment_date)),
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
                        render: (_, row) => formatMoney(firstPresent(row?.supplierPayment?.amount, row?.supplier_payment?.amount), currency),
                    },
                    {
                        title: 'Status',
                        key: 'status',
                        render: (_, row) => cleanStatusTag(firstPresent(row?.supplierPayment?.status, row?.supplier_payment?.status)),
                    },
                ],
                allocations,
                'No supplier payment allocations'
            )
        );
    }

    if (documentType === 'customer_payment') {
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
                            {formatMoney(lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0), currency)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} colSpan={2} />
                    </Table.Summary.Row>
                )
            )
        );
    }

    if (documentType === 'supplier_payment') {
        cards.push(
            lineTable(
                'Payment Allocation Lines',
                [
                    {
                        title: 'Purchase Bill No',
                        key: 'purchase_bill',
                        render: (_, row) => getRelationName(row?.purchaseBill || row?.purchase_bill),
                    },
                    {
                        title: 'Bill Date',
                        key: 'bill_date',
                        render: (_, row) => formatDate(firstPresent(row?.purchaseBill?.bill_date, row?.purchase_bill?.bill_date)),
                    },
                    {
                        title: 'Allocated Amount',
                        key: 'allocated_amount',
                        align: 'right',
                        render: (_, row) => formatMoney(row?.allocated_amount, currency),
                    },
                    {
                        title: 'Bill Total',
                        key: 'bill_total',
                        align: 'right',
                        render: (_, row) => formatMoney(firstPresent(row?.purchaseBill?.total, row?.purchase_bill?.total), currency),
                    },
                    {
                        title: 'Balance Due',
                        key: 'balance_due',
                        align: 'right',
                        render: (_, row) => formatMoney(firstPresent(row?.purchaseBill?.balance_due, row?.purchase_bill?.balance_due), currency),
                    },
                ],
                lines,
                'No purchase bill allocations',
                () => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}>
                            Total Allocated
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                            {formatMoney(lines.reduce((sum, row) => sum + numeric(row?.allocated_amount), 0), currency)}
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
}) {
    const { token } = useToken();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [printOpen, setPrintOpen] = useState(false);

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

    const documentNumber = useMemo(
        () => getDocumentNumber(record, documentType, title),
        [record, documentType, title]
    );

    const totalDisplay = useMemo(
        () => formatMoney(firstPresent(record?.grand_total, record?.total, record?.amount), record?.currency),
        [record]
    );

    const railRows = useMemo(() => buildRailRows(record, documentType), [record, documentType]);
    const overviewRows = useMemo(() => buildOverviewRows(record, documentType), [record, documentType]);
    const summaryItems = useMemo(() => buildSummaryCards(record, documentType), [record, documentType]);
    const mainCards = useMemo(() => buildMainCards(record, documentType), [record, documentType]);

    const uiVars = {
        '--payment-record-show-bg': token.colorBgLayout,
        '--payment-record-show-surface': token.colorBgContainer,
        '--payment-record-show-surface-soft': token.colorFillAlter,
        '--payment-record-show-surface-muted': token.colorFillQuaternary,
        '--payment-record-show-border': token.colorBorderSecondary,
        '--payment-record-show-text': token.colorText,
        '--payment-record-show-text-secondary': token.colorTextSecondary,
        '--payment-record-show-radius': `${token.borderRadius}px`,
        '--payment-record-show-padding': `${token.padding}px`,
        '--payment-record-show-padding-sm': `${token.paddingSM}px`,
        '--payment-record-show-padding-xs': `${token.paddingXS}px`,
        '--payment-record-show-font-size-sm': `${token.fontSizeSM}px`,
        '--payment-record-show-font-size': `${token.fontSize}px`,
        '--payment-record-show-font-size-lg': `${token.fontSizeLG}px`,
    };

    return (
        <AuthenticatedLayout>
            <Head title={documentNumber || title} />

            <style>{`
                .payment-record-show {
                    min-height: calc(100vh - 64px);
                    background: var(--payment-record-show-bg);
                    color: var(--payment-record-show-text);
                }

                .payment-record-show__bar {
                    min-height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--payment-record-show-padding-sm);
                    padding: 0 var(--payment-record-show-padding-sm);
                    background: var(--payment-record-show-surface);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__body {
                    display: grid;
                    grid-template-columns: 248px minmax(0, 1fr);
                    gap: var(--payment-record-show-padding-xs);
                }

                .payment-record-show__rail {
                    min-height: calc(100vh - 108px);
                    background: var(--payment-record-show-surface);
                    border-right: 1px solid var(--payment-record-show-border);
                    padding: var(--payment-record-show-padding-sm);
                }

                .payment-record-show__entity {
                    padding-bottom: var(--payment-record-show-padding-sm);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__entity-text h4 {
                    margin: 0 !important;
                    font-size: var(--payment-record-show-font-size) !important;
                    line-height: 1.25 !important;
                    word-break: break-word;
                }

                .payment-record-show__amount {
                    padding: var(--payment-record-show-padding-sm) 0;
                    border-bottom: 1px solid var(--payment-record-show-border);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .payment-record-show__amount strong {
                    font-size: var(--payment-record-show-font-size-lg);
                }

                .payment-record-show__main {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--payment-record-show-padding-sm);
                    padding: var(--payment-record-show-padding-xs);
                }

                .payment-record-show__summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: var(--payment-record-show-padding-xs);
                }

                .payment-record-show__summary-card.ant-card,
                .payment-record-show__card.ant-card {
                    border-color: var(--payment-record-show-border);
                    box-shadow: none;
                    border-radius: var(--payment-record-show-radius);
                }

                .payment-record-show__summary-card .ant-card-body {
                    min-height: 82px;
                    padding: var(--payment-record-show-padding-sm);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .payment-record-show__summary-card strong {
                    font-size: var(--payment-record-show-font-size-lg);
                }

                .payment-record-show__card .ant-card-head {
                    min-height: 40px;
                    padding: 0 var(--payment-record-show-padding-sm);
                    border-bottom: 1px solid var(--payment-record-show-border);
                }

                .payment-record-show__card .ant-card-head-title {
                    font-size: var(--payment-record-show-font-size-sm);
                    font-weight: 700;
                }

                .payment-record-show__card .ant-card-body {
                    padding: var(--payment-record-show-padding-sm);
                    min-width: 0;
                }

                .payment-record-show__info-table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    border: 1px solid var(--payment-record-show-border);
                    font-size: var(--payment-record-show-font-size-sm);
                }

                .payment-record-show__info-table th,
                .payment-record-show__info-table td {
                    padding: var(--payment-record-show-padding-xs) var(--payment-record-show-padding-sm);
                    border: 1px solid var(--payment-record-show-border);
                    vertical-align: top;
                    word-break: break-word;
                }

                .payment-record-show__info-table th {
                    width: 34%;
                    background: var(--payment-record-show-surface-soft);
                    color: var(--payment-record-show-text-secondary);
                    font-weight: 600;
                    text-align: left;
                }

                .payment-record-show .ant-table {
                    font-size: var(--payment-record-show-font-size-sm);
                }

                .payment-record-show .ant-table-wrapper .ant-table-thead > tr > th {
                    padding: var(--payment-record-show-padding-xs) var(--payment-record-show-padding-sm) !important;
                    background: var(--payment-record-show-surface-muted) !important;
                    border-color: var(--payment-record-show-border) !important;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .payment-record-show .ant-table-wrapper .ant-table-tbody > tr > td,
                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    padding: var(--payment-record-show-padding-xs) var(--payment-record-show-padding-sm) !important;
                    border-color: var(--payment-record-show-border) !important;
                }

                .payment-record-show .ant-table-wrapper .ant-table-summary > tr > td {
                    background: var(--payment-record-show-surface-soft);
                    font-weight: 700;
                }

                .payment-record-show__state {
                    padding: var(--payment-record-show-padding);
                }

                @media (max-width: 992px) {
                    .payment-record-show__body {
                        grid-template-columns: 1fr;
                    }

                    .payment-record-show__rail {
                        min-height: auto;
                        border-right: 0;
                        border-bottom: 1px solid var(--payment-record-show-border);
                    }
                }
            `}</style>

            <div className="payment-record-show" style={uiVars}>
                <div className="payment-record-show__bar">
                    <Space size={8}>
                        <Link href={route(backRoute)}>
                            <Button type="text" size="small" icon={<ArrowLeftOutlined />}>
                                {backLabel}
                            </Button>
                        </Link>

                        <Title level={5} style={{ margin: 0 }}>
                            {title}
                        </Title>

                        {!loading && record ? <Text type="secondary">{documentNumber}</Text> : null}
                        {!loading && record ? cleanStatusTag(record?.status) : null}
                        {!loading && record ? approvalTag(record) : null}
                    </Space>

                    <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintOpen(true)}>
                        Print Preview
                    </Button>
                </div>

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

            <Drawer
                title="Print Preview"
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                width={720}
            >
                <Text>Print template will be configured later.</Text>
            </Drawer>
        </AuthenticatedLayout>
    );
}
