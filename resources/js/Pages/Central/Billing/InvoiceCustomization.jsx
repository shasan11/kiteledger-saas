import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import { formatDate } from '@/Components/Central/formatters';
import { FilePdfOutlined, MailOutlined, SaveOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Col, ColorPicker, Form, Input, InputNumber, Row, Select, Space, Switch, Tabs, Typography } from 'antd';
import { useState } from 'react';

const groups = [
    { key: 'branding', label: 'Branding', fields: [['invoice_logo', 'Invoice logo', 'image'], ['accent_color', 'Accent color', 'color'], ['safe_font_selection', 'Safe font', 'font'], ['company_legal_name', 'Company legal name'], ['company_address', 'Company address', 'textarea'], ['email', 'Email', 'email'], ['phone', 'Phone'], ['tax_number', 'Tax number'], ['registration_number', 'Registration number']] },
    { key: 'numbering', label: 'Numbering', fields: [['prefix', 'Prefix'], ['suffix', 'Suffix'], ['starting_number', 'Starting number', 'number'], ['minimum_digits', 'Minimum digits', 'number'], ['annual_reset', 'Annual reset', 'switch']] },
    { key: 'content', label: 'Content', fields: [['invoice_title', 'Invoice title'], ['payment_terms', 'Payment terms', 'textarea'], ['notes', 'Default notes', 'textarea'], ['footer', 'Footer', 'textarea'], ['bank_details', 'Bank details', 'textarea'], ['payment_instructions', 'Payment instructions', 'textarea'], ['authorized_signatory', 'Authorized signatory'], ['signature', 'Signature image', 'image'], ['paid_stamp', 'Paid stamp image', 'image'], ['qr_code', 'QR code', 'switch']] },
    { key: 'visibility', label: 'Visibility', fields: [['show_plan', 'Show plan', 'switch'], ['show_subscription_period', 'Show subscription period', 'switch'], ['show_tax', 'Show tax', 'switch'], ['show_discount', 'Show discount', 'switch'], ['show_payment_history', 'Show payment history', 'switch'], ['show_balance', 'Show balance', 'switch'], ['show_billing_address', 'Show billing address', 'switch'], ['show_tenant_tax_number', 'Show tenant tax number', 'switch'], ['show_metadata', 'Show metadata', 'switch']] },
    { key: 'localization', label: 'Localization', fields: [['language', 'Language', 'language'], ['date_format', 'Date format', 'date'], ['number_format', 'Number format', 'numberFormat'], ['currency_format', 'Currency format', 'currencyFormat'], ['tax_label', 'Tax label'], ['due_date_label', 'Due-date label']] },
];

export default function InvoiceCustomization({ values, updatedAt }) {
    const [form] = Form.useForm();
    const [draft, setDraft] = useState(values);
    const save = (next) => router.put(route('central.invoice-customization.update'), { values: next }, { preserveScroll: true });
    const tabItems = groups.map((group) => ({ key: group.key, label: group.label, children: <Row gutter={[14, 0]}>{group.fields.map(([name, label, type = 'text']) => <Col xs={24} md={type === 'textarea' ? 24 : 12} key={name}><InvoiceField name={name} label={label} type={type}/></Col>)}</Row> }));
    return <CentralLayout title="Invoice Customization"><PageHeader eyebrow="Revenue" title="Invoice Customization" description={`Configure new invoice snapshots without changing historical documents. Last updated ${formatDate(updatedAt, true)}.`} actions={<Space><Button icon={<MailOutlined/>} onClick={() => window.open(route('central.invoice-customization.email-preview'), '_blank', 'noopener,noreferrer')}>Email preview</Button><Button icon={<FilePdfOutlined/>} onClick={() => window.open(route('central.invoice-customization.test-pdf'), '_blank', 'noopener,noreferrer')}>Test PDF</Button><Button type="primary" icon={<SaveOutlined/>} onClick={() => form.submit()}>Save</Button></Space>}/><Row gutter={[18, 18]}><Col xs={24} xl={14}><SectionCard><Form form={form} layout="vertical" initialValues={values} onValuesChange={(_, all) => setDraft(all)} onFinish={save}><Tabs items={tabItems}/></Form></SectionCard></Col><Col xs={24} xl={10}><div style={{ position: 'sticky', top: 92 }}><SectionCard title="Live preview" description="Updates immediately. Download Test PDF for the print renderer."><InvoicePreview values={draft}/></SectionCard></div></Col></Row></CentralLayout>;
}

