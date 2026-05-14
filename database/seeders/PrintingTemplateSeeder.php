<?php

namespace Database\Seeders;

use App\Models\PrintingTemplate;
use Illuminate\Database\Seeder;

class PrintingTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->documentTypes() as $type => $label) {
            $template = PrintingTemplate::query()
                ->where('document_type', $type)
                ->where('template_key', "{$type}.default")
                ->first();

            $attributes = [
                    'name' => "{$label} Default Print",
                    'template_html' => $this->html($label, $type),
                    'template_css' => $this->css(),
                    'is_default' => true,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
            ];

            if (!$template) {
                PrintingTemplate::query()->create([
                    'document_type' => $type,
                    'template_key' => "{$type}.default",
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
                ->where('template_key', "{$type}_standard")
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }
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

    private function html(string $label, string $type): string
    {
        return <<<HTML
<section class="print-document">
  <header class="doc-header">
    <div class="company">
      <h1>{{company.name}}</h1>
      <p>{{company.address}}</p>
      <p>{{company.phone}} | {{company.email}}</p>
      <p>{{company.website}}</p>
      <p><strong>Tax ID:</strong> {{company.tax_id}}</p>
    </div>
    <div class="doc-meta">
      <h2>{$label}</h2>
      <p><strong>No:</strong> {{document.number}}</p>
      <p><strong>Date:</strong> {{document.date}}</p>
      <p><strong>Status:</strong> {{document.status}}</p>
      <p><strong>Reference:</strong> {{document.reference}}</p>
    </div>
  </header>

  <section class="party">
    <h3>Party Details</h3>
    <p><strong>{{party.name}}</strong></p>
    <p>{{party.address}}</p>
    <p>{{party.phone}} | {{party.email}}</p>
    <p><strong>Tax ID:</strong> {{party.tax_id}}</p>
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
      {{#lines}}
      <tr>
        <td>{{@index}}</td>
        <td>{{product_name}}<br><span>{{description}}</span></td>
        <td class="num">{{qty}}</td>
        <td class="num">{{unit_price}}</td>
        <td class="num">{{tax_amount}}</td>
        <td class="num">{{line_total}}</td>
      </tr>
      {{/lines}}
    </tbody>
  </table>

  <section class="totals">
    <p><span>Subtotal</span><strong>{{totals.subtotal}}</strong></p>
    <p><span>Discount</span><strong>{{totals.discount}}</strong></p>
    <p><span>Tax</span><strong>{{totals.tax}}</strong></p>
    <p class="grand"><span>Grand Total</span><strong>{{totals.grand_total}}</strong></p>
  </section>

  <section class="notes">
    <h3>Notes / Terms</h3>
    <p>{{document.notes}}</p>
    <p>{{document.terms}}</p>
  </section>

  <footer class="signatures">
    <div><span>Prepared By</span></div>
    <div><span>Approved By</span></div>
    <div><span>Received By</span></div>
  </footer>
</section>
HTML;
    }

    private function css(): string
    {
        return <<<CSS
.print-document { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
.doc-header { display: flex; justify-content: space-between; gap: 28px; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 18px; }
h1, h2, h3 { margin: 0 0 6px; letter-spacing: 0; }
h1 { font-size: 24px; }
h2 { font-size: 22px; text-transform: uppercase; }
h3 { font-size: 13px; color: #374151; }
p { margin: 2px 0; }
.doc-meta { text-align: right; min-width: 220px; }
.party { margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; background: #f9fafb; }
.lines { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.lines th, .lines td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
.lines th { background: #f3f4f6; text-align: left; }
.lines td span { color: #6b7280; font-size: 11px; }
.num { text-align: right; }
.totals { width: 320px; margin-left: auto; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
.totals p { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 5px 0; }
.totals span, .totals strong { padding: 2px 10px; }
.totals .grand { font-size: 14px; border-bottom: 0; background: #f3f4f6; }
.notes { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; min-height: 52px; }
.signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
.signatures div { border-top: 1px solid #111827; padding-top: 8px; text-align: center; color: #374151; font-weight: 700; }
@media print { .print-document { page-break-inside: avoid; } }
CSS;
    }
}
