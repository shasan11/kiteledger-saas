import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';

const api = (path) => `${BACKEND}${path}`;

const fallbackCurrency = {
  code: 'USD',
  symbol: '$',
  decimal_places: 2,
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const relationLabel = (value) => {
  if (!value) return '-';
  if (typeof value !== 'object') return String(value);
  return value.label || value.display_name || value.name || value.account_name || value.bank_name || value.code || '-';
};

export function useBaseCurrency() {
  const [currency, setCurrency] = useState(fallbackCurrency);

  useEffect(() => {
    let mounted = true;

    axios
      .get(api('/api/currencies/?is_base=true&active=true&page_size=1'))
      .then((response) => {
        const first = response.data?.results?.[0] || (Array.isArray(response.data) ? response.data[0] : null);
        if (mounted && first) {
          setCurrency({
            ...fallbackCurrency,
            ...first,
            symbol: first.symbol || first.code || fallbackCurrency.symbol,
            decimal_places: Number(first.decimal_places ?? fallbackCurrency.decimal_places),
          });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return currency;
}

export function useMoneyFormatter() {
  const currency = useBaseCurrency();

  const formatMoney = useMemo(() => {
    return (value) => {
      const decimals = Number(currency.decimal_places ?? 2);
      return `${currency.symbol || currency.code || ''} ${toNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    };
  }, [currency]);

  return { currency, formatMoney };
}

export { toNumber };
