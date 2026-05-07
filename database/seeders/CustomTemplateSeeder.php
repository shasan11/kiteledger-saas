<?php

namespace Database\Seeders;

use App\Models\CustomTemplate;
use Illuminate\Database\Seeder;

class CustomTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->templates() as $template) {
            CustomTemplate::query()->updateOrCreate(
                ['template_key' => $template['template_key']],
                $template + ['active' => true, 'is_system_generated' => true, 'user_add_id' => null]
            );
        }
    }

    private function templates(): array
    {
        return [
            [
                'name' => 'Invoice Terms',
                'purpose' => 'invoice_terms',
                'template_key' => 'invoice_terms_standard',
                'content' => '<p>Payment is due by <strong>{{due_date}}</strong>. Please reference invoice <strong>{{invoice_no}}</strong> on all payments.</p>',
            ],
            [
                'name' => 'Quotation Terms',
                'purpose' => 'quotation_terms',
                'template_key' => 'quotation_terms_standard',
                'content' => '<p>This quotation is valid until <strong>{{valid_until}}</strong>. Prices may change after the validity period.</p>',
            ],
            [
                'name' => 'Purchase Order Terms',
                'purpose' => 'purchase_order_terms',
                'template_key' => 'purchase_order_terms_standard',
                'content' => '<p>Supplier must quote purchase order <strong>{{purchase_order_no}}</strong> on delivery notes and bills.</p>',
            ],
            [
                'name' => 'Payment Receipt Note',
                'purpose' => 'payment_receipt_note',
                'template_key' => 'payment_receipt_note_standard',
                'content' => '<p>We acknowledge receipt of <strong>{{amount}}</strong> against <strong>{{reference}}</strong>.</p>',
            ],
            [
                'name' => 'Payslip Footer',
                'purpose' => 'payslip_footer',
                'template_key' => 'payslip_footer_standard',
                'content' => '<p>This is a system generated payslip for <strong>{{employee_name}}</strong> and does not require a signature.</p>',
            ],
            [
                'name' => 'Leave Approval Note',
                'purpose' => 'leave_approval_note',
                'template_key' => 'leave_approval_note_standard',
                'content' => '<p>Leave from <strong>{{from_date}}</strong> to <strong>{{to_date}}</strong> has been {{status}}.</p>',
            ],
            [
                'name' => 'Journal Voucher Declaration',
                'purpose' => 'journal_voucher_note',
                'template_key' => 'journal_voucher_note_standard',
                'content' => '<p>Prepared by {{prepared_by}} and approved by {{approved_by}} for accounting period {{period}}.</p>',
            ],
            [
                'name' => 'Inventory Transfer Note',
                'purpose' => 'inventory_transfer_note',
                'template_key' => 'inventory_transfer_note_standard',
                'content' => '<p>Goods transferred from <strong>{{from_warehouse}}</strong> to <strong>{{to_warehouse}}</strong>.</p>',
            ],
        ];
    }
}
