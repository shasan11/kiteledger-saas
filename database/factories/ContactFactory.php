<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\ContactGroup;
use App\Models\CreditTerm;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'contact_group_id' => ContactGroup::factory(),
            'account_id' => Account::factory(),
            'contact_type' => fake()->randomElement(["customer","supplier","lead"]),
            'tax_registration_no' => fake()->regexify('[A-Za-z0-9]{80}'),
            'tax_registration_type' => fake()->randomElement(["pan","vat","gstin","tan","ein","sales_tax_permit","state_tax_id","none"]),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{50}'),
            'address' => fake()->text(),
            'pan' => fake()->regexify('[A-Za-z0-9]{80}'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'accept_purchase' => fake()->boolean(),
            'credit_term_id' => CreditTerm::factory(),
            'credit_limit' => fake()->randomFloat(2, 0, 99999999999999.99),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
