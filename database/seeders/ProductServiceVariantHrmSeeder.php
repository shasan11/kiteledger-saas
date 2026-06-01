<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\EmployeeProfile;
use App\Models\EmploymentStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\ProductVariantItem;
use App\Models\Shift;
use App\Models\User;
use App\Models\Variant;
use App\Models\VariantLine;
use App\Models\Warehouse;
use App\Models\WarehouseItem;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ProductServiceVariantHrmSeeder extends Seeder
{
    protected int $employeeCount = 12;

    protected int $attendanceDays = 30;

    protected ?Branch $branch = null;

    protected ?Warehouse $warehouse = null;

    protected ?Account $salesAccount = null;

    protected ?Account $purchaseAccount = null;

    public function run(): void
    {
        $this->employeeCount = max(1, (int) env('DEMO_HRM_EMPLOYEE_COUNT', $this->employeeCount));
        $this->attendanceDays = max(1, (int) env('DEMO_HRM_ATTENDANCE_DAYS', $this->attendanceDays));

        $this->prepareSharedReferences();
        $this->seedProductsServicesAndVariants();
        $this->seedEmployeesWithAttendance();

        $this->command?->info(
            "Seeded demo products/services/variant products and {$this->employeeCount} employees with {$this->attendanceDays} days of variable attendance."
        );
    }

    protected function prepareSharedReferences(): void
    {
        $this->branch = Branch::query()->where('code', 'MAIN')->first()
            ?: Branch::query()->where('is_head_office', true)->first()
            ?: Branch::query()->first()
            ?: $this->firstOrCreate(Branch::class, ['code' => 'DEMO-MAIN'], [
                'name' => 'Demo Main Branch',
                'is_head_office' => true,
                'is_transaction_enabled' => true,
                'is_warehouse_enabled' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);

        $this->warehouse = Warehouse::query()
            ->when($this->branch, fn ($query) => $query->where('branch_id', $this->branch->id))
            ->where('active', true)
            ->first()
            ?: $this->firstOrCreate(Warehouse::class, ['code' => 'DEMO-WH'], [
                'branch_id' => $this->branch?->id,
                'name' => 'Demo Warehouse',
                'active' => true,
                'is_system_generated' => true,
            ]);

        $this->salesAccount = $this->ensureAccount('DEMO-SALES', 'Demo Sales Income');
        $this->purchaseAccount = $this->ensureAccount('DEMO-PURCHASE', 'Demo Purchase Expense');
    }

    protected function seedProductsServicesAndVariants(): void
    {
        $goodsCategory = $this->category('Demo Goods');
        $serviceCategory = $this->category('Demo Services');
        $apparelCategory = $this->category('Demo Apparel');
        $pieceUnit = $this->unit('PCS', 'Pieces');
        $hourUnit = $this->unit('HOUR', 'Hour');
        $serviceUnit = $this->unit('SERVICE', 'Service');

        $simpleProducts = [
            ['DEMO-LAPTOP-STAND', 'Laptop Stand', 850, 1450, 25],
            ['DEMO-WIRELESS-MOUSE', 'Wireless Mouse', 650, 1150, 40],
            ['DEMO-USB-C-HUB', 'USB-C Hub', 1800, 2850, 18],
            ['DEMO-NOTEBOOK-A5', 'A5 Notebook Pack', 120, 220, 100],
            ['DEMO-OFFICE-LAMP', 'LED Office Lamp', 1500, 2400, 16],
        ];

        foreach ($simpleProducts as [$sku, $name, $purchase, $selling, $stock]) {
            $product = $this->updateOrCreate(Product::class, ['sku' => $sku], [
                'branch_id' => $this->branch?->id,
                'product_category_id' => $goodsCategory->id,
                'name' => $name,
                'code' => $sku,
                'description' => "{$name} demo inventory product.",
                'product_unit_id' => $pieceUnit->id,
                'product_type' => 'simple',
                'sales_account_id' => $this->salesAccount?->id,
                'purchase_account_id' => $this->purchaseAccount?->id,
                'sales_return_account_id' => $this->salesAccount?->id,
                'purchase_return_account_id' => $this->purchaseAccount?->id,
                'valuation_method' => 'standard',
                'reorder_level' => 5,
                'purchase_price' => $purchase,
                'selling_price' => $selling,
                'track_inventory' => true,
                'allow_sale' => true,
                'allow_purchase' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);

            $this->seedWarehouseItem($product, $stock, $purchase);
        }

        $services = [
            ['DEMO-SRV-CONSULT', 'Implementation Consulting', $hourUnit->id, 4500],
            ['DEMO-SRV-SUPPORT', 'Priority Support Hour', $hourUnit->id, 2500],
            ['DEMO-SRV-DELIVERY', 'Local Delivery Charge', $serviceUnit->id, 500],
            ['DEMO-SRV-INSTALL', 'On-site Installation', $serviceUnit->id, 3500],
        ];

        foreach ($services as [$sku, $name, $unitId, $selling]) {
            $this->updateOrCreate(Product::class, ['sku' => $sku], [
                'branch_id' => $this->branch?->id,
                'product_category_id' => $serviceCategory->id,
                'name' => $name,
                'code' => $sku,
                'description' => "{$name} demo service item.",
                'product_unit_id' => $unitId,
                'product_type' => 'service',
                'sales_account_id' => $this->salesAccount?->id,
                'purchase_account_id' => $this->purchaseAccount?->id,
                'sales_return_account_id' => $this->salesAccount?->id,
                'purchase_return_account_id' => $this->purchaseAccount?->id,
                'purchase_price' => 0,
                'selling_price' => $selling,
                'track_inventory' => false,
                'allow_sale' => true,
                'allow_purchase' => false,
                'active' => true,
                'is_system_generated' => true,
            ]);
        }

        $sizeLines = $this->variantLines('Demo Size', ['S', 'M', 'L']);
        $colorLines = $this->variantLines('Demo Color', ['Black', 'Blue', 'White']);

        $parent = $this->updateOrCreate(Product::class, ['sku' => 'DEMO-TEE'], [
            'branch_id' => $this->branch?->id,
            'product_category_id' => $apparelCategory->id,
            'name' => 'Demo Cotton T-Shirt',
            'code' => 'DEMO-TEE',
            'description' => 'Variant parent product for seeded demo SKUs.',
            'product_unit_id' => $pieceUnit->id,
            'product_type' => 'variant_parent',
            'sales_account_id' => $this->salesAccount?->id,
            'purchase_account_id' => $this->purchaseAccount?->id,
            'sales_return_account_id' => $this->salesAccount?->id,
            'purchase_return_account_id' => $this->purchaseAccount?->id,
            'purchase_price' => 0,
            'selling_price' => 0,
            'track_inventory' => false,
            'allow_sale' => false,
            'allow_purchase' => false,
            'active' => true,
            'is_system_generated' => true,
        ]);

        foreach ($sizeLines as $sizeIndex => $sizeLine) {
            foreach ($colorLines as $colorIndex => $colorLine) {
                $sku = sprintf('DEMO-TEE-%s-%s', strtoupper($sizeLine->value), strtoupper($colorLine->value));
                $signature = $this->variantSignature([$sizeLine->id, $colorLine->id]);
                $priceOffset = ($sizeIndex * 150) + ($colorIndex * 75);

                $variantProduct = $this->updateOrCreate(Product::class, ['sku' => $sku], [
                    'parent_id' => $parent->id,
                    'branch_id' => $this->branch?->id,
                    'product_category_id' => $apparelCategory->id,
                    'name' => "Demo Cotton T-Shirt {$sizeLine->value} {$colorLine->value}",
                    'code' => $sku,
                    'description' => 'Child SKU generated from size and color variants.',
                    'product_unit_id' => $pieceUnit->id,
                    'product_type' => 'variant',
                    'variant_signature' => $signature,
                    'sales_account_id' => $this->salesAccount?->id,
                    'purchase_account_id' => $this->purchaseAccount?->id,
                    'sales_return_account_id' => $this->salesAccount?->id,
                    'purchase_return_account_id' => $this->purchaseAccount?->id,
                    'valuation_method' => 'standard',
                    'reorder_level' => 4,
                    'purchase_price' => 550 + $priceOffset,
                    'selling_price' => 950 + $priceOffset,
                    'track_inventory' => true,
                    'allow_sale' => true,
                    'allow_purchase' => true,
                    'active' => true,
                    'is_system_generated' => true,
                ]);

                $this->syncProductVariantItems($variantProduct, [$sizeLine, $colorLine]);
                $this->seedWarehouseItem($variantProduct, 12 + $sizeIndex + $colorIndex, 550 + $priceOffset);
            }
        }
    }

    protected function seedEmployeesWithAttendance(): void
    {
        $status = $this->firstOrCreate(EmploymentStatus::class, ['name' => 'Demo Full Time'], [
            'colour_value' => '#16a34a',
            'description' => 'Demo full-time employment status.',
            'active' => true,
            'is_system_generated' => true,
        ]);

        $departments = [
            $this->department('Demo Operations'),
            $this->department('Demo Finance'),
            $this->department('Demo Sales'),
            $this->department('Demo Support'),
        ];

        $designations = [
            $this->designation('Operations Associate', $departments[0], 45000),
            $this->designation('Finance Officer', $departments[1], 52000),
            $this->designation('Sales Executive', $departments[2], 48000),
            $this->designation('Support Specialist', $departments[3], 42000),
        ];

        $shift = $this->firstOrCreate(Shift::class, ['name' => 'Demo General Shift'], [
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'work_hour' => 8,
            'active' => true,
            'is_system_generated' => true,
        ]);

        $employees = [];

        for ($i = 1; $i <= $this->employeeCount; $i++) {
            $firstName = $this->firstNames()[($i - 1) % count($this->firstNames())];
            $lastName = $this->lastNames()[($i - 1) % count($this->lastNames())];
            $employeeId = sprintf('DEMO-EMP-%03d', $i);
            $designation = $designations[($i - 1) % count($designations)];
            $department = $departments[($i - 1) % count($departments)];
            $salary = 42000 + ($i * 1750);

            $user = $this->updateOrCreate(User::class, ['email' => strtolower($employeeId) . '@example.test'], [
                'name' => "{$firstName} {$lastName}",
                'first_name' => $firstName,
                'last_name' => $lastName,
                'username' => strtolower($employeeId),
                'password' => Hash::make('password'),
                'branch_id' => $this->branch?->id,
                'phone' => '980000' . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'employee_id' => $employeeId,
                'join_date' => now()->subMonths(6)->subDays($i)->toDateString(),
                'employment_status_id' => $status->id,
                'department_id' => $department->id,
                'shift_id' => $shift->id,
                'active' => true,
                'is_system_generated' => true,
            ]);

            $this->updateOrCreate(EmployeeProfile::class, ['user_id' => $user->id], [
                'branch_id' => $this->branch?->id,
                'employment_status_id' => $status->id,
                'department_id' => $department->id,
                'designation_id' => $designation->id,
                'shift_id' => $shift->id,
                'employee_id' => $employeeId,
                'join_date' => now()->subMonths(6)->subDays($i)->toDateString(),
                'salary' => $salary,
                'blood_group' => ['A+', 'B+', 'O+', 'AB+'][$i % 4],
                'emergency_contact_name' => "Emergency Contact {$i}",
                'emergency_contact_phone' => '981000' . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'address' => 'Demo employee address',
                'active' => true,
                'is_system_generated' => true,
            ]);

            $employees[] = $user;
        }

        $this->seedAttendance($employees);
    }

    protected function seedAttendance(array $employees): void
    {
        $end = Carbon::today();
        $start = $end->copy()->subDays($this->attendanceDays - 1);

        foreach ($employees as $employeeIndex => $user) {
            Attendance::query()
                ->where('user_id', $user->id)
                ->where('comment', 'like', 'Demo variable attendance%')
                ->whereBetween('in_time', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
                ->delete();

            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                if ($this->isSkippedAbsence($employeeIndex, $date)) {
                    continue;
                }

                [$label, $inMinuteOffset, $outMinuteOffset] = $this->attendancePattern($employeeIndex, $date);
                $inTime = $date->copy()->setTime(9, 0)->addMinutes($inMinuteOffset);
                $outTime = $date->copy()->setTime(18, 0)->addMinutes($outMinuteOffset);
                $hours = round($inTime->diffInMinutes($outTime) / 60, 2);

                $this->create(Attendance::class, [
                    'branch_id' => $this->branch?->id,
                    'user_id' => $user->id,
                    'in_time' => $inTime,
                    'out_time' => $outTime,
                    'ip' => '127.0.0.' . (($employeeIndex % 200) + 10),
                    'comment' => "Demo variable attendance: {$label}",
                    'punch_by' => $user->id,
                    'total_hour' => $hours,
                    'in_time_status' => $label,
                    'out_time_status' => $outMinuteOffset < -120 ? 'EARLY_OUT' : 'PRESENT',
                    'active' => true,
                    'is_system_generated' => true,
                ]);
            }
        }
    }

    protected function attendancePattern(int $employeeIndex, Carbon $date): array
    {
        $pattern = ($date->day + $employeeIndex) % 10;

        return match (true) {
            $date->isWeekend() => ['WEEKEND_HALF_DAY', 60, -240],
            $pattern === 1 => ['LATE', 35, 10],
            $pattern === 3 => ['EARLY_OUT', 5, -150],
            $pattern === 5 => ['OVERTIME', -5, 90],
            $pattern === 7 => ['HALF_DAY', 15, -270],
            default => ['PRESENT', ($pattern % 3) * 5, ($pattern % 2) * 10],
        };
    }

    protected function isSkippedAbsence(int $employeeIndex, Carbon $date): bool
    {
        if ($date->isSunday()) {
            return true;
        }

        return (($date->day + $employeeIndex) % 13) === 0;
    }

    protected function syncProductVariantItems(Product $product, array $variantLines): void
    {
        ProductVariantItem::query()->where('product_id', $product->id)->delete();

        foreach ($variantLines as $line) {
            $this->create(ProductVariantItem::class, [
                'product_id' => $product->id,
                'variant_line_id' => $line->id,
            ]);
        }
    }

    protected function seedWarehouseItem(Product $product, int|float $qty, int|float $cost): void
    {
        if (! $this->warehouse || ! Schema::hasTable('warehouse_items')) {
            return;
        }

        $this->updateOrCreate(WarehouseItem::class, [
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $product->id,
        ], [
            'branch_id' => $this->branch?->id,
            'qty_on_hand' => $qty,
            'avg_cost' => $cost,
            'total_value' => $qty * $cost,
            'reorder_level' => $product->reorder_level ?: 0,
            'active' => true,
        ]);
    }

    protected function variantLines(string $variantName, array $values): array
    {
        $variant = $this->updateOrCreate(Variant::class, ['name' => $variantName], [
            'sort_order' => 0,
            'active' => true,
            'is_system_generated' => true,
        ]);

        $lines = [];
        foreach (array_values($values) as $sort => $value) {
            $lines[] = $this->updateOrCreate(VariantLine::class, [
                'variant_id' => $variant->id,
                'value' => $value,
            ], [
                'sort_order' => $sort,
                'active' => true,
                'is_system_generated' => true,
            ]);
        }

        return $lines;
    }

    protected function variantSignature(array $variantLineIds): string
    {
        sort($variantLineIds);

        return implode('|', $variantLineIds);
    }

    protected function category(string $name): ProductCategory
    {
        return $this->firstOrCreate(ProductCategory::class, ['name' => $name], [
            'description' => "{$name} category.",
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function unit(string $shortName, string $name): ProductUnit
    {
        return $this->firstOrCreate(ProductUnit::class, ['short_name' => $shortName], [
            'name' => $name,
            'accept_fractional' => true,
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function department(string $name): Department
    {
        return $this->firstOrCreate(Department::class, ['name' => $name], [
            'description' => "{$name} department.",
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function designation(string $name, Department $department, int $salary): Designation
    {
        return $this->firstOrCreate(Designation::class, ['name' => $name], [
            'department_id' => $department->id,
            'code' => strtoupper(str_replace(' ', '-', $name)),
            'level' => 'Staff',
            'grade' => 'A',
            'default_basic_salary' => $salary,
            'salary_frequency' => 'monthly',
            'overtime_eligible' => true,
            'taxable' => true,
            'description' => "{$name} demo designation.",
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function ensureAccount(string $code, string $name): Account
    {
        $existing = Account::query()
            ->whereIn('code', [$code, '4100', '5100', '1110', '1120'])
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->firstOrCreate(Account::class, ['code' => $code], [
            'name' => $name,
            'nature' => 'coa',
            'active' => true,
            'is_system_generated' => true,
        ]);
    }

    protected function firstNames(): array
    {
        return ['Aarav', 'Sita', 'Nisha', 'Ramesh', 'Kabita', 'Milan', 'Anita', 'Suman', 'Prakash', 'Puja', 'Bikash', 'Laxmi'];
    }

    protected function lastNames(): array
    {
        return ['Shrestha', 'Karki', 'Gurung', 'Rai', 'Thapa', 'Tamang', 'KC', 'Adhikari', 'Maharjan', 'Lama', 'Bhandari', 'Poudel'];
    }

    protected function firstOrCreate(string $modelClass, array $attributes, array $values)
    {
        $model = new $modelClass;
        $table = $model->getTable();

        return $modelClass::unguarded(fn () => $modelClass::query()->firstOrCreate(
            $this->onlyExistingColumns($table, $attributes),
            $this->onlyExistingColumns($table, $values)
        ));
    }

    protected function updateOrCreate(string $modelClass, array $attributes, array $values)
    {
        $model = new $modelClass;
        $table = $model->getTable();

        return $modelClass::unguarded(fn () => $modelClass::query()->updateOrCreate(
            $this->onlyExistingColumns($table, $attributes),
            $this->onlyExistingColumns($table, $values)
        ));
    }

    protected function create(string $modelClass, array $attributes)
    {
        $model = new $modelClass;

        return $modelClass::unguarded(fn () => $modelClass::query()->create(
            $this->onlyExistingColumns($model->getTable(), $attributes)
        ));
    }

    protected function onlyExistingColumns(string $table, array $attributes): array
    {
        if (! Schema::hasTable($table)) {
            return $attributes;
        }

        $columns = Schema::getColumnListing($table);

        return array_filter(
            $attributes,
            fn (string $column): bool => in_array($column, $columns, true),
            ARRAY_FILTER_USE_KEY
        );
    }
}
