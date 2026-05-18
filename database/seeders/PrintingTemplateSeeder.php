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
                    'template_css' => '',
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
<div style="width:100%; min-height:297mm; padding:28px 32px; background:#ffffff; color:#111827; font-family:'Segoe UI', Arial, Helvetica, sans-serif; font-size:11px; line-height:1.45; box-sizing:border-box;">

    {{#document.show_watermark}}
        {{#document.void}}
            <div style="position:fixed; top:48%; left:50%; transform:translate(-50%,-50%) rotate(-32deg); font-size:76px; font-weight:900; letter-spacing:8px; color:#991b1b; opacity:0.045; z-index:0; white-space:nowrap;">VOIDED</div>
        {{/document.void}}

        {{#document.voided}}
            {{^document.void}}
                <div style="position:fixed; top:48%; left:50%; transform:translate(-50%,-50%) rotate(-32deg); font-size:76px; font-weight:900; letter-spacing:8px; color:#991b1b; opacity:0.045; z-index:0; white-space:nowrap;">VOIDED</div>
            {{/document.void}}
        {{/document.voided}}

        {{#document.is_draft}}
            <div style="position:fixed; top:48%; left:50%; transform:translate(-50%,-50%) rotate(-32deg); font-size:76px; font-weight:900; letter-spacing:8px; color:#6b7280; opacity:0.045; z-index:0; white-space:nowrap;">DRAFT</div>
        {{/document.is_draft}}

        {{#document.approved}}
            <div style="position:fixed; top:48%; left:50%; transform:translate(-50%,-50%) rotate(-32deg); font-size:76px; font-weight:900; letter-spacing:8px; color:#047857; opacity:0.045; z-index:0; white-space:nowrap;">APPROVED</div>
        {{/document.approved}}
    {{/document.show_watermark}}

    <table style="width:100%; border-collapse:collapse; margin-bottom:16px; border-bottom:2px solid #111827; position:relative; z-index:1;">
        <tr>
            <td style="width:62%; padding-bottom:14px; padding-right:20px; vertical-align:top;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:76px; vertical-align:top;">
                            {{#company.logo}}
                                <img src="{{company.logo}}" alt="{{company.name}}" style="display:block; max-width:68px; max-height:62px; object-fit:contain;">
                            {{/company.logo}}

                            {{^company.logo}}
                                <div style="width:58px; height:58px; border:1px solid #111827; text-align:center; line-height:58px; font-size:16px; font-weight:800;">
                                    {{company.initials}}
                                </div>
                            {{/company.logo}}
                        </td>

                        <td style="vertical-align:top;">
                            <h1 style="margin:0 0 5px 0; font-size:19px; line-height:1.15; font-weight:800; color:#111827;">
                                {{company.name}}
                            </h1>

                            {{#company.address}}
                                <p style="margin:0 0 2px 0; color:#4b5563;">{{company.address}}</p>
                            {{/company.address}}

                            <p style="margin:0 0 2px 0; color:#4b5563;">
                                {{#company.phone}}{{company.phone}}{{/company.phone}}
                                {{#company.email}}{{#company.phone}} | {{/company.phone}}{{company.email}}{{/company.email}}
                            </p>

                            {{#company.website}}
                                <p style="margin:0 0 2px 0; color:#4b5563;">{{company.website}}</p>
                            {{/company.website}}

                            {{#company.pan_or_vat}}
                                <p style="margin:0 0 2px 0; color:#4b5563;">PAN/VAT: <strong style="color:#111827;">{{company.pan_or_vat}}</strong></p>
                            {{/company.pan_or_vat}}

                            {{#branch.name}}
                                <p style="margin:0; color:#4b5563;">
                                    Branch: <strong style="color:#111827;">{{branch.name}}</strong>
                                    {{#branch.address}} | {{branch.address}}{{/branch.address}}
                                    {{#branch.phone}} | {{branch.phone}}{{/branch.phone}}
                                </p>
                            {{/branch.name}}
                        </td>
                    </tr>
                </table>
            </td>

            <td style="width:38%; padding-bottom:14px; vertical-align:top; text-align:right;">
                <h2 style="margin:0 0 10px 0; font-size:23px; line-height:1.05; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#111827;">
                    {$label}
                </h2>

                <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                    <tr>
                        <th style="width:38%; padding:5px 7px; border:1px solid #d1d5db; background:#f3f4f6; color:#4b5563; text-align:left;">Document No.</th>
                        <td style="padding:5px 7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{document.number}}</td>
                    </tr>
                    <tr>
                        <th style="padding:5px 7px; border:1px solid #d1d5db; background:#f3f4f6; color:#4b5563; text-align:left;">Date</th>
                        <td style="padding:5px 7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{document.date}}</td>
                    </tr>

                    {{#document.due_date}}
                        <tr>
                            <th style="padding:5px 7px; border:1px solid #d1d5db; background:#f3f4f6; color:#4b5563; text-align:left;">Due Date</th>
                            <td style="padding:5px 7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{document.due_date}}</td>
                        </tr>
                    {{/document.due_date}}

                    {{#document.reference}}
                        <tr>
                            <th style="padding:5px 7px; border:1px solid #d1d5db; background:#f3f4f6; color:#4b5563; text-align:left;">Reference</th>
                            <td style="padding:5px 7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{document.reference}}</td>
                        </tr>
                    {{/document.reference}}

                    <tr>
                        <th style="padding:5px 7px; border:1px solid #d1d5db; background:#f3f4f6; color:#4b5563; text-align:left;">Status</th>
                        <td style="padding:5px 7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">
                            {{document.status}}
                            {{#document.approved}} / Approved{{/document.approved}}
                            {{#document.void}} / Voided{{/document.void}}
                            {{#document.voided}}{{^document.void}} / Voided{{/document.void}}{{/document.voided}}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; margin-bottom:12px; position:relative; z-index:1;">
        <tr>
            {{#customer.name}}
                <td style="width:50%; padding:0 6px 8px 0; vertical-align:top;">
                    <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                        <tr>
                            <th colspan="2" style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase; letter-spacing:0.4px;">Bill To</th>
                        </tr>
                        <tr>
                            <td style="width:82px; padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Name</td>
                            <td style="padding:6px 7px; border:1px solid #d1d5db;"><strong>{{customer.name}}</strong></td>
                        </tr>
                        {{#customer.address}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Address</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{customer.address}}</td>
                            </tr>
                        {{/customer.address}}
                        {{#customer.phone}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Phone</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{customer.phone}}</td>
                            </tr>
                        {{/customer.phone}}
                        {{#customer.email}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Email</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{customer.email}}</td>
                            </tr>
                        {{/customer.email}}
                    </table>
                </td>
            {{/customer.name}}

            {{#supplier.name}}
                <td style="width:50%; padding:0 0 8px 6px; vertical-align:top;">
                    <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                        <tr>
                            <th colspan="2" style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase; letter-spacing:0.4px;">Supplier</th>
                        </tr>
                        <tr>
                            <td style="width:82px; padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Name</td>
                            <td style="padding:6px 7px; border:1px solid #d1d5db;"><strong>{{supplier.name}}</strong></td>
                        </tr>
                        {{#supplier.address}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Address</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{supplier.address}}</td>
                            </tr>
                        {{/supplier.address}}
                        {{#supplier.phone}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Phone</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{supplier.phone}}</td>
                            </tr>
                        {{/supplier.phone}}
                        {{#supplier.email}}
                            <tr>
                                <td style="padding:6px 7px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; font-weight:700;">Email</td>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{supplier.email}}</td>
                            </tr>
                        {{/supplier.email}}
                    </table>
                </td>
            {{/supplier.name}}
        </tr>
    </table>

    {{#payment.method}}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #111827; position:relative; z-index:1;">
            <tr>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Payment Method</th>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Account</th>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Reference</th>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Source</th>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Destination</th>
            </tr>
            <tr>
                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{payment.method}}</td>
                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{payment.account}}</td>
                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{payment.reference_number}}</td>
                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{payment.source_account}}</td>
                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{payment.destination_account}}</td>
            </tr>
        </table>
    {{/payment.method}}

    {{#items}}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #111827; table-layout:fixed; position:relative; z-index:1;">
            <thead>
                <tr>
                    <th style="width:32px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:center;">#</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Item / Description</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Qty</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Rate</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Discount</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Tax</th>
                    <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Amount</th>
                </tr>
            </thead>

            <tbody>
                {{#items}}
                    <tr>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
                        <td style="padding:7px; border:1px solid #d1d5db;">
                            <strong>{{product_name}}</strong>
                            {{#description}}
                                <br><span style="color:#4b5563; font-size:10px;">{{description}}</span>
                            {{/description}}
                        </td>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{qty}}</td>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{unit_price}}</td>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{discount_amount}}</td>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{tax_amount}}</td>
                        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;"><strong>{{line_total}}</strong></td>
                    </tr>
                {{/items}}
            </tbody>
        </table>
    {{/items}}

    <table style="width:100%; border-collapse:collapse; margin-bottom:12px; position:relative; z-index:1;">
        <tr>
            <td style="width:60%; padding-right:16px; vertical-align:top;">
                {{#totals.amount_in_words}}
                    <table style="width:100%; border-collapse:collapse; border:1px solid #111827; margin-bottom:8px;">
                        <tr>
                            <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">Amount in Words</th>
                        </tr>
                        <tr>
                            <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{totals.amount_in_words}}</strong></td>
                        </tr>
                    </table>
                {{/totals.amount_in_words}}

                {{#currency.code}}
                    <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                        <tr>
                            <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Currency</th>
                            <td style="padding:6px 7px; border:1px solid #d1d5db;">{{currency.code}}</td>
                            {{#exchange_rate}}
                                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Exchange Rate</th>
                                <td style="padding:6px 7px; border:1px solid #d1d5db;">{{exchange_rate}}</td>
                            {{/exchange_rate}}
                        </tr>
                    </table>
                {{/currency.code}}
            </td>

            <td style="width:40%; vertical-align:top;">
                <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                    <tr>
                        <th style="width:55%; padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; text-align:left;">Subtotal</th>
                        <td style="width:45%; padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:800;">{{totals.subtotal}}</td>
                    </tr>
                    <tr>
                        <th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; text-align:left;">Discount</th>
                        <td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:800;">{{totals.discount}}</td>
                    </tr>
                    <tr>
                        <th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; text-align:left;">Tax</th>
                        <td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:800;">{{totals.tax}}</td>
                    </tr>
                    <tr>
                        <th style="padding:8px; border:1px solid #111827; background:#111827; color:#ffffff; text-align:left;">Grand Total</th>
                        <td style="padding:8px; border:1px solid #111827; background:#111827; color:#ffffff; text-align:right; font-weight:800;">{{totals.grand_total}}</td>
                    </tr>

                    {{#totals.paid}}
                        <tr>
                            <th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; color:#4b5563; text-align:left;">Amount Paid</th>
                            <td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:800;">{{totals.paid}}</td>
                        </tr>
                    {{/totals.paid}}

                    {{#totals.balance}}
                        <tr>
                            <th style="padding:7px 8px; border:1px solid #d1d5db; background:#fff7f7; color:#991b1b; text-align:left;">Balance Due</th>
                            <td style="padding:7px 8px; border:1px solid #d1d5db; background:#fff7f7; color:#991b1b; text-align:right; font-weight:800;">{{totals.balance}}</td>
                        </tr>
                    {{/totals.balance}}
                </table>
            </td>
        </tr>
    </table>

    {{#document.notes}}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #111827; position:relative; z-index:1;">
            <tr>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">Notes</th>
            </tr>
            <tr>
                <td style="padding:7px 8px; border:1px solid #d1d5db; white-space:pre-wrap;">{{document.notes}}</td>
            </tr>
        </table>
    {{/document.notes}}

    {{#document.terms}}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #111827; position:relative; z-index:1;">
            <tr>
                <th style="padding:6px 7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">Terms &amp; Conditions</th>
            </tr>
            <tr>
                <td style="padding:7px 8px; border:1px solid #d1d5db; white-space:pre-wrap;">{{document.terms}}</td>
            </tr>
        </table>
    {{/document.terms}}

    {{#document.void}}
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #991b1b; position:relative; z-index:1;">
            <tr>
                <th style="width:120px; padding:7px 8px; border:1px solid #fca5a5; background:#fff7f7; color:#991b1b; text-align:left;">Void Reason</th>
                <td style="padding:7px 8px; border:1px solid #fca5a5; background:#fff7f7; color:#991b1b;">{{document.voided_reason}}</td>
            </tr>
        </table>
    {{/document.void}}

    {{#document.voided}}
        {{^document.void}}
            <table style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #991b1b; position:relative; z-index:1;">
                <tr>
                    <th style="width:120px; padding:7px 8px; border:1px solid #fca5a5; background:#fff7f7; color:#991b1b; text-align:left;">Void Reason</th>
                    <td style="padding:7px 8px; border:1px solid #fca5a5; background:#fff7f7; color:#991b1b;">{{document.voided_reason}}</td>
                </tr>
            </table>
        {{/document.void}}
    {{/document.voided}}

    <table style="width:100%; border-collapse:collapse; margin-top:42px; margin-bottom:22px; position:relative; z-index:1;">
        <tr>
            <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;">
                <div style="height:1px; margin-bottom:7px; background:#111827;"></div>
                <strong style="color:#111827; text-transform:uppercase; letter-spacing:0.35px;">Prepared By</strong>
                {{#prepared_by}}<br>{{prepared_by}}{{/prepared_by}}
            </td>

            <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;">
                <div style="height:1px; margin-bottom:7px; background:#111827;"></div>
                <strong style="color:#111827; text-transform:uppercase; letter-spacing:0.35px;">Approved By</strong>
                {{#approved_by}}<br>{{approved_by}}{{/approved_by}}
            </td>

            <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;">
                <div style="height:1px; margin-bottom:7px; background:#111827;"></div>
                <strong style="color:#111827; text-transform:uppercase; letter-spacing:0.35px;">Received By</strong>
            </td>
        </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; border-top:1px solid #111827; position:relative; z-index:1;">
        <tr>
            <td style="padding-top:7px; color:#4b5563; font-size:10px;">
                <strong style="color:#111827;">{{company.name}}</strong>
                {{#company.phone}} | {{company.phone}}{{/company.phone}}
                {{#company.email}} | {{company.email}}{{/company.email}}
            </td>

            {{#printed_at}}
                <td style="padding-top:7px; color:#4b5563; font-size:10px; text-align:right;">
                    Printed: {{printed_at}}
                </td>
            {{/printed_at}}
        </tr>
    </table>

</div>
HTML;
    }
}