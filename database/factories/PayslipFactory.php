<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PayslipFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'user_id' => User::factory(),
            'salary_month' => fake()->numberBetween(-10000, 10000),
            'salary_year' => fake()->numberBetween(-10000, 10000),
            'salary' => fake()->randomFloat(2, 0, 99999999999999.99),
            'paid_leave' => fake()->numberBetween(-10000, 10000),
            'unpaid_leave' => fake()->numberBetween(-10000, 10000),
            'monthly_holiday' => fake()->numberBetween(-10000, 10000),
            'public_holiday' => fake()->numberBetween(-10000, 10000),
            'work_day' => fake()->numberBetween(-10000, 10000),
            'shift_wise_work_hour' => fake()->randomFloat(2, 0, 999999.99),
            'monthly_work_hour' => fake()->randomFloat(2, 0, 999999.99),
            'hourly_salary' => fake()->randomFloat(2, 0, 99999999999999.99),
            'working_hour' => fake()->randomFloat(2, 0, 999999.99),
            'salary_payable' => fake()->randomFloat(2, 0, 99999999999999.99),
            'bonus' => fake()->randomFloat(2, 0, 99999999999999.99),
            'bonus_comment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'deduction' => fake()->randomFloat(2, 0, 99999999999999.99),
            'deduction_comment' => fake()->regexify('[A-Za-z0-9]{255}'),
            'total_payable' => fake()->randomFloat(2, 0, 99999999999999.99),
            'payment_status' => fake()->randomElement(["UNPAID","PAID","PARTIAL"]),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
