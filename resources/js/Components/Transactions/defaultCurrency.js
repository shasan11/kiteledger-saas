import { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const firstRow = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  if (Array.isArray(payload)) return payload[0] || null;
  return null;
};

export const getCurrencyId = (currency) => {
  if (!currency) return null;
  if (typeof currency === 'object') return currency.id ?? currency.value ?? null;
  return currency;
};

export const getDefaultCurrencyRate = () => 1;

export const exchangeRateLabel = (currency) => `Exchange Rate to ${currency?.code || 'Base Currency'}`;

export function useBaseCurrency(enabled = true) {
  const [currency, setCurrency] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const response = await axios.get(api('/api/currencies/'), {
          params: { is_base: true, active: true, page_size: 1 },
        });
        const baseCurrency = firstRow(response.data);
        if (!cancelled && baseCurrency) setCurrency(baseCurrency);
      } catch {
        // Leave currency empty if configuration cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return currency;
}

export function useDefaultCurrency(enabled = true) {
  const [currency, setCurrency] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const settings = await axios.get(api('/api/app-settings/current'));
        const data = settings.data || {};
        const configured = data.defaultCurrency || data.default_currency || data.default_currency_id_detail || null;

        if (configured?.id) {
          if (!cancelled) setCurrency(configured);
          return;
        }

        if (data.default_currency_id) {
          const response = await axios.get(api(`/api/currencies/${data.default_currency_id}/`));
          if (!cancelled && response.data?.id) setCurrency(response.data);
          return;
        }
      } catch {
        // Fall back to base currency below.
      }

      try {
        const response = await axios.get(api('/api/currencies/'), {
          params: { is_base: true, active: true, page_size: 1 },
        });
        const baseCurrency = firstRow(response.data);
        if (!cancelled && baseCurrency) setCurrency(baseCurrency);
      } catch {
        // Leave currency empty if configuration cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return currency;
}

export function applyDefaultCurrency(form, currency, setCurrencyDetail) {
  const currencyId = getCurrencyId(currency);
  if (!form || !currencyId || form.getFieldValue('currency_id')) return;

  form.setFieldsValue({ currency_id: currencyId, exchange_rate: getDefaultCurrencyRate() });
  setCurrencyDetail?.(currency);
}
