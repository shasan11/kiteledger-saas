import GuestLayout from '@/Layouts/GuestLayout';
import { formatDate, formatMoney } from '@/Components/Central/formatters';
import { Head } from '@inertiajs/react';
import { Alert, Button, Divider, Space, Table, Typography } from 'antd';
import axios from 'axios';
import { useState } from 'react';

export default function PublicInvoice({ invoice, gateways = [], checkoutUrl, processingUrl, state }) {
    const [loading, setLoading] = useState(null);
    const pay = async (gateway) => {
        setLoading(gateway.slug);
        try {
            const { data } = await axios.post(checkoutUrl, { gateway: gateway.slug });
            if (data.checkout_url) { window.location.assign(data.checkout_url); return; }
            if (gateway.slug === 'razorpay') {
                await loadScript('https://checkout.razorpay.com/v1/checkout.js');
                const checkout = new window.Razorpay({ key: data.public_key, order_id: data.transaction_id, amount: data.amount, currency: data.currency, name: 'KiteLedger', description: `Invoice ${data.invoice_number}`, handler: () => window.location.assign(processingUrl), modal: { ondismiss: () => setLoading(null) } });
                checkout.open();
            }
        } catch { setLoading(null); }
    };
    const columns = [{title:'Description',dataIndex:'description'},{title:'Quantity',dataIndex:'quantity'},{title:'Amount',render:(_,row)=>formatMoney(row.amount,invoice.currency)}];
    return <GuestLayout><Head title={`Invoice ${invoice.invoice_number}`}/><Typography.Title level={3}>Invoice {invoice.invoice_number}</Typography.Title>{state === 'success' && <Alert type="success" showIcon message="Payment received" description="The payment is being reconciled. Refresh this page if the balance has not updated yet." style={{marginBottom:16}}/>}{state === 'processing' && <Alert type="info" showIcon message="Payment submitted" description="The provider confirmation is being processed." style={{marginBottom:16}}/>}{state === 'cancelled' && <Alert type="warning" showIcon message="Payment was cancelled" style={{marginBottom:16}}/>}<Typography.Paragraph><strong>{invoice.tenant?.legal_name || invoice.tenant?.company_name}</strong><br/>Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}</Typography.Paragraph><Table size="small" pagination={false} rowKey="id" dataSource={invoice.lines || []} columns={columns}/><Divider/><Space direction="vertical" style={{width:'100%'}}><Typography.Title level={4}>Balance: {formatMoney(invoice.balance,invoice.currency)}</Typography.Title>{invoice.status === 'paid' ? <Alert type="success" showIcon message="This invoice is paid."/> : gateways.length ? gateways.map(gateway => gateway.manual ? <Alert key={gateway.slug} type="info" showIcon message={gateway.name} description={gateway.instructions || 'Contact the billing team for manual payment instructions.'}/> : <Button key={gateway.slug} block type="primary" loading={loading === gateway.slug} onClick={() => pay(gateway)}>Pay with {gateway.name}</Button>) : <Alert type="warning" showIcon message="No online payment method is available for this currency."/>}</Space></GuestLayout>;
}

function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
}