function InvoiceField({ name, label, type }) { if (type === 'switch') return <Form.Item name={name} label={label} valuePropName="checked"><Switch/></Form.Item>; if (type === 'number') return <Form.Item name={name} label={label}><InputNumber min={1} style={{ width: '100%' }}/></Form.Item>; if (type === 'textarea') return <Form.Item name={name} label={label}><Input.TextArea rows={3}/></Form.Item>; if (type === 'color') return <Form.Item name={name} label={label} getValueFromEvent={(color) => color?.toHexString?.() || color}><ColorPicker showText/></Form.Item>; if (type === 'font') return <Form.Item name={name} label={label}><Select options={['DejaVu Sans', 'Helvetica', 'Times New Roman'].map((value) => ({ value, label: value }))}/></Form.Item>; if (type === 'language') return <Form.Item name={name} label={label}><Select options={[['en', 'English'], ['de', 'German'], ['es', 'Spanish'], ['fr', 'French'], ['pt', 'Portuguese'], ['ne', 'Nepali']].map(([value, label]) => ({ value, label }))}/></Form.Item>; if (type === 'date') return <Form.Item name={name} label={label}><Select options={['Y-m-d', 'd/m/Y', 'm/d/Y', 'M j, Y'].map((value) => ({ value, label: value }))}/></Form.Item>; if (type === 'numberFormat') return <Form.Item name={name} label={label}><Select options={['1,234.56', '1.234,56', '1 234,56'].map((value) => ({ value, label: value }))}/></Form.Item>; if (type === 'currencyFormat') return <Form.Item name={name} label={label}><Select options={[{ value: 'code', label: 'USD 1,234.56' }, { value: 'symbol', label: '$1,234.56' }]}/></Form.Item>; return <Form.Item name={name} label={label} extra={type === 'image' ? 'Use an image from the public media library (/storage/...). Remote images are ignored by the PDF renderer.' : undefined}><Input type={type === 'email' ? 'email' : 'text'}/></Form.Item>; }

function InvoicePreview({ values }) {
    const year = new Date().getFullYear();
    const prefix = values.annual_reset ? (String(values.prefix || '').includes('{year}') ? String(values.prefix || '').replaceAll('{year}', year) : `${values.prefix || ''}${year}-`) : values.prefix || '';
    const number = `${prefix}${String(values.starting_number || 1).padStart(values.minimum_digits || 6, '0')}${values.suffix || ''}`;
    const accent = values.accent_color || '#0f766e';
    const money = (amount) => previewMoney(amount, 'USD', values);
    return <div className="central-invoice-preview" style={{ '--invoice-accent': accent, fontFamily: values.safe_font_selection || 'sans-serif' }}>
        <div className="central-invoice-preview__head"><span>{values.invoice_logo && <img src={values.invoice_logo} alt="" style={{ maxWidth: 120, maxHeight: 48 }}/>}<Typography.Title level={3}>{values.invoice_title || 'Invoice'}</Typography.Title><Typography.Text>{values.company_legal_name || 'KiteLedger Ltd.'}</Typography.Text></span><span style={{ textAlign: 'right' }}><strong>{number}</strong><br/><small>Issued 2026-07-24</small><br/><small>{values.due_date_label || 'Due date'} 2026-08-07</small></span></div>
        <div className="central-invoice-preview__addresses"><span><small>FROM</small><strong>{values.company_legal_name || 'KiteLedger Ltd.'}</strong><span>{values.company_address || '123 Finance Avenue'}</span><span>{values.email || 'billing@example.test'}</span></span><span><small>BILL TO</small><strong>Acme Trading Company</strong>{values.show_billing_address !== false && <span>88 Market Street</span>}{values.show_tenant_tax_number !== false && <span>Tax: TAX-88310</span>}</span></div>
        {values.show_plan !== false && <Typography.Paragraph type="secondary">Plan: Professional annual plan</Typography.Paragraph>}
        {values.show_subscription_period !== false && <Typography.Paragraph type="secondary">Subscription period: 2026-07-24 – 2027-07-23</Typography.Paragraph>}
        <table><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody><tr><td>Professional annual plan</td><td>1</td><td>{money(1100)}</td></tr><tr><td>Branch capacity</td><td>3</td><td>{money(150)}</td></tr></tbody></table>
        <div className="central-invoice-preview__totals"><span>Subtotal <strong>{money(1250)}</strong></span>{values.show_discount !== false && <span>Discount <strong>{money(50)}</strong></span>}{values.show_tax !== false && <span>{values.tax_label || 'Tax'} <strong>{money(120)}</strong></span>}<span className="total">Total <strong>{money(1320)}</strong></span>{values.show_payment_history !== false && <span>Paid <strong>{money(320)}</strong></span>}{values.show_balance !== false && <span>Balance <strong>{money(1000)}</strong></span>}</div>
        {(values.payment_terms || values.notes) && <p className="central-invoice-preview__note">{values.payment_terms}<br/>{values.notes}</p>}
        {(values.bank_details || values.payment_instructions || values.qr_code) && <p className="central-invoice-preview__note">{values.bank_details}<br/>{values.payment_instructions}{values.qr_code && <><br/>▦ Invoice QR code</>}</p>}
        {values.signature && <img src={values.signature} alt="Signature" style={{ maxWidth: 100, maxHeight: 45, float: 'right' }}/>}<footer>{values.footer || 'Thank you for your business.'}</footer>
    </div>;
}

function previewMoney(amount, currency, values) {
    const pattern = values.number_format || '1,234.56';
    const [decimal, thousands] = pattern === '1.234,56' ? [',', '.'] : pattern === '1 234,56' ? [',', ' '] : ['.', ','];
    const parts = Number(amount).toFixed(2).split('.');
    const number = `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands)}${decimal}${parts[1]}`;
    const symbols = { USD: '$', EUR: '€', GBP: '£', NPR: 'रु', INR: '₹', AED: 'د.إ' };
    return values.currency_format === 'symbol' ? `${symbols[currency] || `${currency} `}${number}` : `${currency} ${number}`;
}
