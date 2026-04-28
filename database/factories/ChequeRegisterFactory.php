<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChequeRegisterFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'cheque_no' => fake()->regexify('[A-Za-z0-9]{80}'),
            'cheque_date' => fake()->date(),
            'issued_date' => fake()->date(),
            'received_date' => fake()->date(),
            'payee_name' => fake()->regexify('[A-Za-z0-9]{150}'),
            'cleared_date' => fake()->date(),
            'direction' => fake()->randomElement(["issued","received"]),
            'account_id' => Account::factory(),
            'related_account_id' => Account::factory(),
            'amount' => fake()->randomFloat(2, 0, 99999999999999.99),
            'status' => fake()->randomElement(["pending","cleared","bounced","cancelled"]),
            'notes' => fake()->text(),
            'active' => fake()->boolean(),
            'approved' => fake()->boolean(),
            'approved_at' => fake()->dateTime(),
            'approved_by_id' => User::factory(),
            'void' => fake()->boolean(),
            'voided_by_id' => User::factory(),
            'voided_reason' => fake()->text(),
            'voided_at' => fake()->dateTime(),
            'exchange_rate' => fake()->randomFloat(6, 0, 999999999999.999999),
            'total' => fake()->randomFloat(6, 0, 999999999999.999999),
            'user_add_id' => User::factory(),
        ];
    }
}
