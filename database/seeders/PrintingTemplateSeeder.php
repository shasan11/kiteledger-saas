<?php

namespace Database\Seeders;

use App\Models\PrintingTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PrintingTemplateSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach ($this->documentTypes() as $type => $label) {
                $templateKey = "{$type}.default";

                $template = PrintingTemplate::query()
                    ->where('document_type', $type)
                    ->where('template_key', $templateKey)
                    ->first();

                $attributes = [
                    'name' => "{$label} Standard Print",
                    'template_html' => $this->html($label),
                    'template_css' => $this->css(),
                    'is_default' => true,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ];

                if (! $template) {
                    PrintingTemplate::query()->create([
                        'document_type' => $type,
                        'template_key' => $templateKey,
                        ...$attributes,
                    ]);
                } elseif ($template->is_system_generated) {
                    $template->update($attributes);
                } else {
                    $template->update([
                        'is_default' => true,
                        'active' => $template->active ?? true,
                    ]);
                }

                PrintingTemplate::query()
                    ->where('document_type', $type)
                    ->where('template_key', '!=', $templateKey)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }
        });
    }

    private function documentTypes(): array
    {
        return [
            'general' => 'General Document',
            'quotation' => 'Quotation',
            'sales_order' => 'Sales Order',
            'proforma_invoice' => 'Proforma Invoice',
            'invoice' => 'Sales Invoice',
            'customer_payment' => 'Customer Payment',
            'sales_return' => 'Sales Return',
            'credit_note' => 'Credit Note',
            'purchase_order' => 'Purchase Order',
            'purchase_bill' => 'Purchase Bill',
            'supplier_payment' => 'Supplier Payment',
            'expense' => 'Expense',
            'debit_note' => 'Debit Note',
            'journal_voucher' => 'Journal Voucher',
            'cash_transfer' => 'Cash Transfer',
            'cheque_register' => 'Cheque Register',
            'loan_account' => 'Loan Account',
            'loan_topup' => 'Loan Top Up',
            'loan_charge' => 'Loan Charge',
            'warehouse_transfer' => 'Warehouse Transfer',
            'inventory_adjustment' => 'Inventory Adjustment',
            'product' => 'Product',
            'contact' => 'Contact',
            'lead' => 'Lead',
            'deal' => 'Deal',
            'employee' => 'Employee',
            'attendance' => 'Attendance',
            'leave_application' => 'Leave Application',
            'payslip' => 'Payslip',
            'project' => 'Project',
            'task' => 'Task',
        ];
    }

    private function html(string $label): string
    {
        return <<<HTML
<div class="kl-document">

    {{#document.show_watermark}}
        {{#document.void}}
            <div class="kl-watermark kl-watermark-danger">VOIDED</div>
        {{/document.void}}

        {{#document.voided}}
            {{^document.void}}
                <div class="kl-watermark kl-watermark-danger">VOIDED</div>
            {{/document.void}}
        {{/document.voided}}

        {{#document.is_draft}}
            <div class="kl-watermark kl-watermark-muted">DRAFT</div>
        {{/document.is_draft}}

        {{#document.approved}}
            <div class="kl-watermark kl-watermark-success">APPROVED</div>
        {{/document.approved}}
    {{/document.show_watermark}}

    <header class="kl-header">
        <div class="kl-brand">
            <div class="kl-logo-wrap">
                {{#company.logo}}
                    <img src="{{company.logo}}" alt="{{company.name}}" class="kl-logo">
                {{/company.logo}}

                {{^company.logo}}
                    <div class="kl-logo-placeholder">{{company.initials}}</div>
                {{/company.logo}}
            </div>

            <div class="kl-company">
                <h1>{{company.name}}</h1>

                {{#company.address}}
                    <p>{{company.address}}</p>
                {{/company.address}}

                <p>
                    {{#company.phone}}{{company.phone}}{{/company.phone}}
                    {{#company.email}}{{#company.phone}} · {{/company.phone}}{{company.email}}{{/company.email}}
                </p>

                {{#company.website}}
                    <p>{{company.website}}</p>
                {{/company.website}}

                {{#company.pan_or_vat}}
                    <p>PAN/VAT: <strong>{{company.pan_or_vat}}</strong></p>
                {{/company.pan_or_vat}}

                {{#branch.name}}
                    <div class="kl-branch">
                        {{branch.name}}
                        {{#branch.address}} · {{branch.address}}{{/branch.address}}
                        {{#branch.phone}} · {{branch.phone}}{{/branch.phone}}
                    </div>
                {{/branch.name}}
            </div>
        </div>

        <div class="kl-title-card">
            <div class="kl-document-label">{$label}</div>

            <table class="kl-meta-table">
                <tr>
                    <td>Document No.</td>
                    <td>{{document.number}}</td>
                </tr>
                <tr>
                    <td>Date</td>
                    <td>{{document.date}}</td>
                </tr>

                {{#document.due_date}}
                    <tr>
                        <td>Due Date</td>
                        <td>{{document.due_date}}</td>
                    </tr>
                {{/document.due_date}}

                {{#document.reference}}
                    <tr>
                        <td>Reference</td>
                        <td>{{document.reference}}</td>
                    </tr>
                {{/document.reference}}

                <tr>
                    <td>Status</td>
                    <td>
                        <span class="kl-status">{{document.status}}</span>

                        {{#document.approved}}
                            <span class="kl-status kl-status-success">Approved</span>
                        {{/document.approved}}

                        {{#document.void}}
                            <span class="kl-status kl-status-danger">Voided</span>
                        {{/document.void}}

                        {{#document.voided}}
                            {{^document.void}}
                                <span class="kl-status kl-status-danger">Voided</span>
                            {{/document.void}}
                        {{/document.voided}}
                    </td>
                </tr>
            </table>
        </div>
    </header>

    <section class="kl-parties">
        {{#customer.name}}
            <div class="kl-party-card">
                <div class="kl-section-label">Bill To</div>
                <h2>{{customer.name}}</h2>

                {{#customer.address}}<p>{{customer.address}}</p>{{/customer.address}}
                {{#customer.phone}}<p>{{customer.phone}}</p>{{/customer.phone}}
                {{#customer.email}}<p>{{customer.email}}</p>{{/customer.email}}
            </div>
        {{/customer.name}}

        {{#supplier.name}}
            <div class="kl-party-card">
                <div class="kl-section-label">Supplier</div>
                <h2>{{supplier.name}}</h2>

                {{#supplier.address}}<p>{{supplier.address}}</p>{{/supplier.address}}
                {{#supplier.phone}}<p>{{supplier.phone}}</p>{{/supplier.phone}}
                {{#supplier.email}}<p>{{supplier.email}}</p>{{/supplier.email}}
            </div>
        {{/supplier.name}}

        {{#party.name}}
            <div class="kl-party-card">
                <div class="kl-section-label">Party</div>
                <h2>{{party.name}}</h2>

                {{#party.address}}<p>{{party.address}}</p>{{/party.address}}
                {{#party.phone}}<p>{{party.phone}}</p>{{/party.phone}}
                {{#party.email}}<p>{{party.email}}</p>{{/party.email}}
            </div>
        {{/party.name}}

        {{#account.name}}
            <div class="kl-party-card">
                <div class="kl-section-label">Account</div>
                <h2>{{account.name}}</h2>
            </div>
        {{/account.name}}
    </section>

    {{#payment.method}}
        <section class="kl-info-strip">
            <div>
                <span>Payment Method</span>
                <strong>{{payment.method}}</strong>
            </div>

            {{#payment.account}}
                <div>
                    <span>Account</span>
                    <strong>{{payment.account}}</strong>
                </div>
            {{/payment.account}}

            {{#payment.reference_number}}
                <div>
                    <span>Reference</span>
                    <strong>{{payment.reference_number}}</strong>
                </div>
            {{/payment.reference_number}}

            {{#payment.source_account}}
                <div>
                    <span>Source</span>
                    <strong>{{payment.source_account}}</strong>
                </div>
            {{/payment.source_account}}

            {{#payment.destination_account}}
                <div>
                    <span>Destination</span>
                    <strong>{{payment.destination_account}}</strong>
                </div>
            {{/payment.destination_account}}
        </section>
    {{/payment.method}}

    {{#items}}
        <section class="kl-table-section">
            <table class="kl-line-table">
                <thead>
                    <tr>
                        <th class="kl-col-index">#</th>
                        <th>Item / Description</th>
                        <th class="kl-text-right">Qty</th>
                        <th class="kl-text-right">Rate</th>
                        <th class="kl-text-right">Discount</th>
                        <th class="kl-text-right">Tax</th>
                        <th class="kl-text-right">Amount</th>
                    </tr>
                </thead>

                <tbody>
                    {{#items}}
                        <tr>
                            <td class="kl-col-index">{{@index}}</td>
                            <td>
                                <div class="kl-item-title">{{product_name}}</div>
                                {{#description}}
                                    <div class="kl-item-description">{{description}}</div>
                                {{/description}}
                            </td>
                            <td class="kl-text-right">{{qty}}</td>
                            <td class="kl-text-right">{{unit_price}}</td>
                            <td class="kl-text-right">{{discount_amount}}</td>
                            <td class="kl-text-right">{{tax_amount}}</td>
                            <td class="kl-text-right kl-amount">{{line_total}}</td>
                        </tr>
                    {{/items}}
                </tbody>
            </table>
        </section>
    {{/items}}

    <section class="kl-summary">
        <div class="kl-summary-left">
            {{#totals.amount_in_words}}
                <div class="kl-amount-words">
                    <span>Amount in words</span>
                    <strong>{{totals.amount_in_words}}</strong>
                </div>
            {{/totals.amount_in_words}}

            {{#currency.code}}
                <div class="kl-currency">
                    Currency: <strong>{{currency.code}}</strong>
                    {{#exchange_rate}} · Exchange Rate: <strong>{{exchange_rate}}</strong>{{/exchange_rate}}
                </div>
            {{/currency.code}}
        </div>

        <div class="kl-total-card">
            <div class="kl-total-row">
                <span>Subtotal</span>
                <strong>{{totals.subtotal}}</strong>
            </div>

            <div class="kl-total-row">
                <span>Discount</span>
                <strong>{{totals.discount}}</strong>
            </div>

            <div class="kl-total-row">
                <span>Tax</span>
                <strong>{{totals.tax}}</strong>
            </div>

            <div class="kl-total-row kl-total-grand">
                <span>Grand Total</span>
                <strong>{{totals.grand_total}}</strong>
            </div>

            {{#totals.paid}}
                <div class="kl-total-row">
                    <span>Amount Paid</span>
                    <strong>{{totals.paid}}</strong>
                </div>
            {{/totals.paid}}

            {{#totals.balance}}
                <div class="kl-total-row kl-total-balance">
                    <span>Balance Due</span>
                    <strong>{{totals.balance}}</strong>
                </div>
            {{/totals.balance}}
        </div>
    </section>

    {{#document.notes}}
        <section class="kl-note-card">
            <div class="kl-section-label">Notes</div>
            <p>{{document.notes}}</p>
        </section>
    {{/document.notes}}

    {{#document.terms}}
        <section class="kl-note-card">
            <div class="kl-section-label">Terms &amp; Conditions</div>
            <p>{{document.terms}}</p>
        </section>
    {{/document.terms}}

    {{#document.void}}
        <section class="kl-alert">
            <strong>Void Reason:</strong> {{document.voided_reason}}
        </section>
    {{/document.void}}

    {{#document.voided}}
        {{^document.void}}
            <section class="kl-alert">
                <strong>Void Reason:</strong> {{document.voided_reason}}
            </section>
        {{/document.void}}
    {{/document.voided}}

    <section class="kl-signatures">
        <div class="kl-signature">
            <div></div>
            <span>Prepared By</span>
            {{#prepared_by}}<strong>{{prepared_by}}</strong>{{/prepared_by}}
        </div>

        <div class="kl-signature">
            <div></div>
            <span>Approved By</span>
            {{#approved_by}}<strong>{{approved_by}}</strong>{{/approved_by}}
        </div>

        <div class="kl-signature">
            <div></div>
            <span>Received By</span>
        </div>
    </section>

    <footer class="kl-footer">
        <div>
            <strong>{{company.name}}</strong>
            {{#company.phone}} · {{company.phone}}{{/company.phone}}
            {{#company.email}} · {{company.email}}{{/company.email}}
        </div>

        {{#printed_at}}
            <div>Printed: {{printed_at}}</div>
        {{/printed_at}}
    </footer>
</div>
HTML;
    }

    private function css(): string
    {
        return <<<CSS
:root {
    --kl-ink: #111827;
    --kl-muted: #6b7280;
    --kl-soft: #f9fafb;
    --kl-border: #e5e7eb;
    --kl-border-strong: #d1d5db;
    --kl-primary: #1f2937;
    --kl-success: #047857;
    --kl-danger: #b91c1c;
    --kl-warning-bg: #fef2f2;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
}

body {
    background: #ffffff;
}

.kl-document {
    position: relative;
    width: 100%;
    min-height: 297mm;
    padding: 30px 34px;
    background: #ffffff;
    color: var(--kl-ink);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.45;
}

.kl-document h1,
.kl-document h2,
.kl-document h3,
.kl-document p {
    margin: 0;
}

.kl-watermark {
    position: fixed;
    top: 48%;
    left: 50%;
    z-index: 0;
    transform: translate(-50%, -50%) rotate(-32deg);
    font-size: 82px;
    font-weight: 800;
    letter-spacing: 10px;
    text-transform: uppercase;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0.045;
}

.kl-watermark-danger {
    color: var(--kl-danger);
}

.kl-watermark-muted {
    color: var(--kl-muted);
}

.kl-watermark-success {
    color: var(--kl-success);
}

.kl-header,
.kl-parties,
.kl-info-strip,
.kl-table-section,
.kl-summary,
.kl-note-card,
.kl-alert,
.kl-signatures,
.kl-footer {
    position: relative;
    z-index: 1;
}

.kl-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 275px;
    gap: 28px;
    align-items: start;
    padding-bottom: 20px;
    margin-bottom: 20px;
    border-bottom: 1.5px solid var(--kl-ink);
}

.kl-brand {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
}

.kl-logo-wrap {
    width: 72px;
}

.kl-logo {
    display: block;
    max-width: 72px;
    max-height: 64px;
    object-fit: contain;
}

.kl-logo-placeholder {
    width: 62px;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--kl-border-strong);
    border-radius: 10px;
    color: var(--kl-primary);
    font-size: 17px;
    font-weight: 800;
    letter-spacing: .5px;
    background: var(--kl-soft);
}

.kl-company h1 {
    margin-bottom: 5px;
    font-size: 19px;
    line-height: 1.15;
    font-weight: 800;
    color: var(--kl-ink);
}

.kl-company p {
    color: var(--kl-muted);
    font-size: 10.8px;
    line-height: 1.45;
}

.kl-branch {
    display: inline-block;
    margin-top: 7px;
    padding: 4px 8px;
    border: 1px solid var(--kl-border);
    border-radius: 999px;
    background: var(--kl-soft);
    color: var(--kl-muted);
    font-size: 10px;
}

.kl-title-card {
    text-align: right;
}

.kl-document-label {
    margin-bottom: 12px;
    color: var(--kl-ink);
    font-size: 25px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: .6px;
    text-transform: uppercase;
}

.kl-meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-left: auto;
}

.kl-meta-table td {
    padding: 4px 0;
    font-size: 10.8px;
    vertical-align: top;
    border-bottom: 1px solid var(--kl-border);
}

.kl-meta-table tr:last-child td {
    border-bottom: 0;
}

.kl-meta-table td:first-child {
    width: 92px;
    padding-right: 12px;
    color: var(--kl-muted);
    text-align: left;
    white-space: nowrap;
}

.kl-meta-table td:last-child {
    color: var(--kl-ink);
    font-weight: 700;
    text-align: right;
}

.kl-status {
    display: inline-block;
    margin-left: 4px;
    padding: 2px 7px;
    border: 1px solid var(--kl-border-strong);
    border-radius: 999px;
    color: var(--kl-primary);
    background: #ffffff;
    font-size: 9.2px;
    font-weight: 800;
    line-height: 1.35;
    letter-spacing: .35px;
    text-transform: uppercase;
}

.kl-status-success {
    color: var(--kl-success);
    border-color: #a7f3d0;
    background: #ecfdf5;
}

.kl-status-danger {
    color: var(--kl-danger);
    border-color: #fecaca;
    background: #fef2f2;
}

.kl-parties {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 16px;
}

.kl-party-card {
    min-height: 92px;
    padding: 13px 14px;
    border: 1px solid var(--kl-border);
    border-radius: 10px;
    background: #ffffff;
}

.kl-section-label {
    margin-bottom: 6px;
    color: var(--kl-muted);
    font-size: 9.6px;
    font-weight: 800;
    letter-spacing: .7px;
    text-transform: uppercase;
}

.kl-party-card h2 {
    margin-bottom: 4px;
    color: var(--kl-ink);
    font-size: 13px;
    line-height: 1.25;
    font-weight: 800;
}

.kl-party-card p {
    color: var(--kl-muted);
    font-size: 10.6px;
    line-height: 1.45;
}

.kl-info-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
    padding: 11px 12px;
    border: 1px solid var(--kl-border);
    border-radius: 10px;
    background: var(--kl-soft);
}

.kl-info-strip div {
    min-width: 0;
}

.kl-info-strip span {
    display: block;
    margin-bottom: 2px;
    color: var(--kl-muted);
    font-size: 9.4px;
    font-weight: 800;
    letter-spacing: .45px;
    text-transform: uppercase;
}

.kl-info-strip strong {
    display: block;
    color: var(--kl-ink);
    font-size: 10.7px;
    font-weight: 800;
    overflow-wrap: anywhere;
}

.kl-table-section {
    margin-top: 2px;
    margin-bottom: 18px;
}

.kl-line-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.kl-line-table th {
    padding: 8px 8px;
    color: #ffffff;
    background: var(--kl-primary);
    font-size: 9.8px;
    font-weight: 800;
    line-height: 1.2;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: .35px;
}

.kl-line-table th:first-child {
    border-top-left-radius: 8px;
}

.kl-line-table th:last-child {
    border-top-right-radius: 8px;
}

.kl-line-table td {
    padding: 8px 8px;
    color: var(--kl-ink);
    font-size: 10.5px;
    vertical-align: top;
    border-bottom: 1px solid var(--kl-border);
}

.kl-line-table tbody tr:nth-child(even) td {
    background: #fcfcfd;
}

.kl-line-table tbody tr:last-child td {
    border-bottom: 1.5px solid var(--kl-border-strong);
}

.kl-col-index {
    width: 34px;
    text-align: center !important;
}

.kl-text-right {
    text-align: right !important;
}

.kl-item-title {
    color: var(--kl-ink);
    font-weight: 800;
}

.kl-item-description {
    margin-top: 2px;
    color: var(--kl-muted);
    font-size: 10px;
    line-height: 1.45;
}

.kl-amount {
    font-weight: 800;
}

.kl-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
    margin-bottom: 16px;
}

.kl-summary-left {
    min-height: 1px;
}

.kl-amount-words {
    padding: 11px 12px;
    border: 1px solid var(--kl-border);
    border-radius: 10px;
    background: var(--kl-soft);
}

.kl-amount-words span {
    display: block;
    margin-bottom: 4px;
    color: var(--kl-muted);
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: .5px;
    text-transform: uppercase;
}

.kl-amount-words strong {
    display: block;
    color: var(--kl-ink);
    font-size: 10.8px;
    font-weight: 800;
}

.kl-currency {
    margin-top: 10px;
    color: var(--kl-muted);
    font-size: 10.2px;
}

.kl-total-card {
    border: 1px solid var(--kl-border);
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
}

.kl-total-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--kl-border);
    color: var(--kl-muted);
    font-size: 10.7px;
}

.kl-total-row:last-child {
    border-bottom: 0;
}

.kl-total-row strong {
    color: var(--kl-ink);
    font-weight: 800;
}

.kl-total-grand {
    padding-top: 10px;
    padding-bottom: 10px;
    color: #ffffff;
    background: var(--kl-primary);
    font-size: 12.3px;
    font-weight: 800;
}

.kl-total-grand strong {
    color: #ffffff;
}

.kl-total-balance {
    color: var(--kl-danger);
    background: var(--kl-warning-bg);
    font-weight: 800;
}

.kl-total-balance strong {
    color: var(--kl-danger);
}

.kl-note-card {
    margin-bottom: 12px;
    padding: 12px 13px;
    border: 1px solid var(--kl-border);
    border-radius: 10px;
    background: #ffffff;
}

.kl-note-card p {
    color: var(--kl-ink);
    font-size: 10.8px;
    line-height: 1.55;
    white-space: pre-wrap;
}

.kl-alert {
    margin: 12px 0;
    padding: 10px 12px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: var(--kl-danger);
    background: var(--kl-warning-bg);
    font-size: 10.8px;
}

.kl-signatures {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 34px;
    margin-top: 48px;
    margin-bottom: 26px;
}

.kl-signature {
    text-align: center;
}

.kl-signature div {
    height: 1px;
    margin-bottom: 7px;
    background: var(--kl-border-strong);
}

.kl-signature span {
    display: block;
    color: var(--kl-muted);
    font-size: 9.8px;
    font-weight: 800;
    letter-spacing: .5px;
    text-transform: uppercase;
}

.kl-signature strong {
    display: block;
    margin-top: 3px;
    color: var(--kl-ink);
    font-size: 10.5px;
    font-weight: 800;
}

.kl-footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-top: 9px;
    margin-top: 12px;
    border-top: 1px solid var(--kl-border);
    color: var(--kl-muted);
    font-size: 9.8px;
}

.kl-footer strong {
    color: var(--kl-ink);
}

@page {
    size: A4;
    margin: 16mm 14mm;
}

@media print {
    html,
    body {
        width: 210mm;
        min-height: 297mm;
        background: #ffffff;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }

    .kl-document {
        min-height: auto;
        padding: 0;
    }

    .kl-header,
    .kl-party-card,
    .kl-info-strip,
    .kl-total-card,
    .kl-note-card,
    .kl-alert,
    .kl-signatures,
    .kl-footer {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .kl-line-table {
        page-break-inside: auto;
    }

    .kl-line-table thead {
        display: table-header-group;
    }

    .kl-line-table tfoot {
        display: table-footer-group;
    }

    .kl-line-table tr {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .kl-watermark {
        position: fixed;
    }
}
CSS;
    }
}