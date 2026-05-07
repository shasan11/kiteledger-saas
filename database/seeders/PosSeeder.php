<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\DocumentNumbering;
use App\Models\PosTerminal;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class PosSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedNumbering();
        $walkInCustomer = $this->seedWalkInCustomer();
        $this->seedTerminals($walkInCustomer);
    }

    private function seedNumbering(): void
    {
        $rows = [
            'pos_terminal' => 'PT',
            'pos_shift' => 'SHIFT',
            'pos_sale' => 'POS',
            'pos_payment' => 'PPAY',
            'pos_cash_movement' => 'PCM',
            'pos_return' => 'PRET',
        ];

        foreach ($rows as $type => $prefix) {
            DocumentNumbering::updateOrCreate(
                ['document_type' => $type],
                [
                    'prefix' => $prefix,
                    'next_number' => 1,
                    'type_of_account' => 'auto_numbering',
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }

    private function seedWalkInCustomer(): Contact
    {
        return Contact::updateOrCreate(
            ['code' => 'WALK-IN'],
            [
                'contact_type' => 'customer',
                'name' => 'Walk-in Customer',
                'phone' => null,
                'email' => null,
                'accept_purchase' => false,
                'credit_limit' => 0,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function seedTerminals(Contact $walkInCustomer): void
    {
        $cashAccount = Account::query()->where('nature', 'cash')->orderBy('name')->first();
        $cardAccount = Account::query()->where('nature', 'bank')->orderBy('name')->first();
        $onlineAccount = Account::query()->where('nature', 'bank')->orderBy('name')->skip(1)->first() ?: $cardAccount;

        Branch::query()
            ->where('is_pos_enabled', true)
            ->get()
            ->each(function (Branch $branch) use ($walkInCustomer, $cashAccount, $cardAccount, $onlineAccount) {
                $warehouse = Warehouse::query()
                    ->where('branch_id', $branch->id)
                    ->orderBy('name')
                    ->first();

                PosTerminal::updateOrCreate(
                    ['code' => 'POS-' . ($branch->code ?: strtoupper(substr($branch->name, 0, 3)))],
                    [
                        'branch_id' => $branch->id,
                        'warehouse_id' => $warehouse?->id,
                        'name' => $branch->name . ' POS',
                        'location' => $branch->name,
                        'receipt_printer_name' => null,
                        'cash_account_id' => $cashAccount?->id,
                        'card_account_id' => $cardAccount?->id,
                        'online_account_id' => $onlineAccount?->id,
                        'default_customer_id' => $walkInCustomer->id,
                        'is_default' => true,
                        'active' => true,
                        'is_system_generated' => true,
                    ]
                );
            });
    }
}
