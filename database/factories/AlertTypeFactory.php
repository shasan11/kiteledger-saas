<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AlertTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $alertTypes = [
            ['name' => 'Invoice Due Reminder', 'alert_type' => 'invoice_due_reminder', 'recipient' => 'finance_team'],
            ['name' => 'Low Stock Alert', 'alert_type' => 'low_stock_alert', 'recipient' => 'inventory_team'],
            ['name' => 'Payment Received Notification', 'alert_type' => 'payment_received_notification', 'recipient' => 'finance_team'],
            ['name' => 'Leave Request Notification', 'alert_type' => 'leave_request_notification', 'recipient' => 'hr_team'],
            ['name' => 'Daily Sales Summary', 'alert_type' => 'daily_sales_summary', 'recipient' => 'sales_team'],
        ];

        $alertType = fake()->randomElement($alertTypes);

        return [
            'name' => $alertType['name'],
            'medium' => fake()->randomElement(['email', 'sms', 'whatsapp', 'in_app']),
            'alert_type' => $alertType['alert_type'] . '_' . fake()->unique()->numberBetween(1000, 9999),
            'schedule' => fake()->randomElement(['immediate', 'daily', 'weekly', 'monthly']),
            'sync_time' => fake()->optional(0.8)->time('H:i:s'),
            'recipient' => $alertType['recipient'],
            'active' => fake()->boolean(85),
            'is_system_generated' => false,
            'user_add_id' => User::factory(),
        ];
    }
}
