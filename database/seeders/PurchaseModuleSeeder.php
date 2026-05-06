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
            $purchaseOrder,
            'purchaseOrderLines',
            $products->take(3),
            $taxRate
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
            $purchaseBill,
            'purchaseBillLines',
            $products->take(3),
            $taxRate
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

        $purchaseBill->forceFill([
            'paid_total' => $paymentAmount,
            'balance_due' => round($billTotal - $paymentAmount, 2),
            'status' => 'part_paid',
        ])->save();

        $this->seedOpenPurchaseBill(
            $branch,
            $warehouse,
            $currency,
            $suppliers->get(1) ?: $supplier,
            $products->slice(1, 2),
            $taxRate,
            $today
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

        return collect($rows)->map(fn ($row) => Contact::query()->updateOrCreate(
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
        ));
    }

    protected function syncPurchaseLines($parent, string $relation, $products, ?TaxRate $taxRate): float
    {
        $parent->{$relation}()->delete();

        $total = 0;

        foreach ($products->values() as $index => $product) {
            $qty = $index + 2;
            $unitPrice = (float) ($product->purchase_price ?: 1000 + ($index * 500));
            $discountPercent = $index === 0 ? 3 : 0;
            $baseAmount = $qty * $unitPrice;
            $discountAmount = $baseAmount * ($discountPercent / 100);
            $taxableAmount = max($baseAmount - $discountAmount, 0);
            $taxAmount = $taxRate ? $taxableAmount * ((float) $taxRate->rate_percent / 100) : 0;
            $lineTotal = round($taxableAmount + $taxAmount, 2);

            $parent->{$relation}()->create([
                'product_id' => $product->id,
                'custom_product_name' => $product->name,
                'description' => $product->description ?: $product->name,
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'discount_percent' => $discountPercent,
                'tax_rate_id' => $taxRate?->id,
                'tax_amount' => round($taxAmount, 2),
                'line_total' => $lineTotal,
            ]);

            $total += $lineTotal;
        }

        $parent->forceFill(['total' => round($total, 2)])->save();

        if ($parent instanceof PurchaseBill) {
            $paidTotal = (float) ($parent->paid_total ?? 0);

            $parent->forceFill([
                'balance_due' => round($total - $paidTotal, 2),
            ])->save();
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

        $total = $this->syncPurchaseLines($bill, 'purchaseBillLines', $products, $taxRate);

        $bill->forceFill([
            'paid_total' => 0,
            'balance_due' => $total,
            'status' => 'posted',
        ])->save();
    }
}
