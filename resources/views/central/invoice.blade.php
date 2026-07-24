<!doctype html>
<html lang="{{ data_get($invoice->customization_snapshot, 'invoice_customization.language', 'en') }}">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 34px 38px 52px; }
        body { font-family: {{ data_get($invoice->customization_snapshot, 'invoice_customization.safe_font_selection', 'DejaVu Sans') }}, sans-serif; color: #172033; font-size: 11px; line-height: 1.5; }
        .page-number:after { content: counter(page); }
        h1, h2, p { margin: 0; }
        .brand { display: table; width: 100%; border-bottom: 3px solid {{ data_get($invoice->customization_snapshot, 'invoice_customization.accent_color', '#0f766e') }}; padding-bottom: 18px; }
        .brand > div { display: table-cell; vertical-align: top; }
        .logo { max-width: 150px; max-height: 58px; margin-bottom: 8px; }
        .right { text-align: right; }
        .muted { color: #64748b; }
        .addresses { display: table; width: 100%; margin: 24px 0; }
        .addresses > div { display: table-cell; width: 50%; vertical-align: top; }
        .label { text-transform: uppercase; letter-spacing: .08em; font-size: 9px; font-weight: bold; color: #64748b; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th, td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; }
        .totals { margin-left: auto; width: 45%; margin-top: 18px; }
        .totals .grand th { font-size: 12px; background: #e6fffb; }
        .footer { position: fixed; bottom: -32px; left: 0; right: 0; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #64748b; }
        .notes { margin-top: 24px; padding: 14px; background: #f8fafc; border-radius: 8px; page-break-inside: avoid; }
        .payment { display: table; width: 100%; margin-top: 22px; page-break-inside: avoid; }
        .payment > div { display: table-cell; width: 50%; vertical-align: top; }
        .signature { max-width: 120px; max-height: 50px; }
        .paid-stamp { max-width: 110px; max-height: 70px; margin-top: 12px; }
        .qr { width: 92px; height: 92px; margin-top: 10px; }
        .meta { margin-top: 5px; font-size: 9px; color: #64748b; }
    </style>
</head>
<body>
@php
    $seller = $invoice->seller_snapshot ?: [];
    $buyer = $invoice->buyer_snapshot ?: $invoice->billing_identity;
    $custom = $invoice->customization_snapshot ?: [];
    $dateFormat = data_get($custom, 'invoice_customization.date_format', 'Y-m-d');
    $formatter = app(\App\Services\SaaS\InvoiceFormatter::class);
    $logo = $formatter->localAsset(data_get($custom, 'invoice_customization.invoice_logo'));
    $signature = $formatter->localAsset(data_get($custom, 'invoice_customization.signature'));
    $paidStamp = $formatter->localAsset(data_get($custom, 'invoice_customization.paid_stamp'));
    $qrCode = app(\App\Services\SaaS\InvoiceQrCode::class)->dataUri($invoice);
    $lines = collect($invoice->line_items_snapshot ?: $invoice->lines);
    $planLine = $lines->first(fn ($line) => data_get($line, 'type') === 'plan');
@endphp

<div class="brand">
    <div>
        @if($logo)<img class="logo" src="{{ $logo }}" alt="">@endif
        <h1>{{ data_get($custom, 'invoice_customization.invoice_title', 'Invoice') }}</h1>
        <p class="muted">{{ data_get($seller, 'company.legal_company_name', data_get($custom, 'invoice_customization.company_legal_name', 'KiteLedger')) }}</p>
    </div>
    <div class="right">
        <strong>{{ $invoice->invoice_number }}</strong><br>
        <span class="muted">Issued {{ optional($invoice->issue_date)->format($dateFormat) }}<br>{{ data_get($custom, 'invoice_customization.due_date_label', 'Due date') }} {{ optional($invoice->due_date)->format($dateFormat) }}</span>
        @if($invoice->status === 'paid' && $paidStamp)<br><img class="paid-stamp" src="{{ $paidStamp }}" alt="Paid">@endif
    </div>
</div>

<div class="addresses">
    <div>
        <div class="label">From</div>
        <strong>{{ data_get($seller, 'company.legal_company_name', data_get($custom, 'invoice_customization.company_legal_name')) }}</strong><br>
        {{ data_get($seller, 'company.address_line_1', data_get($custom, 'invoice_customization.company_address')) }}<br>
        {{ data_get($seller, 'company.email', data_get($custom, 'invoice_customization.email')) }}<br>
        {{ data_get($custom, 'invoice_customization.phone') }}
        <div class="meta">{{ data_get($custom, 'invoice_customization.tax_number') }} {{ data_get($custom, 'invoice_customization.registration_number') }}</div>
    </div>
    <div>
        <div class="label">Bill to</div>
        <strong>{{ data_get($buyer, 'legal_name') ?: data_get($buyer, 'company_name') }}</strong>
        @if(data_get($custom, 'invoice_customization.show_billing_address', true))<br>{{ data_get($buyer, 'address') }}<br>{{ data_get($buyer, 'email') }}@endif
        @if(data_get($custom, 'invoice_customization.show_tenant_tax_number', true) && data_get($buyer, 'tax_number'))<div class="meta">Tax: {{ data_get($buyer, 'tax_number') }}</div>@endif
    </div>
</div>

@if(data_get($custom, 'invoice_customization.show_plan', true) && $planLine)
    <p class="muted" style="margin-bottom: 5px">Plan: {{ data_get($planLine, 'description') }}</p>
@endif
@if(data_get($custom, 'invoice_customization.show_subscription_period', true) && ($invoice->period_start || $invoice->period_end))
    <p class="muted" style="margin-bottom: 10px">Subscription period: {{ optional($invoice->period_start)->format($dateFormat) }} – {{ optional($invoice->period_end)->format($dateFormat) }}</p>
@endif

<table>
    <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
    <tbody>
    @foreach($lines as $line)
        <tr>
            <td>{{ data_get($line, 'description') }}</td>
            <td class="right">{{ $formatter->number(data_get($line, 'quantity'), $custom, (float) data_get($line, 'quantity') === (float) (int) data_get($line, 'quantity') ? 0 : 2) }}</td>
            <td class="right">{{ $formatter->money(data_get($line, 'unit_amount'), $invoice->currency, $custom) }}</td>
            <td class="right">{{ $formatter->money(data_get($line, 'amount'), $invoice->currency, $custom) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<table class="totals">
    <tr><td>Subtotal</td><td class="right">{{ $formatter->money($invoice->subtotal, $invoice->currency, $custom) }}</td></tr>
    @if(data_get($custom, 'invoice_customization.show_discount', true) && $invoice->discount > 0)<tr><td>Discount</td><td class="right">{{ $formatter->money($invoice->discount, $invoice->currency, $custom) }}</td></tr>@endif
    @if(data_get($custom, 'invoice_customization.show_tax', true) && $invoice->tax > 0)<tr><td>{{ data_get($custom, 'invoice_customization.tax_label', 'Tax') }}</td><td class="right">{{ $formatter->money($invoice->tax, $invoice->currency, $custom) }}</td></tr>@endif
    <tr class="grand"><th>Total</th><th class="right">{{ $formatter->money($invoice->total, $invoice->currency, $custom) }}</th></tr>
    @if(data_get($custom, 'invoice_customization.show_payment_history', true))<tr><td>Paid</td><td class="right">{{ $formatter->money($invoice->paid_amount, $invoice->currency, $custom) }}</td></tr>@endif
    @if(data_get($custom, 'invoice_customization.show_balance', true))<tr><td>Balance</td><td class="right">{{ $formatter->money($invoice->balance ?: max(0, $invoice->total - $invoice->paid_amount), $invoice->currency, $custom) }}</td></tr>@endif
</table>

@if(data_get($custom, 'invoice_customization.payment_terms') || data_get($custom, 'invoice_customization.notes') || $invoice->notes)
    <div class="notes"><strong>Payment terms and notes</strong><br>{!! nl2br(e(data_get($custom, 'invoice_customization.payment_terms'))) !!}<br>{!! nl2br(e(data_get($custom, 'invoice_customization.notes') ?: $invoice->notes)) !!}</div>
@endif

<div class="payment">
    <div>
        @if(data_get($custom, 'invoice_customization.bank_details'))<div class="label">Bank details</div>{!! nl2br(e(data_get($custom, 'invoice_customization.bank_details'))) !!}@endif
        @if(data_get($custom, 'invoice_customization.payment_instructions'))<div class="label" style="margin-top: 10px">Payment instructions</div>{!! nl2br(e(data_get($custom, 'invoice_customization.payment_instructions'))) !!}@endif
        @if($qrCode)<br><img class="qr" src="{{ $qrCode }}" alt="Invoice QR code">@endif
    </div>
    <div class="right">
        @if($signature)<img class="signature" src="{{ $signature }}" alt=""><br>@endif
        <strong>{{ data_get($custom, 'invoice_customization.authorized_signatory') }}</strong>
    </div>
</div>

@if(data_get($custom, 'invoice_customization.show_metadata', false) && $invoice->metadata)
    <div class="notes"><strong>Metadata</strong><br>{{ collect($invoice->metadata)->map(fn ($value, $key) => $key.': '.(is_scalar($value) ? $value : json_encode($value)))->implode(' · ') }}</div>
@endif
<div class="footer"><span>{!! strip_tags((string) data_get($custom, 'invoice_customization.footer'), ['strong', 'em', 'br']) !!}</span><span style="float: right">Page <span class="page-number"></span></span></div>
</body>
</html>
