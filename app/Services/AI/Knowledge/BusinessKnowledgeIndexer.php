<?php

namespace App\Services\AI\Knowledge;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class BusinessKnowledgeIndexer
{
    public function __construct(private AiKnowledgeChunkWriter $writer) {}

    public function index(?string $only = null, bool $embed = true, ?callable $progress = null): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'embeddings_created' => 0, 'embeddings_skipped' => 0, 'errors' => 0];

        foreach ($this->sources() as $type => $cfg) {
            if ($only && $only !== $type) {
                continue;
            }
            if (! Schema::hasTable($cfg['table'])) {
                continue;
            }

            $columns = Schema::getColumnListing($cfg['table']);
            DB::table($cfg['table'])->orderBy('id')->chunk(100, function ($rows) use ($type, $cfg, $columns, $embed, $progress, &$stats): void {
                foreach ($rows as $row) {
                    try {
                        $chunk = $this->chunk($type, $cfg, (array) $row, $columns);
                        $result = $this->writer->write($chunk, $embed);
                        foreach ($stats as $key => $value) {
                            $stats[$key] = $value + ($result[$key] ?? 0);
                        }
                        if ($progress) {
                            $progress($chunk['title']);
                        }
                    } catch (Throwable) {
                        $stats['errors']++;
                    }
                }
            });
        }

        return $stats;
    }

    private function sources(): array
    {
        return [
            'invoice' => $this->cfg('invoices', 'Sales', '/payment-in/invoices', ['invoice_no', 'invoice_number'], ['invoice_date', 'date'], ['notes', 'remarks', 'reference'], 'invoice_lines', 'invoice_id'),
            'quotation' => $this->cfg('quotations', 'Sales', '/payment-in/quotations', ['quotation_no'], ['quotation_date', 'date'], ['notes', 'remarks', 'reference', 'terms_and_conditions'], 'quotation_lines', 'quotation_id'),
            'sales_order' => $this->cfg('sales_orders', 'Sales', '/payment-in/sales-orders', ['sales_order_no', 'order_no'], ['sales_order_date', 'order_date', 'date'], ['notes', 'remarks', 'reference'], 'sales_order_lines', 'sales_order_id'),
            'purchase_bill' => $this->cfg('purchase_bills', 'Purchase', '/payment-out/purchase-bills', ['bill_no', 'purchase_bill_no'], ['bill_date', 'date'], ['notes', 'remarks', 'reference'], 'purchase_bill_lines', 'purchase_bill_id'),
            'purchase_order' => $this->cfg('purchase_orders', 'Purchase', '/payment-out/purchase-orders', ['purchase_order_no', 'order_no'], ['purchase_order_date', 'order_date', 'date'], ['notes', 'remarks', 'reference'], 'purchase_order_lines', 'purchase_order_id'),
            'expense' => $this->cfg('expenses', 'Purchase', '/payment-out/expenses', ['expense_no'], ['expense_date', 'date'], ['notes', 'remarks', 'reference', 'description']),
            'customer_payment' => $this->cfg('customer_payments', 'Sales', '/payment-in/customer-payments', ['payment_no', 'receipt_no'], ['payment_date', 'date'], ['notes', 'remarks', 'reference']),
            'supplier_payment' => $this->cfg('supplier_payments', 'Purchase', '/payment-out/supplier-payments', ['payment_no'], ['payment_date', 'date'], ['notes', 'remarks', 'reference']),
            'journal_voucher' => $this->cfg('journal_vouchers', 'Accounting', '/accounting/journal-vouchers', ['voucher_no'], ['voucher_date', 'date'], ['narration', 'notes', 'reference']),
            'account' => $this->cfg('accounts', 'Accounting', '/accounting/accounts', ['code'], ['created_at'], ['name', 'description']),
            'contact' => $this->cfg('contacts', 'Contacts', '/actors/contacts', ['code', 'name'], ['created_at'], ['name', 'contact_type', 'address', 'email', 'phone']),
            'product' => $this->cfg('products', 'Inventory', '/inventory/products', ['code', 'sku', 'name'], ['created_at'], ['name', 'description', 'barcode']),
            'product_variant' => $this->cfg('product_variant_items', 'Inventory', '/inventory/products', ['sku', 'code', 'name'], ['created_at'], ['name', 'description', 'barcode']),
            'warehouse' => $this->cfg('warehouses', 'Inventory', '/inventory/warehouses', ['code', 'name'], ['created_at'], ['name', 'address']),
            'warehouse_stock' => $this->cfg('warehouse_items', 'Inventory', '/inventory/warehouse-items', ['sku', 'product_name'], ['updated_at', 'created_at'], ['product_name', 'quantity', 'available_quantity']),
            'pos_sale' => $this->cfg('pos_sales', 'POS', '/pos/sales', ['sale_no', 'invoice_no'], ['sale_date', 'date', 'created_at'], ['notes', 'reference']),
        ];
    }

    private function cfg(string $table, string $module, string $route, array $numbers, array $dates, array $text, ?string $lineTable = null, ?string $foreignKey = null): array
    {
        return compact('table', 'module', 'route', 'numbers', 'dates', 'text', 'lineTable', 'foreignKey');
    }

    private function chunk(string $type, array $cfg, array $row, array $columns): array
    {
        $number = $this->first($row, $cfg['numbers']) ?: Str::headline($type);
        $date = $this->first($row, $cfg['dates']);
        $status = $this->first($row, ['payment_status', 'status', 'contact_type']);
        $total = $this->first($row, ['grand_total', 'total', 'amount', 'balance_due']);
        $contactId = $this->first($row, ['contact_id', 'customer_id', 'supplier_id']);
        $contact = $contactId && Schema::hasTable('contacts')
            ? DB::table('contacts')->where('id', $contactId)->value('name')
            : null;

        $sentences = ["{$cfg['module']} record {$number}."];
        if ($contact) {
            $sentences[] = "Contact: {$contact}.";
        }
        if ($date) {
            $sentences[] = "Date: {$date}.";
        }
        if ($status) {
            $sentences[] = 'Status: '.Str::headline((string) $status).'.';
        }
        if ($total !== null && $total !== '') {
            $sentences[] = "Recorded total: {$total}.";
        }
        foreach ($cfg['text'] as $column) {
            if (in_array($column, $columns, true) && ! empty($row[$column])) {
                $sentences[] = Str::headline($column).': '.Str::limit(strip_tags((string) $row[$column]), 700).'.';
            }
        }
        if ($items = $this->lineSummary($cfg, (string) $row['id'])) {
            $sentences[] = 'Items: '.$items.'.';
        }

        return [
            'source_type' => $type,
            'source_id' => $type.':'.$row['id'],
            'module' => $cfg['module'],
            'title' => Str::headline($type).' '.$number.($contact ? ' - '.$contact : ''),
            'content' => implode(' ', $sentences),
            // Internal UUID routes are deliberately omitted from normal source cards.
            'route' => null,
            'permission' => null,
            'keywords' => array_values(array_filter([$number, $contact, $status, $type, $cfg['module']])),
            'metadata' => array_filter([
                'display_number' => $number, 'module_route' => $cfg['route'],
                'date' => $date, 'status' => $status, 'total' => $total,
                'customer_name' => $contact,
            ], fn ($value) => $value !== null && $value !== ''),
            'branch_id' => $row['branch_id'] ?? null,
            'fiscal_year_id' => $row['fiscal_year_id'] ?? null,
        ];
    }

    private function first(array $row, array $columns): mixed
    {
        foreach ($columns as $column) {
            if (array_key_exists($column, $row) && $row[$column] !== null && $row[$column] !== '') {
                return $row[$column];
            }
        }

        return null;
    }

    private function lineSummary(array $cfg, string $recordId): string
    {
        $table = $cfg['lineTable'] ?? null;
        $foreignKey = $cfg['foreignKey'] ?? null;
        if (! $table || ! $foreignKey || ! Schema::hasTable($table) || ! Schema::hasColumn($table, $foreignKey)) {
            return '';
        }

        return DB::table($table)->where($foreignKey, $recordId)->limit(20)->get()
            ->map(function ($line): string {
                $line = (array) $line;
                $name = $this->first($line, ['item_name', 'product_name', 'description']);
                if (! $name && ! empty($line['product_id']) && Schema::hasTable('products')) {
                    $name = DB::table('products')->where('id', $line['product_id'])->value('name');
                }
                $quantity = $this->first($line, ['quantity', 'qty']);

                return trim(($name ?: 'Item').($quantity !== null ? ' x'.$quantity : ''));
            })->filter()->implode(', ');
    }
}
