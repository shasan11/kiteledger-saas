<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\CustomerPayment;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProformaInvoice;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use App\Models\TaxRate;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class SalesModuleSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::query()->where('code', 'MAIN')->first()
            ?: Branch::query()->first()
            ?: Branch::query()->create([
                'code' => 'MAIN',
                'name' => 'Main Branch',
                'is_head_office' => true,
                'is_transaction_enabled' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);

        $currency = Currency::query()->where('is_base', true)->first()
            ?: Currency::query()->first()
            ?: Currency::query()->create([
                'code' => 'NPR',
                'name' => 'Nepalese Rupee',
                'symbol' => 'Rs',
                'decimal_places' => 2,
                'is_base' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);

        $account = Account::query()->first()
            ?: Account::query()->create([
                'name' => 'Seed Cash Account',
                'code' => 'SEED-CASH',
                'nature' => 'cash',
                'currency_id' => $currency->id,
                'active' => true,
                'is_system_generated' => true,
            ]);

        $warehouse = Warehouse::query()->first()
            ?: Warehouse::query()->create([
                'branch_id' => $branch->id,
                'code' => 'SEED-WH',
                'name' => 'Seed Warehouse',
                'active' => true,
                'is_system_generated' => true,
            ]);

        $contact = Contact::query()->first()
            ?: Contact::withoutEvents(fn () => Contact::query()->create([
                'account_id' => $account->id,
                'contact_type' => 'customer',
                'name' => 'Seed Customer',
                'code' => 'CUST-SEED',
                'phone' => '9800000000',
                'email' => 'customer@example.test',
                'active' => true,
                'is_system_generated' => true,
            ]));

        $taxRate = $this->ensureTaxRate();

        $products = Product::query()
            ->where('allow_sale', true)
            ->take(3)
            ->get();

        if ($products->isEmpty()) {
            Product::withoutEvents(function () use ($account) {
                foreach ([
                    ['Seed Service Plan', 'SERV-SEED', 1500],
                    ['Seed Hardware Kit', 'KIT-SEED', 3200],
                    ['Seed Support Hours', 'SUP-SEED', 900],
                ] as [$name, $code, $price]) {
                    Product::query()->create([
                        'name' => $name,
                        'code' => $code,
                        'sku' => $code,
                        'description' => $name,
                        'product_type' => 'simple',
                        'sales_account_id' => $account->id,
                        'sales_return_account_id' => $account->id,
                        'selling_price' => $price,
                        'track_inventory' => false,
                        'allow_sale' => true,
                        'allow_purchase' => false,
                        'active' => true,
                        'is_system_generated' => true,
                    ]);
                }
            });

            $products = Product::query()
                ->where('allow_sale', true)
                ->take(3)
                ->get();
        }

        $today = Carbon::today();

        $quotation = Quotation::query()->updateOrCreate(
            ['quotation_no' => 'QT-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'contact_id' => $contact->id,
                'quotation_date' => $today->copy()->subDays(6)->toDateString(),
                'expiry_date' => $today->copy()->addDays(24)->toDateString(),
                'currency_id' => $currency->id,
                'exchange_rate' => 1,
                'notes' => 'Seed quotation for the sales module.',
                'status' => 'sent',
            ]
        );

        $this->syncLines(
            parent: $quotation,
            relation: 'quotationLines',
            products: $products,
            taxRate: $taxRate,
            preferredNameField: 'product_name'
        );

        $salesOrder = SalesOrder::query()->updateOrCreate(
            ['sales_order_no' => 'SO-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'sales_order_date' => $today->copy()->subDays(5)->toDateString(),
                'contact_id' => $contact->id,
                'warehouse_id' => $warehouse->id,
                'currency_id' => $currency->id,
                'reference' => $quotation->quotation_no,
                'notes' => 'Seed sales order converted from quotation.',
                'exchange_rate' => 1,
                'status' => 'confirmed',
            ]
        );

        $this->syncLines(
            parent: $salesOrder,
            relation: 'salesOrderLines',
            products: $products,
            taxRate: $taxRate,
            preferredNameField: 'product_name'
        );

        $proforma = ProformaInvoice::query()->updateOrCreate(
            ['proforma_no' => 'PF-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'reference' => $salesOrder->sales_order_no,
                'proforma_date' => $today->copy()->subDays(4)->toDateString(),
                'contact_id' => $contact->id,
                'currency_id' => $currency->id,
                'notes' => 'Seed proforma invoice for the sales module.',
                'exchange_rate' => 1,
                'status' => 'issued',
            ]
        );

        $this->syncLines(
            parent: $proforma,
            relation: 'proformaInvoiceLines',
            products: $products,
            taxRate: $taxRate,
            preferredNameField: 'custom_product_name'
        );

        $invoice = Invoice::query()->updateOrCreate(
            ['invoice_no' => 'INV-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'invoice_date' => $today->copy()->subDays(3)->toDateString(),
                'due_date' => $today->copy()->addDays(27)->toDateString(),
                'contact_id' => $contact->id,
                'warehouse_id' => $warehouse->id,
                'currency_id' => $currency->id,
                'reference' => $salesOrder->sales_order_no,
                'notes' => 'Seed invoice for the sales module.',
                'exchange_rate' => 1,
                'status' => 'posted',
            ]
        );

        $invoiceTotal = $this->syncLines(
            parent: $invoice,
            relation: 'invoiceLines',
            products: $products,
            taxRate: $taxRate,
            preferredNameField: 'custom_product_name'
        );

        $payment = CustomerPayment::query()->updateOrCreate(
            ['payment_no' => 'RCPT-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'payment_date' => $today->copy()->subDays(2)->toDateString(),
                'contact_id' => $contact->id,
                'account_id' => $account->id,
                'currency_id' => $currency->id,
                'amount' => round($invoiceTotal / 2, 2),
                'payment_method' => 'cash',
                'reference' => $invoice->invoice_no,
                'notes' => 'Seed partial customer payment.',
                'exchange_rate' => 1,
                'total' => round($invoiceTotal / 2, 2),
                'status' => 'posted',
            ]
        );

        $payment->customerPaymentLines()->delete();

        $payment->customerPaymentLines()->create([
            'invoice_id' => $invoice->id,
            'allocated_amount' => round($invoiceTotal / 2, 2),
        ]);

        $this->safeForceFill($invoice, [
            'paid_total' => round($invoiceTotal / 2, 2),
            'balance_due' => round($invoiceTotal / 2, 2),
            'status' => 'part_paid',
        ]);

        $salesReturn = SalesReturn::query()->updateOrCreate(
            ['sales_return_no' => 'SR-SEED-0001'],
            [
                'branch_id' => $branch->id,
                'sales_return_date' => $today->copy()->subDay()->toDateString(),
                'contact_id' => $contact->id,
                'warehouse_id' => $warehouse->id,
                'currency_id' => $currency->id,
                'reference' => $invoice->invoice_no,
                'notes' => 'Seed sales return for the sales module.',
                'exchange_rate' => 1,
                'status' => 'posted',
            ]
        );

        $this->syncLines(
            parent: $salesReturn,
            relation: 'salesReturnLines',
            products: $products->take(1),
            taxRate: $taxRate,
            preferredNameField: 'custom_product_name'
        );
    }

    protected function syncLines(
        $parent,
        string $relation,
        $products,
        ?TaxRate $taxRate,
        string $preferredNameField = 'product_name'
    ): float {
        $lineModel = $parent->{$relation}()->getRelated();
        $lineTable = $lineModel->getTable();

        $parent->{$relation}()->delete();

        $total = 0;
        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;

        foreach ($products->values() as $index => $product) {
            $qty = $index + 1;
            $unitPrice = (float) ($product->selling_price ?: 1000 + ($index * 250));

            $discountPercent = $relation === 'salesReturnLines'
                ? 0
                : ($index === 0 ? 5 : 0);

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
                preferredNameField: $preferredNameField,
                productName: $product->name
            );

            $this->addIfColumn($payload, $lineTable, 'description', $product->description ?: $product->name);
            $this->addIfColumn($payload, $lineTable, 'qty', $qty);
            $this->addIfColumn($payload, $lineTable, 'quantity', $qty);
            $this->addIfColumn($payload, $lineTable, 'unit_price', $unitPrice);
            $this->addIfColumn($payload, $lineTable, 'rate', $unitPrice);

            $this->addIfColumn($payload, $lineTable, 'discount_percent', $discountPercent);
            $this->addIfColumn($payload, $lineTable, 'discount_amount', round($discountAmount, 2));

            $this->addIfColumn($payload, $lineTable, 'tax_rate_id', $taxRate?->id);
            $this->addIfColumn($payload, $lineTable, 'tax_amount', round($taxAmount, 2));

            $this->addIfColumn($payload, $lineTable, 'line_total', $lineTotal);
            $this->addIfColumn($payload, $lineTable, 'total', $lineTotal);

            $parent->{$relation}()->create($payload);
        }

        $this->safeForceFill($parent, [
            'subtotal' => round($subtotal, 2),
            'discount_total' => round($discountTotal, 2),
            'tax_total' => round($taxTotal, 2),
            'total' => round($total, 2),
            'grand_total' => round($total, 2),
        ]);

        return round($total, 2);
    }

    protected function addProductNameField(
        array &$payload,
        string $table,
        string $preferredNameField,
        string $productName
    ): void {
        if (Schema::hasColumn($table, $preferredNameField)) {
            $payload[$preferredNameField] = $productName;
            return;
        }

        if (Schema::hasColumn($table, 'product_name')) {
            $payload['product_name'] = $productName;
            return;
        }

        if (Schema::hasColumn($table, 'custom_product_name')) {
            $payload['custom_product_name'] = $productName;
        }
    }

    protected function addIfColumn(array &$payload, string $table, string $column, mixed $value): void
    {
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

        if (! empty($safeAttributes)) {
            $model->forceFill($safeAttributes)->save();
        }
    }

    protected function ensureTaxRate(): ?TaxRate
    {
        $taxRate = TaxRate::query()
            ->where('active', true)
            ->first()
            ?: TaxRate::query()->first();

        if ($taxRate) {
            return $taxRate;
        }

        $jurisdiction = TaxJurisdiction::query()->first()
            ?: TaxJurisdiction::query()->create([
                'country_code' => 'NP',
                'name' => 'Nepal VAT',
                'code' => 'NP-VAT',
                'tax_system' => 'nepal_vat',
                'active' => true,
                'is_system_generated' => true,
            ]);

        $taxClass = TaxClass::query()
            ->where('country_code', 'NP')
            ->where('code', 'VAT13')
            ->first()
            ?: TaxClass::query()->create([
                'tax_jurisdiction_id' => $jurisdiction->id,
                'country_code' => 'NP',
                'name' => 'VAT 13%',
                'code' => 'VAT13',
                'tax_type' => 'vat',
                'tax_behavior' => 'standard',
                'active' => true,
                'is_system_generated' => true,
            ]);

        return TaxRate::query()->create([
            'tax_class_id' => $taxClass->id,
            'tax_jurisdiction_id' => $jurisdiction->id,
            'country_code' => 'NP',
            'tax_type' => 'vat',
            'name' => 'VAT 13%',
            'code' => 'VAT13',
            'rate_percent' => 13,
            'inclusive' => false,
            'calculation_method' => 'single',
            'applies_on' => 'sale',
            'active' => true,
            'is_system_generated' => true,
        ]);
    }
}