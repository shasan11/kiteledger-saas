<?php

namespace Database\Seeders;

use App\Models\PrintingTemplate;
use Illuminate\Database\Seeder;

class PrintingTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->documentTypes() as $type => $label) {
            PrintingTemplate::query()->updateOrCreate(
                ['document_type' => $type, 'template_key' => "{$type}_standard"],
                [
                    'name' => "{$label} Standard Print",
                    'template_html' => $this->html($label, $type),
                    'template_css' => $this->css(),
                    'is_default' => true,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ]
            );
        }
    }

    private function documentTypes(): array
    {
        return [
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

    private function html(string $label, string $type): string
    {
        return <<<HTML
<section class="print-document">
  <header class="doc-header">
    <div>
      <h1>{{company_name}}</h1>
      <p>{{company_address}}</p>
      <p>{{company_phone}} | {{company_email}}</p>
    </div>
    <div class="doc-meta">
      <h2>{$label}</h2>
      <p><strong>No:</strong> {{document_number}}</p>
      <p><strong>Date:</strong> {{document_date}}</p>
      <p><strong>Status:</strong> {{status}}</p>
    </div>
  </header>

  <section class="party">
    <h3>{{party_label}}</h3>
    <p><strong>{{party_name}}</strong></p>
    <p>{{party_address}}</p>
    <p>{{party_tax_number}}</p>
  </section>

  <table class="lines">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Tax</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{line_items}}
    </tbody>
  </table>

  <section class="totals">
    <p><span>Subtotal</span><strong>{{subtotal}}</strong></p>
    <p><span>Tax</span><strong>{{tax_total}}</strong></p>
    <p><span>Discount</span><strong>{{discount_total}}</strong></p>
    <p class="grand"><span>Total</span><strong>{{grand_total}}</strong></p>
  </section>

  <footer>
    <p>{{notes}}</p>
    <p class="muted">Generated from KiteLedger {$type} template.</p>
  </footer>
</section>
HTML;
    }

    private function css(): string
    {
        return <<<CSS
.print-document { font-family: Arial, sans-serif; color: #111827; font-size: 12px; }
.doc-header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
h1, h2, h3 { margin: 0 0 6px; }
p { margin: 2px 0; }
.doc-meta { text-align: right; min-width: 220px; }
.party { margin-bottom: 16px; }
.lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.lines th, .lines td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
.lines th { background: #f3f4f6; text-align: left; }
.num { text-align: right; }
.totals { width: 300px; margin-left: auto; }
.totals p { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 5px 0; }
.totals .grand { font-size: 14px; border-bottom: 2px solid #111827; }
footer { margin-top: 26px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
.muted { color: #6b7280; font-size: 11px; }
CSS;
    }
}
