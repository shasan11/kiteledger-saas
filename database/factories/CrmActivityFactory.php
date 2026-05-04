<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrmActivityFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'deal_id' => Deal::factory(),
            'contact_id' => Contact::factory(),
            'assigned_to_id' => User::factory(),
            'activity_type' => fake()->randomElement(["call","email","meeting","task","note","whatsapp","sms","follow_up"]),
            'subject' => fake()->regexify('[A-Za-z0-9]{180}'),
            'description' => fake()->text(),
            'due_at' => fake()->dateTime(),
            'completed_at' => fake()->dateTime(),
            'status' => fake()->randomElement(["pending","in_progress","completed","cancelled"]),
            'priority' => fake()->randomElement(["low","medium","high","urgent"]),
            'outcome' => fake()->regexify('[A-Za-z0-9]{255}'),
            'next_follow_up_at' => fake()->dateTime(),
            'reminder_at' => fake()->dateTime(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
