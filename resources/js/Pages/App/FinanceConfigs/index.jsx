import React from 'react';
import { Button, Tag } from 'antd';
import dayjs from 'dayjs';

export const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
export const formatMoney = (value, locale = 'en-US') => toNumber(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const renderStatusTag = (statusColorMap = {}, fallback = 'draft') => (value, record) => {
  const status = value || (record?.approved ? 'approved' : fallback);
  return <Tag color={statusColorMap[status] || 'default'}>{String(status).toUpperCase()}</Tag>;
};
export const renderApprovedTag = (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Approved' : 'Pending'}</Tag>;
export const renderOverdueTag = (dueDate, record) => {
  const date = dueDate || record?.due_date;
  if (!date) return <span style={{ color: '#bbb' }}>—</span>;
  const overdue = dayjs(date).isBefore(dayjs(), 'day') && !['paid', 'posted', 'approved'].includes(record?.status);
  return overdue ? <Tag color="red">Overdue</Tag> : <Tag>On time</Tag>;
};
export const buildStandardFilters = ({ dateKey = 'date', dueDateKey = 'due_date', partyKey = 'party_id', currencyKey = 'currency_id', statusKey = 'status', approvedKey = 'approved' } = {}) => [
  { key: dateKey, label: 'Date', type: 'date' }, { key: dueDateKey, label: 'Due Date', type: 'date' }, { key: partyKey, label: 'Party', type: 'text' }, { key: currencyKey, label: 'Currency', type: 'text' }, { key: statusKey, label: 'Status', type: 'text' }, { key: approvedKey, label: 'Approved', type: 'boolean' },
];
export const STATUS_TABS_BY_MODULE = {
  invoiceLike: [{ key: 'draft', label: 'Draft', params: { status: 'draft' } }, { key: 'approved', label: 'Approved', params: { status: 'approved' } }, { key: 'all', label: 'All', params: {} }],
  paymentLike: [{ key: 'draft', label: 'Draft', params: { status: 'draft' } }, { key: 'posted', label: 'Posted', params: { status: 'posted' } }, { key: 'all', label: 'All', params: {} }],
  noteLike: [{ key: 'draft', label: 'Draft', params: { status: 'draft' } }, { key: 'approved', label: 'Approved', params: { status: 'approved' } }, { key: 'cancelled', label: 'Cancelled', params: { status: 'cancelled' } }, { key: 'all', label: 'All', params: {} }],
  orderLike: [{ key: 'draft', label: 'Draft', params: { status: 'draft' } }, { key: 'sent', label: 'Sent', params: { status: 'sent' } }, { key: 'cancelled', label: 'Cancelled', params: { status: 'cancelled' } }, { key: 'all', label: 'All', params: {} }],
};
export const buildRowActions = ({ onPrint, onPost, onApprove, onVoid, onReceivePay, onApplyCredit, onApplyDebit, onConvert }) => [onPrint && { key: 'print', label: 'Print', onClick: onPrint }, onPost && { key: 'post', label: 'Post', onClick: onPost }, onApprove && { key: 'approve', label: 'Approve', onClick: onApprove }, onVoid && { key: 'void', label: 'Void', onClick: onVoid, danger: true }, onReceivePay && { key: 'receive-pay', label: 'Receive Pay', onClick: onReceivePay }, onApplyCredit && { key: 'apply-credit', label: 'Apply Credit', onClick: onApplyCredit }, onApplyDebit && { key: 'apply-debit', label: 'Apply Debit', onClick: onApplyDebit }, onConvert && { key: 'convert', label: 'Convert', onClick: onConvert }].filter(Boolean);
export const renderRowActions = (actions, record) => <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions.map((action) => <Button key={action.key} size="small" danger={!!action.danger} onClick={() => action.onClick(record)}>{action.label}</Button>)}</div>;
