<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\Product;
use App\Models\PurchaseBill;
use App\Models\PurchaseOrder;
use App\Models\SupplierPayment;
use App\Models\TaxRate;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class PurchaseModuleSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::query()->where('code', 'MAIN')->first()
            ?: Branch::query()->where('code', 'HO')->first()
            ?: Branch::query()->first();

        $currency = Currency::query()->where('is_base', true)->first()
            ?: Currency::query()->first();

        $warehouse = Warehouse::query()->where('code', 'MAIN-WH')->first()
            ?: Warehouse::query()->first();

        $paymentAccount = Account::query()
            ->whereIn('nature', ['bank', 'cash'])
            ->where('active', true)
            ->first()
            ?: Account::query()->where('active', true)->first()
            ?: Account::query()->first();

        $taxRate = TaxRate::query()
            ->where('active', true)
            ->whereIn('applies_on', ['purchase', 'both'])
            ->first()
            ?: TaxRate::query()->where('active', true)->first()
            ?: TaxRate::query()->first();

        $products = Product::query()
            ->where('allow_purchase', true)
            ->where('active', true)
            ->where('product_type', '!=', 'variant_parent')
            ->orderBy('code')
            ->take(4)
            ->get();

        if (!$branch || !$warehouse || !$paymentAccount || $products->isEmpty()) {
            $this->command?->warn('PurchaseModuleSeeder skipped: branch, warehouse, payment account, and purchasable products are required.');
            return;
        }

        $suppliers = $this->seedSuppliers();
        $supplier = $suppliers->first();

        if (!$supplier) {
            $this->command?->warn('PurchaseModuleSeeder skipped: at least one supplier is required.');
            return;
        }

        $today = Carbon::today();

        $purchaseOrder = PurchaseOrder::query()->updateOrCreate(
            ['purchase_order_no' => 'PO-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'purchase_order_date' => $today->copy()->subDays(5)->toDateString(),
                'contact_id' => $supplier->id,
                'currency_id' => $currency?->id,
                'credit_term_id' => $supplier->credit_term_id,
                'notes' => 'Seed purchase order for office replenishment.',
                'exchange_rate' => 1,
                'status' => 'confirmed',
                'active' => true,
            ]
        );

        $this->syncPurchaseLines(
            parent: $purchaseOrder,
            relation: 'purchaseOrderLines',
            products: $products->take(3),
            taxRate: $taxRate
        );

        $purchaseBill = PurchaseBill::query()->updateOrCreate(
            ['bill_no' => 'PB-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'bill_date' => $today->copy()->subDays(3)->toDateString(),
                'due_date' => $today->copy()->addDays(27)->toDateString(),
                'contact_id' => $supplier->id,
                'warehouse_id' => $warehouse->id,
                'currency_id' => $currency?->id,
                'reference' => $purchaseOrder->purchase_order_no,
                'notes' => 'Seed purchase bill received against seeded purchase order.',
                'exchange_rate' => 1,
                'paid_total' => 0,
                'balance_due' => 0,
                'status' => 'posted',
                'active' => true,
            ]
        );

        $billTotal = $this->syncPurchaseLines(
            parent: $purchaseBill,
            relation: 'purchaseBillLines',
            products: $products->take(3),
            taxRate: $taxRate
        );

        $paymentAmount = round($billTotal / 2, 2);

        $payment = SupplierPayment::query()->updateOrCreate(
            ['payment_no' => 'PAY-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'payment_date' => $today->copy()->subDay()->toDateString(),
                'contact_id' => $supplier->id,
                'account_id' => $paymentAccount->id,
                'currency_id' => $currency?->id,
                'amount' => $paymentAmount,
                'method' => 'cash',
                'reference' => $purchaseBill->bill_no,
                'notes' => 'Seed partial supplier payment.',
                'exchange_rate' => 1,
                'total' => $paymentAmount,
                'status' => 'posted',
                'active' => true,
            ]
        );

        $payment->supplierPaymentLines()->delete();

        $payment->supplierPaymentLines()->create([
            'purchase_bill_id' => $purchaseBill->id,
            'allocated_amount' => $paymentAmount,
        ]);

        $this->safeForceFill($purchaseBill, [
            'paid_total' => $paymentAmount,
            'balance_due' => round($billTotal - $paymentAmount, 2),
            'status' => 'part_paid',
        ]);

        $this->seedOpenPurchaseBill(
            branch: $branch,
            warehouse: $warehouse,
            currency: $currency,
            supplier: $suppliers->get(1) ?: $supplier,
            products: $products->slice(1, 2),
            taxRate: $taxRate,
            today: $today
        );
    }

    protected function seedSuppliers()
    {
        $rows = [
            [
                'code' => 'SUP-SEED-001',
                'name' => 'Everest Office Supplies',
                'address' => 'New Road, Kathmandu',
                'phone' => '01-5550101',
                'email' => 'accounts@everest-supplies.test',
                'pan' => '600001001',
            ],
            [
                'code' => 'SUP-SEED-002',
                'name' => 'Himalayan Tech Distributors',
                'address' => 'Putalisadak, Kathmandu',
                'phone' => '01-5550102',
                'email' => 'billing@himalayan-tech.test',
                'pan' => '600001002',
            ],
        ];

        return collect($rows)->map(function ($row) {
            return Contact::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'contact_type' => 'supplier',
                    'name' => $row['name'],
                    'address' => $row['address'],
                    'phone' => $row['phone'],
                    'email' => $row['email'],
                    'pan' => $row['pan'],
                    'tax_registration_no' => $row['pan'],
                    'tax_registration_type' => 'pan',
                    'accept_purchase' => true,
                    'credit_limit' => 250000,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        });
    }

    protected function syncPurchaseLines(
        $parent,
        string $relation,
        $products,
        ?TaxRate $taxRate
    ): float {
        $lineModel = $parent->{$relation}()->getRelated();
        $lineTable = $lineModel->getTable();

        $parent->{$relation}()->delete();

        $total = 0;
        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;

        foreach ($products->values() as $index => $product) {
            $qty = $index + 2;
            $unitPrice = (float) ($product->purchase_price ?: 1000 + ($index * 500));

            $discountPercent = $index === 0 ? 3 : 0;
            $baseAmount = $qty * $unitPrice;
            $discountAmount = $baseAmount * ($discountPercent / 100);
            $taxableAmount = max($baseAmount - $discountAmount, 0);

            $taxAmount = $taxRate
                ? $taxableAmount * ((float) $taxRate->rate_percent / 100)
                : 0;

            $lineTotal = round($taxableAmount + $taxAmount, 2);

            $subtotal += $baseAmount;
            $discountTotal += $discountAmount;
            $taxTotal += $taxAmount;
            $total += $lineTotal;

            $payload = [];

            $this->addIfColumn($payload, $lineTable, 'product_id', $product->id);

            $this->addProductNameField(
                payload: $payload,
                table: $lineTable,
                productName: $product->name
            );

            $this->addIfColumn($payload, $lineTable, 'description', $product->description ?: $product->name);

            $this->addIfColumn($payload, $lineTable, 'qty', $qty);
            $this->addIfColumn($payload, $lineTable, 'quantity', $qty);

            $this->addIfColumn($payload, $lineTable, 'unit_price', $unitPrice);
            $this->addIfColumn($payload, $lineTable, 'rate', $unitPrice);
            $this->addIfColumn($payload, $lineTable, 'price', $unitPrice);

            $this->addIfColumn($payload, $lineTable, 'discount_percent', $discountPercent);
            $this->addIfColumn($payload, $lineTable, 'discount_amount', round($discountAmount, 2));

            $this->addIfColumn($payload, $lineTable, 'tax_rate_id', $taxRate?->id);
            $this->addIfColumn($payload, $lineTable, 'tax_amount', round($taxAmount, 2));

            $this->addIfColumn($payload, $lineTable, 'line_total', $lineTotal);
            $this->addIfColumn($payload, $lineTable, 'total', $lineTotal);
            $this->addIfColumn($payload, $lineTable, 'amount', $lineTotal);

            $parent->{$relation}()->create($payload);
        }

        $this->safeForceFill($parent, [
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'tax_total' => round($taxTotal, 2),
            'total' => round($total, 2),
            'grand_total' => round($total, 2),
        ]);

        if ($parent instanceof PurchaseBill) {
            $paidTotal = (float) ($parent->paid_total ?? 0);

            $this->safeForceFill($parent, [
                'balance_due' => round($total - $paidTotal, 2),
            ]);
        }

        return round($total, 2);
    }

    protected function seedOpenPurchaseBill(
        Branch $branch,
        Warehouse $warehouse,
        ?Currency $currency,
        Contact $supplier,
        $products,
        ?TaxRate $taxRate,
        Carbon $today
    ): void {
        if ($products->isEmpty()) {
            return;
        }

        $bill = PurchaseBill::query()->updateOrCreate(
            ['bill_no' => 'PB-SEED-0002'],
            [
                'branch_id' => $branch->id,
                'bill_date' => $today->copy()->subDays(2)->toDateString(),
                'due_date' => $today->copy()->addDays(14)->toDateString(),
                'contact_id' => $supplier->id,
                'warehouse_id' => $warehouse->id,
                'currency_id' => $currency?->id,
                'reference' => 'SUP-INV-SEED-0002',
                'notes' => 'Seed unpaid purchase bill.',
                'exchange_rate' => 1,
                'paid_total' => 0,
                'balance_due' => 0,
                'status' => 'posted',
                'active' => true,
            ]
        );

        $total = $this->syncPurchaseLines(
            parent: $bill,
            relation: 'purchaseBillLines',
            products: $products,
            taxRate: $taxRate
        );

        $this->safeForceFill($bill, [
            'paid_total' => 0,
            'balance_due' => $total,
            'status' => 'posted',
        ]);
    }

    protected function addProductNameField(
        array &$payload,
        string $table,
        string $productName
    ): void {
        if (Schema::hasColumn($table, 'product_name')) {
            $payload['product_name'] = $productName;
            return;
        }

        if (Schema::hasColumn($table, 'custom_product_name')) {
            $payload['custom_product_name'] = $productName;
            return;
        }

        if (Schema::hasColumn($table, 'name')) {
            $payload['name'] = $productName;
        }
    }

    protected function addIfColumn(
        array &$payload,
        string $table,
        string $column,
        mixed $value
    ): void {
        if (Schema::hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    protected function safeForceFill($model, array $attributes): void
    {
        $table = $model->getTable();
        $safeAttributes = [];

        foreach ($attributes as $column => $value) {
            if (Schema::hasColumn($table, $column)) {
                $safeAttributes[$column] = $value;
            }
        }

        if (!empty($safeAttributes)) {
            $model->forceFill($safeAttributes)->save();
        }
    }
}