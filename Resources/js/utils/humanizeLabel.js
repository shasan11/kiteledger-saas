const SPECIAL_WORDS = {
  sms: 'SMS',
  api: 'API',
  gst: 'GST',
  vat: 'VAT',
  pdf: 'PDF',
  html: 'HTML',
  fy: 'Fiscal Year',
  hrm: 'HRM',
  crm: 'CRM',
  pos: 'POS',
  sku: 'SKU',
  id: 'ID',
  url: 'URL',
};

export function humanizeLabel(value = '') {
  const text = String(value ?? '').trim();
  if (!text) return '';

  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      const key = word.toLowerCase();
      if (SPECIAL_WORDS[key]) return SPECIAL_WORDS[key];
      return key.charAt(0).toUpperCase() + key.slice(1);
    })
    .join(' ');
}

export function humanizeOptions(values = []) {
  return values.map((value) => ({ value, label: humanizeLabel(value) }));
}
