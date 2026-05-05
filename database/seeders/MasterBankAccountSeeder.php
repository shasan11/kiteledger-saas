<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Currency;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class MasterBankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $baseCurrency = Currency::where('is_base', true)->first();
        $headOffice = Branch::where('code', 'HO')->first();

        BankAccount::updateOrCreate(
            ['code' => 'CASH-001'],
            [
                'type' => 'cash',
                'display_name' => 'Cash in Hand',
                'currency_id' => $baseCurrency?->id,
                'branch_id' => $headOffice?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        BankAccount::updateOrCreate(
            ['code' => 'BANK-001'],
            [
                'type' => 'bank',
                'display_name' => 'Default Bank Account',
                'bank_name' => 'Default Bank',
                'account_name' => 'Demo Company Pvt. Ltd.',
                'account_number' => '0000000000',
                'currency_id' => $baseCurrency?->id,
                'branch_id' => $headOffice?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }
}
