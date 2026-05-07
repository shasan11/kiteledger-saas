<?php

namespace Database\Seeders;

use App\Models\FiscalYear;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class FiscalYearSeeder extends Seeder
{
    public function run(): void
    {
        $today = CarbonImmutable::today();
        $startYear = $today->month >= 4 ? $today->year : $today->year - 1;
        $currentStart = CarbonImmutable::create($startYear, 4, 1);
        $currentEnd = $currentStart->addYear()->subDay();

        FiscalYear::query()->updateOrCreate(
            ['code' => 'FY-' . $currentStart->format('Y') . '-' . $currentEnd->format('y')],
            [
                'name' => 'Fiscal Year ' . $currentStart->format('Y') . '/' . $currentEnd->format('y'),
                'start_date' => $currentStart->toDateString(),
                'end_date' => $currentEnd->toDateString(),
                'status' => 'ACTIVE',
                'lock_date' => null,
                'is_current' => true,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );

        $previousStart = $currentStart->subYear();
        $previousEnd = $currentStart->subDay();

        FiscalYear::query()->updateOrCreate(
            ['code' => 'FY-' . $previousStart->format('Y') . '-' . $previousEnd->format('y')],
            [
                'name' => 'Fiscal Year ' . $previousStart->format('Y') . '/' . $previousEnd->format('y'),
                'start_date' => $previousStart->toDateString(),
                'end_date' => $previousEnd->toDateString(),
                'status' => 'CLOSED',
                'lock_date' => $previousEnd->toDateString(),
                'is_current' => false,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
