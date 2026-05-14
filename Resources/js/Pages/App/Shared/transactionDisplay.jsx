import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

const fallbackDefaultCurrency = {
  code: 'NPR',
  symbol: 'Rs.',
  decimal_places: 2,
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, decimals = 2) =>
  toNumber(value).toLocaleString('en-NP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const getCurrency = (record) =>
  record?.currency ||
  record?.currency_id_detail ||
  record?.currency_detail ||
  null;

const getCurrencySymbol = (currency) =>
  currency?.symbol || currency?.code || currency?.name || '';

export const renderAmountWithDefaultCurrency = (
  value,
  record,
  options = {}
) => {
  const amount = toNumber(value);
  const currency = getCurrency(record);
  const defaultCurrency = {
    ...fallbackDefaultCurrency,
    ...(options.defaultCurrency || {}),
  };
  const exchangeRate = toNumber(
    record?.exchange_rate ??
      record?.exchange_rate_to_npr ??
      record?.rate_to_default ??
      1
  ) || 1;
  const decimals = Number(currency?.decimal_places ?? 2);
  const defaultDecimals = Number(defaultCurrency.decimal_places ?? 2);
  const currencyPrefix = getCurrencySymbol(currency);
  const defaultPrefix = getCurrencySymbol(defaultCurrency);

  return (
    <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
      <Text strong>
        {currencyPrefix ? `${currencyPrefix} ` : ''}
        {formatNumber(amount, decimals)}
      </Text>
      <br />
      <Text type="secondary" style={{ fontSize: 11 }}>
        {defaultPrefix ? `${defaultPrefix} ` : ''}
        {formatNumber(amount * exchangeRate, defaultDecimals)}
        {' '}
        @ {formatNumber(exchangeRate, 6)}
      </Text>
    </div>
  );
};

export const requireVoidReason = (reason) => String(reason || '').trim().length > 0;
