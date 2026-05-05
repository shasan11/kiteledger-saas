<?php

namespace Database\Seeders;

use App\Models\DocumentNumbering;
use Illuminate\Database\Seeder;

class MasterDocumentNumberingSeeder extends Seeder
{
    public function run(): void
    {
        $documentTypes = [
            'cash_transfer' => 'CT',
            'credit_note' => 'CN',
            'debit_note' => 'DN',
            'expense' => 'EXP',
            'inventory_adjustment' => 'IA',
            'invoice' => 'INV',
            'journal_voucher' => 'JV',
            'payment' => 'PAY',
            'production_journal' => 'PJ',
            'production_order' => 'POJ',
            'purchase_bill' => 'PB',
            'purchase_order' => 'PO',
            'quotation' => 'QT',
            'receipt' => 'RCP',
            'sales_order' => 'SO',
            'sales_return' => 'SR',
            'warehouse_transfer' => 'WT',
            'payroll' => 'PR',
            'deduction' => 'DED',
            'increment' => 'INC',
            'contact' => 'CON',
            'lead' => 'LEAD',
            'deal' => 'DEAL',
            'product' => 'PRD',
            'bank_account' => 'BNK',
            'capital' => 'CAP',
            'cash' => 'CASH',
            'current_asset' => 'CA',
            'current_liability' => 'CL',
            'direct_expense' => 'DE',
            'direct_income' => 'DI',
            'indirect_expense' => 'IE',
            'indirect_income' => 'II',
            'non_current_asset' => 'NCA',
            'non_current_liability' => 'NCL',
            'reserve_surplus' => 'RS',
            'loan_account' => 'LOAN',
            'loan_topup' => 'LTOP',
            'loan_charge' => 'LCHG',
        ];

        foreach ($documentTypes as $docType => $prefix) {
            DocumentNumbering::updateOrCreate(
                ['document_type' => $docType],
                [
                    'prefix' => $prefix,
                    'next_number' => 1,
                    'type_of_account' => 'auto_numbering',
                    'reset_every_fiscal_year' => false,
                    'add_fiscal_year_in_code' => false,
                    'enable_fiscal_year_next_number' => false,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
