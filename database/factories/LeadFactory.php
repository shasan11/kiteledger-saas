<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'lead_no' => fake()->regexify('[A-Za-z0-9]{40}'),
            'contact_id' => Contact::factory(),
            'assigned_to_id' => User::factory(),
            'converted_contact_id' => Contact::factory(),
            'converted_deal_id' => Deal::factory(),
            'name' => fake()->name(),
            'company_name' => fake()->regexify('[A-Za-z0-9]{180}'),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'mobile' => fake()->regexify('[A-Za-z0-9]{40}'),
            'website' => fake()->regexify('[A-Za-z0-9]{180}'),
            'address' => fake()->text(),
            'city' => fake()->city(),
            'state' => fake()->regexify('[A-Za-z0-9]{80}'),
            'country' => fake()->country(),
            'lead_source' => fake()->regexify('[A-Za-z0-9]{80}'),
            'industry' => fake()->regexify('[A-Za-z0-9]{120}'),
            'expected_value' => fake()->randomFloat(2, 0, 99999999999999.99),
            'status' => fake()->randomElement(["new","contacted","qualified","unqualified","converted","lost"]),
            'priority' => fake()->randomElement(["low","medium","high","urgent"]),
            'next_follow_up_date' => fake()->dateTime(),
            'last_contacted_at' => fake()->dateTime(),
            'notes' => fake()->text(),
            'converted_at' => fake()->dateTime(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
