<?php

namespace Database\Seeders;

use App\Models\DocumentNumbering;
use Illuminate\Database\Seeder;

class DocumentNumberingSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['quotation', 'QUO'], ['sales_order', 'SO'], ['proforma_invoice', 'PI'], ['invoice', 'INV'],
            ['receipt', 'CPAY'], ['sales_return', 'SR'], ['credit_note', 'CN'], ['purchase_order', 'PO'],
            ['purchase_bill', 'BILL'], ['payment', 'SPAY'], ['debit_note', 'DN'], ['expense', 'EXP'],
            ['journal_voucher', 'JV'], ['cash_transfer', 'CASH'], ['warehouse_transfer', 'WT'],
            ['inventory_adjustment', 'ADJ'], ['loan_account', 'LOAN'], ['loan_topup', 'LTOP'],
            ['loan_charge', 'LCHG'], ['payroll', 'PAYRUN'], ['contact', 'CON'], ['lead', 'LEAD'],
            ['deal', 'DEAL'], ['product', 'PROD'], ['bank_account', 'BANK'],
            ['pos_terminal', 'PT'], ['pos_shift', 'SHIFT'], ['pos_sale', 'POS'],
            ['pos_payment', 'PPAY'], ['pos_cash_movement', 'PCM'], ['pos_return', 'PRET'],
        ];

        foreach ($items as [$type, $prefix]) {
            $record = DocumentNumbering::query()->firstOrNew(['document_type' => $type]);

            $record->fill([
                'prefix' => $record->prefix ?: $prefix,
                'next_number' => max((int) ($record->next_number ?: 1), 1),
                'type_of_account' => $record->type_of_account ?: 'auto_numbering',
                'reset_every_fiscal_year' => $record->reset_every_fiscal_year ?? false,
                'add_fiscal_year_in_code' => $record->add_fiscal_year_in_code ?? false,
                'enable_fiscal_year_next_number' => $record->enable_fiscal_year_next_number ?? false,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ])->save();
        }
    }
}
