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
                    'name' => "{$label} Default Table Print",
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

            // Sales / payment-in module
            'quotation' => 'Quotation',
            'sales_order' => 'Sales Order',
            'proforma_invoice' => 'Proforma Invoice',
            'invoice' => 'Sales Invoice',
            'customer_payment' => 'Customer Payment',
            'sales_return' => 'Sales Return',
            'credit_note' => 'Credit Note',

            // Purchase / payment-out module
            'purchase_order' => 'Purchase Order',
            'purchase_bill' => 'Purchase Bill',
            'expense' => 'Expense',
            'supplier_payment' => 'Supplier Payment',
            'debit_note' => 'Debit Note',

            // Accounting module
            'journal_voucher' => 'Journal Voucher',
            'cash_transfer' => 'Cash Transfer',
            'cheque_register' => 'Cheque Register',
            'loan_account' => 'Loan Account',
            'loan_topup' => 'Loan Top Up',
            'loan_charge' => 'Loan Charge',

            // Inventory / warehouse module
            'warehouse_transfer' => 'Warehouse Transfer',
            'inventory_adjustment' => 'Inventory Adjustment',
            'product' => 'Product',

            // CRM / HRM / project module
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
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
        <td>
            <table border="0" cellpadding="4" cellspacing="0" width="100%">
                <tr>
                    <td width="60%" valign="top">
                        {{#company.logo}}
                            <img src="{{company.logo}}" alt="{{company.name}}" width="90">
                            <br>
                        {{/company.logo}}

                        <strong>{{company.name}}</strong><br>

                        {{#company.address}}
                            {{company.address}}<br>
                        {{/company.address}}

                        {{#company.phone}}
                            Phone: {{company.phone}}<br>
                        {{/company.phone}}

                        {{#company.email}}
                            Email: {{company.email}}<br>
                        {{/company.email}}

                        {{#company.website}}
                            Website: {{company.website}}<br>
                        {{/company.website}}

                        {{#company.pan_or_vat}}
                            PAN/VAT: {{company.pan_or_vat}}<br>
                        {{/company.pan_or_vat}}

                        {{#branch.name}}
                            Branch: {{branch.name}}
                            {{#branch.address}} - {{branch.address}}{{/branch.address}}
                            <br>
                        {{/branch.name}}
                    </td>

                    <td width="40%" align="right" valign="top">
                        <h2>{$label}</h2>

                        <table border="1" cellpadding="5" cellspacing="0" width="100%">
                            <tr>
                                <td><strong>Document No.</strong></td>
                                <td>{{document.number}}</td>
                            </tr>
                            <tr>
                                <td><strong>Date</strong></td>
                                <td>{{document.date}}</td>
                            </tr>
                            {{#document.due_date}}
                                <tr>
                                    <td><strong>Due Date</strong></td>
                                    <td>{{document.due_date}}</td>
                                </tr>
                            {{/document.due_date}}
                            {{#document.reference}}
                                <tr>
                                    <td><strong>Reference</strong></td>
                                    <td>{{document.reference}}</td>
                                </tr>
                            {{/document.reference}}
                            <tr>
                                <td><strong>Status</strong></td>
                                <td>
                                    {{document.status}}
                                    {{#document.approved}} / Approved{{/document.approved}}
                                    {{#document.void}} / Voided{{/document.void}}
                                    {{#document.voided}} / Voided{{/document.voided}}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <tr>
        <td height="14"></td>
    </tr>

    <tr>
        <td>
            <table border="1" cellpadding="6" cellspacing="0" width="100%">
                <tr>
                    <td width="50%" valign="top">
                        <strong>Party Details</strong><br>

                        {{#customer.name}}
                            {{customer.name}}<br>
                            {{#customer.address}}{{customer.address}}<br>{{/customer.address}}
                            {{#customer.phone}}Phone: {{customer.phone}}<br>{{/customer.phone}}
                            {{#customer.email}}Email: {{customer.email}}<br>{{/customer.email}}
                        {{/customer.name}}

                        {{#supplier.name}}
                            {{supplier.name}}<br>
                            {{#supplier.address}}{{supplier.address}}<br>{{/supplier.address}}
                            {{#supplier.phone}}Phone: {{supplier.phone}}<br>{{/supplier.phone}}
                            {{#supplier.email}}Email: {{supplier.email}}<br>{{/supplier.email}}
                        {{/supplier.name}}

                        {{#party.name}}
                            {{party.name}}<br>
                            {{#party.address}}{{party.address}}<br>{{/party.address}}
                            {{#party.phone}}Phone: {{party.phone}}<br>{{/party.phone}}
                            {{#party.email}}Email: {{party.email}}<br>{{/party.email}}
                        {{/party.name}}
                    </td>

                    <td width="50%" valign="top">
                        <strong>Payment / Account Details</strong><br>

                        {{#payment.method}}
                            Method: {{payment.method}}<br>
                        {{/payment.method}}

                        {{#payment.account}}
                            Account: {{payment.account}}<br>
                        {{/payment.account}}

                        {{#payment.reference_number}}
                            Reference No.: {{payment.reference_number}}<br>
                        {{/payment.reference_number}}

                        {{#payment.source_account}}
                            Source: {{payment.source_account}}<br>
                        {{/payment.source_account}}

                        {{#payment.destination_account}}
                            Destination: {{payment.destination_account}}<br>
                        {{/payment.destination_account}}

                        {{#account.name}}
                            Account: {{account.name}}<br>
                        {{/account.name}}
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <tr>
        <td height="14"></td>
    </tr>

    <tr>
        <td>
            <table border="1" cellpadding="6" cellspacing="0" width="100%">
                <thead>
                    <tr>
                        <th width="5%" align="center">#</th>
                        <th width="35%" align="left">Item / Description</th>
                        <th width="10%" align="right">Qty</th>
                        <th width="12%" align="right">Rate</th>
                        <th width="12%" align="right">Discount</th>
                        <th width="12%" align="right">Tax</th>
                        <th width="14%" align="right">Amount</th>
                    </tr>
                </thead>

                <tbody>
                    {{#items}}
                        <tr>
                            <td align="center">{{@index}}</td>
                            <td>
                                <strong>{{product_name}}</strong><br>
                                {{#description}}{{description}}{{/description}}
                            </td>
                            <td align="right">{{qty}}</td>
                            <td align="right">{{unit_price}}</td>
                            <td align="right">{{discount_amount}}</td>
                            <td align="right">{{tax_amount}}</td>
                            <td align="right"><strong>{{line_total}}</strong></td>
                        </tr>
                    {{/items}}
                </tbody>
            </table>
        </td>
    </tr>

    <tr>
        <td height="14"></td>
    </tr>

    <tr>
        <td>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td width="58%" valign="top">
                        {{#totals.amount_in_words}}
                            <table border="1" cellpadding="6" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <strong>Amount in Words</strong><br>
                                        {{totals.amount_in_words}}
                                    </td>
                                </tr>
                            </table>
                        {{/totals.amount_in_words}}

                        {{#currency.code}}
                            <br>
                            Currency: <strong>{{currency.code}}</strong>
                            {{#exchange_rate}} | Exchange Rate: <strong>{{exchange_rate}}</strong>{{/exchange_rate}}
                        {{/currency.code}}
                    </td>

                    <td width="42%" valign="top">
                        <table border="1" cellpadding="6" cellspacing="0" width="100%">
                            <tr>
                                <td><strong>Subtotal</strong></td>
                                <td align="right">{{totals.subtotal}}</td>
                            </tr>
                            <tr>
                                <td><strong>Discount</strong></td>
                                <td align="right">{{totals.discount}}</td>
                            </tr>
                            <tr>
                                <td><strong>Tax</strong></td>
                                <td align="right">{{totals.tax}}</td>
                            </tr>
                            <tr>
                                <td><strong>Grand Total</strong></td>
                                <td align="right"><strong>{{totals.grand_total}}</strong></td>
                            </tr>
                            {{#totals.paid}}
                                <tr>
                                    <td><strong>Amount Paid</strong></td>
                                    <td align="right">{{totals.paid}}</td>
                                </tr>
                            {{/totals.paid}}
                            {{#totals.balance}}
                                <tr>
                                    <td><strong>Balance Due</strong></td>
                                    <td align="right"><strong>{{totals.balance}}</strong></td>
                                </tr>
                            {{/totals.balance}}
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{#document.notes}}
        <tr>
            <td height="14"></td>
        </tr>
        <tr>
            <td>
                <table border="1" cellpadding="6" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <strong>Notes</strong><br>
                            {{document.notes}}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    {{/document.notes}}

    {{#document.terms}}
        <tr>
            <td height="14"></td>
        </tr>
        <tr>
            <td>
                <table border="1" cellpadding="6" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <strong>Terms &amp; Conditions</strong><br>
                            {{document.terms}}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    {{/document.terms}}

    {{#document.void}}
        <tr>
            <td height="14"></td>
        </tr>
        <tr>
            <td>
                <table border="1" cellpadding="6" cellspacing="0" width="100%">
                    <tr>
                        <td><strong>Void Reason:</strong> {{document.voided_reason}}</td>
                    </tr>
                </table>
            </td>
        </tr>
    {{/document.void}}

    <tr>
        <td height="40"></td>
    </tr>

    <tr>
        <td>
            <table border="0" cellpadding="8" cellspacing="0" width="100%">
                <tr>
                    <td width="33%" align="center">
                        ___________________________<br>
                        Prepared By<br>
                        {{#prepared_by}}{{prepared_by}}{{/prepared_by}}
                    </td>
                    <td width="33%" align="center">
                        ___________________________<br>
                        Approved By<br>
                        {{#approved_by}}{{approved_by}}{{/approved_by}}
                    </td>
                    <td width="34%" align="center">
                        ___________________________<br>
                        Received By
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <tr>
        <td height="14"></td>
    </tr>

    <tr>
        <td align="center">
            {{#printed_at}}Printed: {{printed_at}}{{/printed_at}}
        </td>
    </tr>
</table>
HTML;
    }
}
