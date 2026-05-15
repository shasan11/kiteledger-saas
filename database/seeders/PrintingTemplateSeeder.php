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
<div class="kl-doc">

  <!-- WATERMARK (shown only when document.void or not document.approved) -->
  {{#document.void}}
  <div class="kl-watermark kl-watermark--void">VOID</div>
  {{/document.void}}

  {{#document.is_draft}}
  <div class="kl-watermark kl-watermark--draft">DRAFT</div>
  {{/document.is_draft}}

  <!-- ====== HEADER ====== -->
  <header class="kl-header">

    <div class="kl-company">
      {{#company.logo}}
      <img src="{{company.logo}}" alt="Company Logo" class="kl-logo" />
      {{/company.logo}}
      <div class="kl-company-info">
        <div class="kl-company-name">{{company.name}}</div>
        <div class="kl-company-detail">{{company.address}}</div>
        <div class="kl-company-detail">{{company.phone}}{{#company.email}} &bull; {{company.email}}{{/company.email}}</div>
        {{#company.website}}<div class="kl-company-detail">{{company.website}}</div>{{/company.website}}
        {{#company.pan_or_vat}}<div class="kl-company-detail"><strong>PAN/VAT:</strong> {{company.pan_or_vat}}</div>{{/company.pan_or_vat}}
        {{#branch.name}}<div class="kl-branch-tag">Branch: {{branch.name}}</div>{{/branch.name}}
      </div>
    </div>

    <div class="kl-doc-id">
      <div class="kl-doc-title">{$label}</div>
      <table class="kl-id-table">
        <tr><td>Number</td><td><strong>{{document.number}}</strong></td></tr>
        <tr><td>Date</td><td>{{document.date}}</td></tr>
        {{#document.due_date}}<tr><td>Due / Ref</td><td>{{document.due_date}}</td></tr>{{/document.due_date}}
        <tr>
          <td>Status</td>
          <td>
            <span class="kl-badge kl-badge--status">{{document.status}}</span>
            {{#document.approved}}<span class="kl-badge kl-badge--approved">Approved</span>{{/document.approved}}
            {{#document.void}}<span class="kl-badge kl-badge--void">Voided</span>{{/document.void}}
          </td>
        </tr>
        {{#document.reference}}<tr><td>Reference</td><td>{{document.reference}}</td></tr>{{/document.reference}}
      </table>
    </div>

  </header>

  <!-- ====== PARTY (Customer / Supplier / Account) ====== -->
  {{#customer.name}}
  <section class="kl-party-row">
    <div class="kl-party">
      <div class="kl-party-label">Bill To</div>
      <div class="kl-party-name">{{customer.name}}</div>
      {{#customer.address}}<div class="kl-party-detail">{{customer.address}}</div>{{/customer.address}}
      {{#customer.phone}}<div class="kl-party-detail">{{customer.phone}}</div>{{/customer.phone}}
      {{#customer.email}}<div class="kl-party-detail">{{customer.email}}</div>{{/customer.email}}
    </div>
  </section>
  {{/customer.name}}

  {{#supplier.name}}
  <section class="kl-party-row">
    <div class="kl-party">
      <div class="kl-party-label">Supplier</div>
      <div class="kl-party-name">{{supplier.name}}</div>
      {{#supplier.address}}<div class="kl-party-detail">{{supplier.address}}</div>{{/supplier.address}}
      {{#supplier.phone}}<div class="kl-party-detail">{{supplier.phone}}</div>{{/supplier.phone}}
      {{#supplier.email}}<div class="kl-party-detail">{{supplier.email}}</div>{{/supplier.email}}
    </div>
  </section>
  {{/supplier.name}}

  {{#account.name}}
  <section class="kl-party-row">
    <div class="kl-party">
      <div class="kl-party-label">Account</div>
      <div class="kl-party-name">{{account.name}}</div>
    </div>
  </section>
  {{/account.name}}

  {{#party.name}}
  <section class="kl-party-row">
    <div class="kl-party">
      <div class="kl-party-label">Party</div>
      <div class="kl-party-name">{{party.name}}</div>
      {{#party.address}}<div class="kl-party-detail">{{party.address}}</div>{{/party.address}}
      {{#party.phone}}<div class="kl-party-detail">{{party.phone}}</div>{{/party.phone}}
      {{#party.email}}<div class="kl-party-detail">{{party.email}}</div>{{/party.email}}
    </div>
  </section>
  {{/party.name}}

  <!-- ====== PAYMENT DETAILS (for payment documents) ====== -->
  {{#payment.method}}
  <section class="kl-payment-details">
    <span><strong>Payment Method:</strong> {{payment.method}}</span>
    {{#payment.account}}<span style="margin-left:16px"><strong>Account:</strong> {{payment.account}}</span>{{/payment.account}}
  </section>
  {{/payment.method}}

  <!-- ====== LINE ITEMS ====== -->
  {{#lines}}
  <table class="kl-lines">
    <thead>
      <tr>
        <th class="kl-col-num">#</th>
        <th>Item / Description</th>
        <th class="kl-col-right">Qty</th>
        <th class="kl-col-right">Unit Price</th>
        <th class="kl-col-right">Discount</th>
        <th class="kl-col-right">Tax</th>
        <th class="kl-col-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#lines}}
      <tr>
        <td class="kl-col-num">{{@index}}</td>
        <td>
          <div class="kl-item-name">{{product_name}}</div>
          {{#description}}<div class="kl-item-desc">{{description}}</div>{{/description}}
        </td>
        <td class="kl-col-right">{{qty}}</td>
        <td class="kl-col-right">{{unit_price}}</td>
        <td class="kl-col-right">{{discount_amount}}</td>
        <td class="kl-col-right">{{tax_amount}}</td>
        <td class="kl-col-right kl-fw-bold">{{line_total}}</td>
      </tr>
      {{/lines}}
    </tbody>
  </table>
  {{/lines}}

  <!-- ====== TOTALS ====== -->
  <div class="kl-totals-wrap">
    <div class="kl-totals">
      <div class="kl-totals-row"><span>Subtotal</span><span>{{totals.subtotal}}</span></div>
      <div class="kl-totals-row"><span>Discount</span><span>{{totals.discount}}</span></div>
      <div class="kl-totals-row"><span>Tax</span><span>{{totals.tax}}</span></div>
      <div class="kl-totals-row kl-totals-grand"><span>Grand Total</span><span>{{totals.grand_total}}</span></div>
      {{#totals.paid}}<div class="kl-totals-row"><span>Amount Paid</span><span>{{totals.paid}}</span></div>{{/totals.paid}}
      {{#totals.balance}}<div class="kl-totals-row kl-totals-balance"><span>Balance Due</span><span>{{totals.balance}}</span></div>{{/totals.balance}}
    </div>
  </div>

  <!-- ====== CURRENCY / EXCHANGE RATE ====== -->
  {{#currency.code}}
  <div class="kl-currency-row">
    Currency: <strong>{{currency.code}}</strong>{{#exchange_rate}} &bull; Exchange Rate: {{exchange_rate}}{{/exchange_rate}}
  </div>
  {{/currency.code}}

  <!-- ====== NOTES / TERMS ====== -->
  {{#document.notes}}
  <div class="kl-notes">
    <div class="kl-notes-label">Notes</div>
    <div class="kl-notes-text">{{document.notes}}</div>
  </div>
  {{/document.notes}}

  {{#document.terms}}
  <div class="kl-notes">
    <div class="kl-notes-label">Terms &amp; Conditions</div>
    <div class="kl-notes-text">{{document.terms}}</div>
  </div>
  {{/document.terms}}

  {{#document.void}}
  <div class="kl-void-reason">
    <strong>Void Reason:</strong> {{document.voided_reason}}
  </div>
  {{/document.void}}

  <!-- ====== SIGNATURES ====== -->
  <div class="kl-signatures">
    <div class="kl-sig">
      <div class="kl-sig-line"></div>
      <div class="kl-sig-label">Prepared By</div>
      {{#prepared_by}}<div class="kl-sig-name">{{prepared_by}}</div>{{/prepared_by}}
    </div>
    <div class="kl-sig">
      <div class="kl-sig-line"></div>
      <div class="kl-sig-label">Approved By</div>
      {{#approved_by}}<div class="kl-sig-name">{{approved_by}}</div>{{/approved_by}}
    </div>
    <div class="kl-sig">
      <div class="kl-sig-line"></div>
      <div class="kl-sig-label">Received By</div>
    </div>
  </div>

  <!-- ====== FOOTER ====== -->
  <footer class="kl-footer">
    <span>{{company.name}}</span>
    {{#company.phone}}<span> &bull; {{company.phone}}</span>{{/company.phone}}
    {{#company.email}}<span> &bull; {{company.email}}</span>{{/company.email}}
    {{#printed_at}}<span style="float:right">Printed: {{printed_at}}</span>{{/printed_at}}
  </footer>

</div>
HTML;
    }

    private function css(): string
    {
        return <<<CSS
/* ===== KiteLedger Print Template ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.kl-doc {
  position: relative;
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
  color: #1a1a2e;
  font-size: 11.5px;
  line-height: 1.5;
  padding: 28px 32px;
  min-height: 297mm;
  background: #fff;
}

/* ---- WATERMARK ---- */
.kl-watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 96px;
  font-weight: 900;
  letter-spacing: 12px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
}
.kl-watermark--void  { color: #c0392b; }
.kl-watermark--draft { color: #7f8c8d; }

/* ---- HEADER ---- */
.kl-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 3px solid #1a1a2e;
  margin-bottom: 20px;
}

.kl-logo {
  height: 60px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
  margin-bottom: 8px;
  display: block;
}

.kl-company { max-width: 55%; }

.kl-company-name {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 4px;
  line-height: 1.2;
}

.kl-company-detail {
  color: #4a4a6a;
  font-size: 11px;
  line-height: 1.45;
}

.kl-branch-tag {
  display: inline-block;
  margin-top: 6px;
  background: #e8e8f0;
  color: #4a4a6a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
}

/* ---- DOC ID block ---- */
.kl-doc-id { text-align: right; min-width: 220px; }

.kl-doc-title {
  font-size: 26px;
  font-weight: 900;
  color: #1a1a2e;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.kl-id-table { width: 100%; border-collapse: collapse; margin-left: auto; }

.kl-id-table td {
  padding: 2px 4px;
  font-size: 11px;
  color: #333;
  vertical-align: top;
}

.kl-id-table td:first-child {
  color: #777;
  white-space: nowrap;
  text-align: right;
  padding-right: 8px;
  width: 70px;
}

/* ---- BADGES ---- */
.kl-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 4px;
}

.kl-badge--status   { background: #e8f4fd; color: #2980b9; }
.kl-badge--approved { background: #d4efdf; color: #1e8449; }
.kl-badge--void     { background: #fdecea; color: #c0392b; border: 1px solid #c0392b; }

/* ---- PARTY ---- */
.kl-party-row { margin-bottom: 16px; }

.kl-party {
  display: inline-block;
  border: 1px solid #d5d5e5;
  border-radius: 6px;
  padding: 10px 14px;
  background: #f8f8fc;
  min-width: 240px;
}

.kl-party-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
  margin-bottom: 4px;
}

.kl-party-name { font-size: 13px; font-weight: 700; color: #1a1a2e; }

.kl-party-detail { font-size: 11px; color: #555; margin-top: 2px; }

/* ---- PAYMENT DETAILS ---- */
.kl-payment-details {
  margin-bottom: 14px;
  padding: 8px 12px;
  background: #f0f4ff;
  border-left: 3px solid #3a5bde;
  border-radius: 0 4px 4px 0;
  font-size: 11px;
  color: #2c3e7a;
}

/* ---- LINE ITEMS TABLE ---- */
.kl-lines {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 11px;
}

.kl-lines th {
  background: #1a1a2e;
  color: #fff;
  padding: 7px 9px;
  text-align: left;
  font-weight: 700;
  font-size: 10.5px;
  letter-spacing: 0.3px;
}

.kl-lines td {
  border-bottom: 1px solid #e5e5ef;
  padding: 7px 9px;
  vertical-align: top;
  color: #222;
}

.kl-lines tr:nth-child(even) td { background: #f8f8fc; }
.kl-lines tr:last-child td      { border-bottom: 2px solid #1a1a2e; }

.kl-col-num   { width: 30px; text-align: center !important; }
.kl-col-right { text-align: right !important; }
.kl-fw-bold   { font-weight: 700; }

.kl-item-name { font-weight: 600; }
.kl-item-desc { color: #777; font-size: 10.5px; margin-top: 2px; }

/* ---- TOTALS ---- */
.kl-totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }

.kl-totals {
  width: 280px;
  border: 1px solid #d5d5e5;
  border-radius: 6px;
  overflow: hidden;
}

.kl-totals-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #e5e5ef;
  font-size: 11px;
}

.kl-totals-row:last-child { border-bottom: 0; }

.kl-totals-grand {
  background: #1a1a2e;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  padding: 9px 12px;
}

.kl-totals-balance {
  background: #fdecea;
  color: #c0392b;
  font-weight: 700;
}

/* ---- CURRENCY ROW ---- */
.kl-currency-row {
  font-size: 10.5px;
  color: #888;
  margin-bottom: 12px;
  text-align: right;
}

/* ---- NOTES / TERMS ---- */
.kl-notes {
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid #e5e5ef;
  border-radius: 6px;
  background: #fdfdff;
}

.kl-notes-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #888;
  margin-bottom: 4px;
}

.kl-notes-text { font-size: 11px; color: #444; white-space: pre-wrap; }

/* ---- VOID REASON ---- */
.kl-void-reason {
  margin: 12px 0;
  padding: 9px 14px;
  background: #fdecea;
  border: 1px solid #e9a09a;
  border-radius: 5px;
  color: #922b21;
  font-size: 11px;
}

/* ---- SIGNATURES ---- */
.kl-signatures {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 52px;
  margin-bottom: 28px;
}

.kl-sig { text-align: center; }

.kl-sig-line {
  border-top: 1px solid #1a1a2e;
  margin-bottom: 6px;
}

.kl-sig-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #555;
}

.kl-sig-name { font-size: 11px; color: #333; margin-top: 2px; }

/* ---- FOOTER ---- */
.kl-footer {
  border-top: 1px solid #d5d5e5;
  padding-top: 8px;
  font-size: 10px;
  color: #888;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* ---- PRINT MEDIA ---- */
@page { size: A4; margin: 18mm 16mm; }

@media print {
  .kl-doc { padding: 0; min-height: unset; }
  .kl-watermark { position: fixed; }
  .kl-lines { page-break-inside: auto; }
  .kl-lines tr { page-break-inside: avoid; }
  .kl-signatures { page-break-inside: avoid; }
}
CSS;
    }
}
