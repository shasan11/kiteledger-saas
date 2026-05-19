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
                $html = $this->htmlForType($type, $label);

                $template = PrintingTemplate::query()
                    ->where('document_type', $type)
                    ->where('template_key', $templateKey)
                    ->first();

                $attributes = [
                    'name' => "{$label} Default Print",
                    'template_css' => '',
                    'is_default' => true,
                    'active' => true,
                    'user_add_id' => null,
                ];

                if (! $template) {
                    $template = PrintingTemplate::query()->create([
                        'document_type' => $type,
                        'template_key' => $templateKey,
                        'template_html' => $html,
                        'is_system_generated' => true,
                        ...$attributes,
                    ]);
                } elseif ($template->is_system_generated) {
                    $template->update([
                        'template_html' => $html,
                        'is_system_generated' => true,
                        ...$attributes,
                    ]);
                } else {
                    $template->update([
                        'is_default' => true,
                        'active' => true,
                    ]);
                }

                PrintingTemplate::query()
                    ->where('document_type', $type)
                    ->whereKeyNot($template->getKey())
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }
        });
    }

    private function documentTypes(): array
    {
        return [
            'quotation' => 'Quotation',
            'proforma_invoice' => 'Proforma Invoice',
            'sales_order' => 'Sales Order',
            'invoice' => 'Tax Invoice',
            'customer_payment' => 'Customer Payment Receipt',
            'sales_return' => 'Sales Return',
            'credit_note' => 'Credit Note',

            'purchase_order' => 'Purchase Order',
            'purchase_bill' => 'Purchase Bill',
            'expense' => 'Expense Voucher',
            'supplier_payment' => 'Supplier Payment Voucher',
            'debit_note' => 'Debit Note',

            'journal_voucher' => 'Journal Voucher',
            'cash_transfer' => 'Cash Transfer Voucher',
            'cheque_register' => 'Cheque Register',
            'loan_account' => 'Loan Account',
            'loan_topup' => 'Loan Top Up',
            'loan_charge' => 'Loan Charge',

            'warehouse_transfer' => 'Warehouse Transfer',
            'inventory_adjustment' => 'Inventory Adjustment',
            'product' => 'Product Sheet',
            'contact' => 'Contact Profile',
            'lead' => 'Lead Sheet',
            'deal' => 'Deal Sheet',
            'employee' => 'Employee Profile',
            'attendance' => 'Attendance Sheet',
            'leave_application' => 'Leave Application',
            'payslip' => 'Payslip',
            'project' => 'Project Sheet',
            'task' => 'Task Sheet',
        ];
    }

    private function htmlForType(string $type, string $label): string
    {
        return match ($type) {
            'quotation' => $this->quotationHtml(),
            'proforma_invoice' => $this->proformaInvoiceHtml(),
            'sales_order' => $this->salesOrderHtml(),
            'invoice' => $this->salesInvoiceHtml(),
            'customer_payment' => $this->customerPaymentHtml(),
            'sales_return' => $this->salesReturnHtml(),
            'credit_note' => $this->creditNoteHtml(),
            'purchase_order' => $this->purchaseOrderHtml(),
            'purchase_bill' => $this->purchaseBillHtml(),
            'expense' => $this->expenseHtml(),
            'supplier_payment' => $this->supplierPaymentHtml(),
            'debit_note' => $this->debitNoteHtml(),
            'journal_voucher' => $this->journalVoucherHtml(),
            'cash_transfer' => $this->cashTransferHtml(),
            'warehouse_transfer' => $this->warehouseTransferHtml(),
            'inventory_adjustment' => $this->inventoryAdjustmentHtml(),
            'cheque_register' => $this->chequeRegisterHtml(),
            'loan_account' => $this->loanAccountHtml(),
            'loan_topup' => $this->loanTopupHtml(),
            'loan_charge' => $this->loanChargeHtml(),
            'payslip' => $this->payslipHtml(),
            'attendance' => $this->attendanceHtml(),
            'leave_application' => $this->leaveApplicationHtml(),
            'project' => $this->projectHtml(),
            'task' => $this->taskHtml(),
            default => $this->simpleMasterTemplateHtml($label),
        };
    }

    private function salesInvoiceHtml(): string
    {
        return $this->wrap('Tax Invoice', <<<HTML
{$this->partyBlocks('Bill To', 'customer', 'Supply Details', [['Place of Supply', '{{branch.name}}'], ['Due Date', '{{document.due_date}}'], ['Currency', '{{currency.code}}'], ['Exchange Rate', '{{exchange_rate}}']])}
{$this->itemTable('Invoice Items', ['#', 'Item / Service', 'Qty', 'Rate', 'Discount', 'Tax', 'Line Total'])}
{$this->totalsBlock('Invoice Total', true)}
{$this->notesTermsHtml()}
HTML);
    }

    private function quotationHtml(): string
    {
        return $this->wrap('Quotation', <<<HTML
{$this->partyBlocks('Quote To', 'customer', 'Quotation Details', [['Valid Until', '{{document.due_date}}'], ['Reference', '{{document.reference}}'], ['Currency', '{{currency.code}}'], ['Status', '{{document.status}}']])}
{$this->itemTable('Quoted Products / Services', ['#', 'Description', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Quoted Amount'])}
{$this->totalsBlock('Quotation Value', false)}
{$this->termsPanel('Commercial Notes', 'Prices are valid until the stated validity date unless withdrawn in writing.')}
HTML);
    }

    private function proformaInvoiceHtml(): string
    {
        return $this->wrap('Proforma Invoice', <<<HTML
{$this->partyBlocks('Proforma For', 'customer', 'Commercial Reference', [['Proforma No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Due / Valid Until', '{{document.due_date}}'], ['Reference', '{{document.reference}}']])}
{$this->itemTable('Proforma Items', ['#', 'Item', 'Qty', 'Rate', 'Discount', 'Tax', 'Proforma Total'])}
{$this->totalsBlock('Estimated Payable', false)}
{$this->termsPanel('Payment Terms', 'This proforma invoice is not a tax invoice until converted and issued as an approved invoice.')}
HTML);
    }

    private function salesOrderHtml(): string
    {
        return $this->wrap('Sales Order', <<<HTML
{$this->partyBlocks('Customer', 'customer', 'Order Confirmation', [['Order No.', '{{document.number}}'], ['Order Date', '{{document.date}}'], ['Expected Delivery', '{{document.due_date}}'], ['Reference', '{{document.reference}}']])}
{$this->itemTable('Confirmed Order Lines', ['#', 'Item / Specification', 'Qty', 'Confirmed Rate', 'Discount', 'Tax', 'Order Value'])}
{$this->totalsBlock('Order Total', false)}
{$this->termsPanel('Order Terms', 'Goods and services are reserved against this order subject to approval, availability, and agreed payment terms.')}
HTML);
    }

    private function customerPaymentHtml(): string
    {
        return $this->wrap('Customer Payment Receipt', <<<HTML
{$this->partyBlocks('Received From', 'customer', 'Receipt Details', [['Payment Method', '{{payment.method}}'], ['Deposit Account', '{{payment.account}}'], ['Reference No.', '{{payment.reference_number}}'], ['Currency', '{{currency.code}}']])}
{$this->paymentAllocationTable('Invoice Allocation')}
{$this->amountPanel('Amount Received', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function salesReturnHtml(): string
    {
        return $this->wrap('Sales Return', <<<HTML
{$this->partyBlocks('Customer', 'customer', 'Return Reference', [['Return No.', '{{document.number}}'], ['Return Date', '{{document.date}}'], ['Reference Invoice', '{{document.reference}}'], ['Status', '{{document.status}}']])}
{$this->itemTable('Returned Items', ['#', 'Returned Item', 'Qty', 'Rate', 'Discount', 'Tax Reversal', 'Return Amount'])}
{$this->totalsBlock('Return Total', false)}
{$this->termsPanel('Return Notes', 'Returned goods are subject to inspection and approval before replacement, refund, or account adjustment.')}
HTML);
    }

    private function creditNoteHtml(): string
    {
        return $this->wrap('Credit Note', <<<HTML
{$this->partyBlocks('Credit To', 'customer', 'Credit Reference', [['Credit Note No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Reference Invoice', '{{document.reference}}'], ['Reason / Status', '{{document.status}}']])}
{$this->itemTable('Credit Adjustment Lines', ['#', 'Item / Reason', 'Qty', 'Rate', 'Discount', 'Tax Credit', 'Credit Amount'])}
{$this->totalsBlock('Total Credit', false)}
{$this->notesTermsHtml()}
HTML);
    }

    private function purchaseOrderHtml(): string
    {
        return $this->wrap('Purchase Order', <<<HTML
{$this->partyBlocks('Supplier', 'supplier', 'Delivery / Purchase Details', [['PO Number', '{{document.number}}'], ['PO Date', '{{document.date}}'], ['Expected Date', '{{document.due_date}}'], ['Delivery Branch', '{{branch.name}}'], ['Reference', '{{document.reference}}']])}
{$this->itemTable('Ordered Goods / Services', ['#', 'Item / Specification', 'Qty', 'Unit Cost', 'Discount', 'Tax', 'PO Amount'])}
{$this->totalsBlock('Purchase Order Total', false)}
{$this->termsPanel('Purchase Terms', 'Please quote this PO number on all invoices, delivery notes, and correspondence. Delivery is subject to inspection and acceptance.')}
HTML);
    }

    private function purchaseBillHtml(): string
    {
        return $this->wrap('Purchase Bill', <<<HTML
{$this->partyBlocks('Supplier / Vendor', 'supplier', 'Vendor Bill Details', [['Supplier Invoice Ref.', '{{document.reference}}'], ['Bill Date', '{{document.date}}'], ['Due Date', '{{document.due_date}}'], ['Currency', '{{currency.code}}']])}
{$this->itemTable('Vendor Bill Lines', ['#', 'Item / Expense', 'Qty', 'Rate', 'Discount', 'Input Tax', 'Bill Amount'])}
{$this->totalsBlock('Bill Summary', true)}
{$this->notesTermsHtml()}
HTML);
    }

    private function expenseHtml(): string
    {
        return $this->wrap('Expense Voucher', <<<HTML
{$this->partyBlocks('Paid To / Vendor', 'supplier', 'Expense Details', [['Expense No.', '{{document.number}}'], ['Expense Date', '{{document.date}}'], ['Paid Through', '{{payment.account}}'], ['Expense Account', '{{account.name}}'], ['Reference', '{{document.reference}}']])}
{$this->expenseTable()}
{$this->totalsBlock('Expense Summary', false)}
{$this->notesTermsHtml()}
HTML);
    }

    private function supplierPaymentHtml(): string
    {
        return $this->wrap('Supplier Payment Voucher', <<<HTML
{$this->partyBlocks('Paid To Supplier', 'supplier', 'Payment Details', [['Payment Method', '{{payment.method}}'], ['Source Account', '{{payment.source_account}}'], ['Reference No.', '{{payment.reference_number}}'], ['Payment Date', '{{document.date}}'], ['Currency', '{{currency.code}}']])}
{$this->paymentAllocationTable('Bill Allocation')}
{$this->amountPanel('Paid Amount', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function debitNoteHtml(): string
    {
        return $this->wrap('Debit Note', <<<HTML
{$this->partyBlocks('Supplier', 'supplier', 'Debit Reference', [['Debit Note No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Reference Bill / PO', '{{document.reference}}'], ['Status', '{{document.status}}']])}
{$this->itemTable('Debit Adjustment Lines', ['#', 'Item / Reason', 'Qty', 'Rate', 'Discount', 'Tax Debit', 'Debit Amount'])}
{$this->totalsBlock('Total Debit Amount', false)}
{$this->termsPanel('Reason / Notes', 'This debit note records an adjustment against supplier payable for returns, shortage, price variance, or agreed correction.')}
HTML);
    }

    private function journalVoucherHtml(): string
    {
        return $this->wrap('Journal Voucher', <<<HTML
{$this->twoColumnDetails('Voucher Details', [['Voucher No.', '{{document.number}}'], ['Voucher Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Accounting Context', [['Branch', '{{branch.name}}'], ['Prepared By', '{{prepared_by}}'], ['Approved By', '{{approved_by}}'], ['Currency', '{{currency.code}}']])}
{$this->journalTable()}
{$this->amountPanel('Voucher Total', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function cashTransferHtml(): string
    {
        return $this->wrap('Cash Transfer Voucher', <<<HTML
{$this->twoColumnDetails('Transfer Details', [['Transfer No.', '{{document.number}}'], ['Transfer Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Accounts', [['Source Account', '{{payment.source_account}}'], ['Destination Account', '{{payment.destination_account}}'], ['Transfer Amount', '{{totals.grand_total}}'], ['Currency', '{{currency.code}}']])}
{$this->transferTable()}
{$this->amountPanel('Transfer Amount', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function chequeRegisterHtml(): string
    {
        return $this->wrap('Cheque Register', <<<HTML
{$this->twoColumnDetails('Cheque Details', [['Cheque / Register No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Status', '{{document.status}}'], ['Reference', '{{document.reference}}']], 'Bank / Party', [['Bank Account', '{{account.name}}'], ['Party', '{{party.name}}'], ['Phone', '{{party.phone}}'], ['Email', '{{party.email}}']])}
{$this->amountPanel('Cheque Amount', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function loanAccountHtml(): string
    {
        return $this->wrap('Loan Account', <<<HTML
{$this->twoColumnDetails('Loan Account', [['Loan No.', '{{document.number}}'], ['Opened On', '{{document.date}}'], ['Status', '{{document.status}}'], ['Reference', '{{document.reference}}']], 'Borrower / Account', [['Party', '{{party.name}}'], ['Account', '{{account.name}}'], ['Currency', '{{currency.code}}'], ['Branch', '{{branch.name}}']])}
{$this->amountPanel('Loan Principal / Balance', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function loanTopupHtml(): string
    {
        return $this->wrap('Loan Top Up', <<<HTML
{$this->twoColumnDetails('Top Up Details', [['Top Up No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Loan Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Disbursement', [['Loan Account', '{{account.name}}'], ['Source Account', '{{payment.source_account}}'], ['Party', '{{party.name}}'], ['Currency', '{{currency.code}}']])}
{$this->amountPanel('Top Up Amount', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function loanChargeHtml(): string
    {
        return $this->wrap('Loan Charge', <<<HTML
{$this->twoColumnDetails('Charge Details', [['Charge No.', '{{document.number}}'], ['Charge Date', '{{document.date}}'], ['Loan Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Account Details', [['Loan Account', '{{account.name}}'], ['Party', '{{party.name}}'], ['Currency', '{{currency.code}}'], ['Branch', '{{branch.name}}']])}
{$this->itemTable('Charge Lines', ['#', 'Charge / Description', 'Qty', 'Rate', 'Discount', 'Tax', 'Charge Amount'])}
{$this->totalsBlock('Charge Summary', false)}
{$this->notesTermsHtml()}
HTML);
    }

    private function warehouseTransferHtml(): string
    {
        return $this->wrap('Warehouse Transfer', <<<HTML
{$this->twoColumnDetails('Transfer Document', [['Transfer No.', '{{document.number}}'], ['Transfer Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Warehouse Movement', [['Source Warehouse', '{{payment.source_account}}'], ['Destination Warehouse', '{{payment.destination_account}}'], ['Branch', '{{branch.name}}'], ['Prepared By', '{{prepared_by}}']])}
{$this->warehouseTable()}
{$this->notesTermsHtml()}
HTML);
    }

    private function inventoryAdjustmentHtml(): string
    {
        return $this->wrap('Inventory Adjustment', <<<HTML
{$this->twoColumnDetails('Adjustment Details', [['Adjustment No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Inventory Control', [['Warehouse', '{{payment.destination_account}}'], ['Adjustment Type', '{{document.title}}'], ['Branch', '{{branch.name}}'], ['Approved By', '{{approved_by}}']])}
{$this->adjustmentTable()}
{$this->notesTermsHtml()}
HTML);
    }

    private function payslipHtml(): string
    {
        return $this->wrap('Payslip', <<<HTML
{$this->partyBlocks('Employee', 'party', 'Payroll Period', [['Payslip No.', '{{document.number}}'], ['Pay Date', '{{document.date}}'], ['Period / Reference', '{{document.reference}}'], ['Status', '{{document.status}}']])}
{$this->journalTable('Earnings / Deductions')}
{$this->amountPanel('Net Pay', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function attendanceHtml(): string
    {
        return $this->wrap('Attendance Sheet', <<<HTML
{$this->partyBlocks('Employee', 'party', 'Attendance Details', [['Attendance No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']])}
{$this->simpleLinesTable('Attendance Entries', ['#', 'Date / Shift', 'Description', 'Hours / Qty', 'Status'])}
{$this->notesTermsHtml()}
HTML);
    }

    private function leaveApplicationHtml(): string
    {
        return $this->wrap('Leave Application', <<<HTML
{$this->partyBlocks('Employee', 'party', 'Leave Details', [['Application No.', '{{document.number}}'], ['Applied Date', '{{document.date}}'], ['Leave / Due Date', '{{document.due_date}}'], ['Status', '{{document.status}}']])}
{$this->simpleLinesTable('Leave Schedule', ['#', 'Leave Date / Type', 'Description', 'Days', 'Status'])}
{$this->notesTermsHtml()}
HTML);
    }

    private function projectHtml(): string
    {
        return $this->wrap('Project Sheet', <<<HTML
{$this->partyBlocks('Client / Stakeholder', 'party', 'Project Details', [['Project No.', '{{document.number}}'], ['Start Date', '{{document.date}}'], ['Due Date', '{{document.due_date}}'], ['Status', '{{document.status}}']])}
{$this->simpleLinesTable('Milestones / Tasks', ['#', 'Work Item', 'Description', 'Progress / Qty', 'Amount / Status'])}
{$this->amountPanel('Project Value', '{{totals.grand_total}}', '{{totals.amount_in_words}}')}
{$this->notesTermsHtml()}
HTML);
    }

    private function taskHtml(): string
    {
        return $this->wrap('Task Sheet', <<<HTML
{$this->twoColumnDetails('Task Details', [['Task No.', '{{document.number}}'], ['Created Date', '{{document.date}}'], ['Due Date', '{{document.due_date}}'], ['Status', '{{document.status}}']], 'Assignment', [['Assigned Party', '{{party.name}}'], ['Reference', '{{document.reference}}'], ['Branch', '{{branch.name}}'], ['Prepared By', '{{prepared_by}}']])}
{$this->simpleLinesTable('Task Checklist / Work Log', ['#', 'Activity', 'Description', 'Qty / Hours', 'Status'])}
{$this->notesTermsHtml()}
HTML);
    }

    private function simpleMasterTemplateHtml(string $label): string
    {
        return $this->wrap($label, <<<HTML
{$this->twoColumnDetails('Record Details', [['Record No.', '{{document.number}}'], ['Date', '{{document.date}}'], ['Reference', '{{document.reference}}'], ['Status', '{{document.status}}']], 'Related Party / Account', [['Name', '{{party.name}}'], ['Account', '{{account.name}}'], ['Phone', '{{party.phone}}'], ['Email', '{{party.email}}']])}
{$this->simpleLinesTable('Record Lines / Attributes', ['#', 'Name', 'Description', 'Quantity / Value', 'Amount / Status'])}
{$this->notesTermsHtml()}
HTML);
    }

    private function wrap(string $label, string $body): string
    {
        return trim(<<<HTML
<table style="width:100%; min-height:297mm; background:#ffffff; color:#111827; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.45; box-sizing:border-box; border-collapse:collapse;">
    <tr>
        <td style="padding:24px 30px; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    <td style="vertical-align:top;">
{$this->companyHeaderHtml($label)}
{$body}
{$this->signatureHtml()}
{$this->footerHtml()}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
HTML);
    }

    private function companyHeaderHtml(string $label): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:18px; border-bottom:2px solid #111827;">
    <tr>
        <td style="width:58%; padding:0 20px 16px 0; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    <td style="vertical-align:top;">
                        <div style="margin-bottom:8px;">
                            {{#company.logo}}
                                <img src="{{company.logo}}" alt="{{company.name}}" style="display:block; max-width:82px; max-height:70px; object-fit:contain; margin-bottom:7px;">
                            {{/company.logo}}

                            {{^company.logo}}
                                <span style="display:block; width:72px; height:54px; border:1px solid #d1d5db; text-align:center; line-height:54px; font-size:11px; font-weight:700; color:#6b7280; margin-bottom:7px;">
                                    LOGO
                                </span>
                            {{/company.logo}}

                            <strong style="display:block; font-size:20px; line-height:1.15; color:#111827; font-weight:800;">
                                {{company.name}}
                            </strong>

                            {{#company.legal_name}}
                                <span style="display:block; margin-top:2px; color:#4b5563; font-size:11px;">
                                    {{company.legal_name}}
                                </span>
                            {{/company.legal_name}}
                        </div>

                        {{#company.address}}
                            <span style="display:block; color:#4b5563;">{{company.address}}</span>
                        {{/company.address}}

                        <span style="display:block; color:#4b5563;">
                            {{company.phone}}{{#company.email}} | {{company.email}}{{/company.email}}{{#company.website}} | {{company.website}}{{/company.website}}
                        </span>

                        <span style="display:block; color:#4b5563;">
                            {{#company.pan_or_vat}}PAN/VAT: <strong style="color:#111827;">{{company.pan_or_vat}}</strong>{{/company.pan_or_vat}}{{#company.registration_number}} | Reg: {{company.registration_number}}{{/company.registration_number}}
                        </span>

                        {{#branch.name}}
                            <span style="display:block; color:#4b5563;">
                                Branch: <strong style="color:#111827;">{{branch.name}}</strong>{{#branch.address}} | {{branch.address}}{{/branch.address}}
                            </span>
                        {{/branch.name}}
                    </td>
                </tr>
            </table>
        </td>

        <td style="width:42%; padding:0 0 16px 0; text-align:right; vertical-align:top;">
            <h2 style="margin:0 0 10px 0; font-size:22px; line-height:1.1; font-weight:800; text-transform:uppercase; color:#111827;">
                {$label}
            </h2>

            <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                <tr>
                    <th style="width:42%; padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Document No.</th>
                    <td style="padding:6px 8px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{document.number}}</td>
                </tr>
                <tr>
                    <th style="padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Date</th>
                    <td style="padding:6px 8px; border:1px solid #d1d5db; text-align:right;">{{document.date}}</td>
                </tr>
                <tr>
                    <th style="padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Status</th>
                    <td style="padding:6px 8px; border:1px solid #d1d5db; text-align:right;">{{document.status}}</td>
                </tr>
                <tr>
                    <th style="padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Reference</th>
                    <td style="padding:6px 8px; border:1px solid #d1d5db; text-align:right;">{{document.reference}}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>
HTML;
    }

    private function partyBlocks(string $partyTitle, string $partyKey, string $detailTitle, array $details): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px;">
    <tr>
        <td style="width:50%; padding:0 7px 0 0; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                <tr><th colspan="2" style="padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">{$partyTitle}</th></tr>
                <tr><td style="width:88px; padding:6px 8px; border:1px solid #d1d5db; background:#fafafa; font-weight:700;">Name</td><td style="padding:6px 8px; border:1px solid #d1d5db;"><strong>{{{$partyKey}.name}}</strong></td></tr>
                <tr><td style="padding:6px 8px; border:1px solid #d1d5db; background:#fafafa; font-weight:700;">Address</td><td style="padding:6px 8px; border:1px solid #d1d5db;">{{{$partyKey}.address}}</td></tr>
                <tr><td style="padding:6px 8px; border:1px solid #d1d5db; background:#fafafa; font-weight:700;">Phone</td><td style="padding:6px 8px; border:1px solid #d1d5db;">{{{$partyKey}.phone}}</td></tr>
                <tr><td style="padding:6px 8px; border:1px solid #d1d5db; background:#fafafa; font-weight:700;">Email</td><td style="padding:6px 8px; border:1px solid #d1d5db;">{{{$partyKey}.email}}</td></tr>
            </table>
        </td>
        <td style="width:50%; padding:0 0 0 7px; vertical-align:top;">
{$this->detailsTable($detailTitle, $details)}
        </td>
    </tr>
</table>
HTML;
    }

    private function twoColumnDetails(string $leftTitle, array $leftRows, string $rightTitle, array $rightRows): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px;">
    <tr>
        <td style="width:50%; padding:0 7px 0 0; vertical-align:top;">{$this->detailsTable($leftTitle, $leftRows)}</td>
        <td style="width:50%; padding:0 0 0 7px; vertical-align:top;">{$this->detailsTable($rightTitle, $rightRows)}</td>
    </tr>
</table>
HTML;
    }

    private function detailsTable(string $title, array $rows): string
    {
        $html = '<table style="width:100%; border-collapse:collapse; border:1px solid #111827;">';
        $html .= '<tr><th colspan="2" style="padding:6px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">'.$title.'</th></tr>';

        foreach ($rows as [$label, $value]) {
            $html .= '<tr><td style="width:38%; padding:6px 8px; border:1px solid #d1d5db; background:#fafafa; font-weight:700;">'.$label.'</td><td style="padding:6px 8px; border:1px solid #d1d5db;">'.$value.'</td></tr>';
        }

        return $html.'</table>';
    }

    private function itemTable(string $title, array $headers): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827; table-layout:fixed;">
    <tr><th colspan="7" style="padding:7px 8px; border:1px solid #d1d5db; background:#111827; color:#ffffff; text-align:left; text-transform:uppercase;">{$title}</th></tr>
    <tr>
        <th style="width:34px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:center;">{$headers[0]}</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">{$headers[1]}</th>
        <th style="width:64px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[2]}</th>
        <th style="width:92px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[3]}</th>
        <th style="width:82px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[4]}</th>
        <th style="width:82px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[5]}</th>
        <th style="width:105px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[6]}</th>
    </tr>
    {{#items}}
    <tr>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
        <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{product_name}}</strong><br><span style="color:#4b5563;">{{description}}</span></td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{qty}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{unit_price}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{discount_amount}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{tax_amount}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{line_total}}</td>
    </tr>
    {{/items}}
</table>
HTML;
    }

    private function expenseTable(): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th colspan="6" style="padding:7px 8px; border:1px solid #d1d5db; background:#111827; color:#ffffff; text-align:left; text-transform:uppercase;">Expense Lines</th></tr>
    <tr>
        <th style="width:34px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6;">#</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Expense Category / Account</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Description</th>
        <th style="width:95px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Tax</th>
        <th style="width:105px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Tax Amount</th>
        <th style="width:112px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Amount</th>
    </tr>
    {{#items}}
    <tr>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
        <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{product_name}}</strong></td>
        <td style="padding:7px; border:1px solid #d1d5db;">{{description}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{tax}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{tax_amount}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{amount}}</td>
    </tr>
    {{/items}}
</table>
HTML;
    }

    private function paymentAllocationTable(string $title): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th colspan="5" style="padding:7px 8px; border:1px solid #d1d5db; background:#111827; color:#ffffff; text-align:left; text-transform:uppercase;">{$title}</th></tr>
    <tr>
        <th style="width:34px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6;">#</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Reference Bill / Invoice</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Description</th>
        <th style="width:130px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Allocated</th>
        <th style="width:130px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Amount</th>
    </tr>
    {{#lines}}
    <tr>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
        <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{product_name}}</strong></td>
        <td style="padding:7px; border:1px solid #d1d5db;">{{description}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{allocated_amount}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{amount}}</td>
    </tr>
    {{/lines}}
</table>
HTML;
    }

    private function journalTable(string $title = 'Debit / Credit Lines'): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th colspan="6" style="padding:7px 8px; border:1px solid #d1d5db; background:#111827; color:#ffffff; text-align:left; text-transform:uppercase;">{$title}</th></tr>
    <tr>
        <th style="width:34px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6;">#</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Account / Component</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Narration</th>
        <th style="width:110px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Debit</th>
        <th style="width:110px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Credit</th>
        <th style="width:110px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">Amount</th>
    </tr>
    {{#lines}}
    <tr>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
        <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{product_name}}</strong></td>
        <td style="padding:7px; border:1px solid #d1d5db;">{{description}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{debit}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{credit}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{amount}}</td>
    </tr>
    {{/lines}}
</table>
HTML;
    }

    private function transferTable(): string
    {
        return $this->simpleLinesTable('Transfer Breakdown', ['#', 'Source', 'Destination', 'Reference / Memo', 'Amount']);
    }

    private function warehouseTable(): string
    {
        return $this->simpleLinesTable('Transferred Items', ['#', 'Item / SKU', 'Description', 'Transfer Qty', 'Unit / Value']);
    }

    private function adjustmentTable(): string
    {
        return $this->simpleLinesTable('Adjustment Lines', ['#', 'Item / SKU', 'Warehouse / Reason', 'Increase / Decrease Qty', 'Value Impact']);
    }

    private function simpleLinesTable(string $title, array $headers): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th colspan="5" style="padding:7px 8px; border:1px solid #d1d5db; background:#111827; color:#ffffff; text-align:left; text-transform:uppercase;">{$title}</th></tr>
    <tr>
        <th style="width:34px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6;">{$headers[0]}</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">{$headers[1]}</th>
        <th style="padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">{$headers[2]}</th>
        <th style="width:135px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[3]}</th>
        <th style="width:135px; padding:7px; border:1px solid #d1d5db; background:#f3f4f6; text-align:right;">{$headers[4]}</th>
    </tr>
    {{#lines}}
    <tr>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:center;">{{@index}}</td>
        <td style="padding:7px; border:1px solid #d1d5db;"><strong>{{product_name}}</strong></td>
        <td style="padding:7px; border:1px solid #d1d5db;">{{description}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right;">{{qty}}</td>
        <td style="padding:7px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{amount}}</td>
    </tr>
    {{/lines}}
</table>
HTML;
    }

    private function totalsBlock(string $title, bool $showPaid): string
    {
        $paidRows = $showPaid ? <<<HTML
                <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; text-align:left;">Paid</th><td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{totals.paid}}</td></tr>
                <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#fff7f7; color:#991b1b; text-align:left;">Balance</th><td style="padding:7px 8px; border:1px solid #d1d5db; background:#fff7f7; color:#991b1b; text-align:right; font-weight:700;">{{totals.balance}}</td></tr>
HTML : '';

        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px;">
    <tr>
        <td style="width:58%; padding-right:16px; vertical-align:top;">
            {{#totals.amount_in_words}}<table style="width:100%; border-collapse:collapse; border:1px solid #111827;"><tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Amount in Words</th></tr><tr><td style="padding:8px; border:1px solid #d1d5db; font-weight:700;">{{totals.amount_in_words}}</td></tr></table>{{/totals.amount_in_words}}
        </td>
        <td style="width:42%; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #111827;">
                <tr><th colspan="2" style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">{$title}</th></tr>
                <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; text-align:left;">Subtotal</th><td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{totals.subtotal}}</td></tr>
                <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; text-align:left;">Discount</th><td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{totals.discount}}</td></tr>
                <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#fafafa; text-align:left;">Tax</th><td style="padding:7px 8px; border:1px solid #d1d5db; text-align:right; font-weight:700;">{{totals.tax}}</td></tr>
                <tr><th style="padding:8px; border:1px solid #111827; background:#111827; color:#ffffff; text-align:left;">Grand Total</th><td style="padding:8px; border:1px solid #111827; background:#111827; color:#ffffff; text-align:right; font-weight:800;">{{totals.grand_total}}</td></tr>
{$paidRows}
            </table>
        </td>
    </tr>
</table>
HTML;
    }

    private function amountPanel(string $title, string $amount, string $words): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th style="width:28%; padding:8px; border:1px solid #111827; background:#111827; color:#ffffff; text-align:left;">{$title}</th><td style="padding:8px; border:1px solid #111827; text-align:right; font-size:16px; font-weight:800;">{$amount}</td></tr>
    <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left;">Amount in Words</th><td style="padding:7px 8px; border:1px solid #d1d5db; font-weight:700;">{$words}</td></tr>
</table>
HTML;
    }

    private function notesTermsHtml(): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px;">
    <tr>
        <td style="width:50%; padding:0 7px 0 0; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #111827;"><tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">Notes</th></tr><tr><td style="height:58px; padding:8px; border:1px solid #d1d5db; white-space:pre-wrap;">{{document.notes}}</td></tr></table>
        </td>
        <td style="width:50%; padding:0 0 0 7px; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse; border:1px solid #111827;"><tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">Terms</th></tr><tr><td style="height:58px; padding:8px; border:1px solid #d1d5db; white-space:pre-wrap;">{{document.terms}}</td></tr></table>
        </td>
    </tr>
</table>
HTML;
    }

    private function termsPanel(string $title, string $fallback): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-bottom:13px; border:1px solid #111827;">
    <tr><th style="padding:7px 8px; border:1px solid #d1d5db; background:#f3f4f6; text-align:left; text-transform:uppercase;">{$title}</th></tr>
    <tr><td style="height:58px; padding:8px; border:1px solid #d1d5db; white-space:pre-wrap;">{{document.terms}}{{^document.terms}}{$fallback}{{/document.terms}}<br>{{document.notes}}</td></tr>
</table>
HTML;
    }

    private function signatureHtml(): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; margin-top:42px; margin-bottom:22px;">
    <tr>
        <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;"><span style="display:block; height:1px; margin-bottom:7px; background:#111827;"></span><strong style="color:#111827; text-transform:uppercase;">Prepared By</strong>{{#prepared_by}}<br>{{prepared_by}}{{/prepared_by}}</td>
        <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;"><span style="display:block; height:1px; margin-bottom:7px; background:#111827;"></span><strong style="color:#111827; text-transform:uppercase;">Approved By</strong>{{#approved_by}}<br>{{approved_by}}{{/approved_by}}</td>
        <td style="width:33.333%; padding:0 24px; text-align:center; color:#4b5563;"><span style="display:block; height:1px; margin-bottom:7px; background:#111827;"></span><strong style="color:#111827; text-transform:uppercase;">Received By</strong></td>
    </tr>
</table>
HTML;
    }

    private function footerHtml(): string
    {
        return <<<HTML
<table style="width:100%; border-collapse:collapse; border-top:1px solid #111827;">
    <tr>
        <td style="padding-top:7px; color:#4b5563; font-size:10px;"><strong style="color:#111827;">{{company.name}}</strong>{{#company.footer}} | {{company.footer}}{{/company.footer}}</td>
        <td style="padding-top:7px; color:#4b5563; font-size:10px; text-align:right;">Printed: {{printed_at}}</td>
    </tr>
</table>
HTML;
    }
}