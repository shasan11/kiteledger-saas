<?php

namespace App\Services\AI\Agent;

use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AiRecordSearchService
{
    protected array $modules = [
        'quotations' => ['table' => 'quotations', 'number' => 'quotation_no', 'date' => 'quotation_date', 'amount' => 'total', 'url' => '/payment-in/quotations'],
        'sales_orders' => ['table' => 'sales_orders', 'number' => 'sales_order_no', 'date' => 'order_date', 'amount' => 'total', 'url' => '/payment-in/sales-orders'],
        'invoices' => ['table' => 'invoices', 'number' => 'invoice_no', 'date' => 'invoice_date', 'amount' => 'total', 'url' => '/payment-in/invoices'],
        'customer_payments' => ['table' => 'customer_payments', 'number' => 'payment_no', 'date' => 'payment_date', 'amount' => 'amount', 'url' => '/payment-in/customer-payments'],
        'credit_notes' => ['table' => 'credit_notes', 'number' => 'credit_note_no', 'date' => 'credit_note_date', 'amount' => 'total', 'url' => '/payment-in/credit-notes'],
        'purchase_orders' => ['table' => 'purchase_orders', 'number' => 'purchase_order_no', 'date' => 'order_date', 'amount' => 'total', 'url' => '/payment-out/purchase-orders'],
        'purchase_bills' => ['table' => 'purchase_bills', 'number' => 'bill_no', 'date' => 'bill_date', 'amount' => 'total', 'url' => '/payment-out/purchase-bills'],
        'supplier_payments' => ['table' => 'supplier_payments', 'number' => 'payment_no', 'date' => 'payment_date', 'amount' => 'amount', 'url' => '/payment-out/supplier-payments'],
        'debit_notes' => ['table' => 'debit_notes', 'number' => 'debit_note_no', 'date' => 'debit_note_date', 'amount' => 'total', 'url' => '/payment-out/debit-notes'],
        'expenses' => ['table' => 'expenses', 'number' => 'expense_no', 'date' => 'expense_date', 'amount' => 'total', 'url' => '/payment-out/expenses'],
        'journal_vouchers' => ['table' => 'journal_vouchers', 'number' => 'voucher_no', 'date' => 'voucher_date', 'amount' => 'total', 'url' => '/accounting/journal-vouchers'],
        'cash_transfers' => ['table' => 'cash_transfers', 'number' => 'transfer_no', 'date' => 'transfer_date', 'amount' => 'amount', 'url' => '/accounting/cash-transfers'],
        'products' => ['table' => 'products', 'number' => 'code', 'date' => 'created_at', 'amount' => null, 'url' => '/inventory/products'],
        'contacts' => ['table' => 'contacts', 'number' => 'code', 'date' => 'created_at', 'amount' => null, 'url' => '/actors/contacts'],
    ];

    public function __construct(protected BranchScopeService $scope) {}

    public function search(Request $request, string $module, string $message, int $limit = 10): ?array
    {
        $config = $this->modules[$module] ?? null;
        if (!$config || !Schema::hasTable($config['table'])) {
            return null;
        }

        $table = $config['table'];
        $query = DB::table($table);

        if (Schema::hasColumn($table, 'branch_id')) {
            $branchId = $this->scope->selectedBranchId($request, $request->user());
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
        }

        if (Schema::hasColumn($table, 'active')) {
            $query->where(function ($q) use ($table) {
                $q->where($table . '.active', true)->orWhereNull($table . '.active');
            });
        }

        $m = mb_strtolower($message);
        if (str_contains($m, 'draft') && Schema::hasColumn($table, 'approved')) {
            $query->where(function ($q) use ($table) {
                $q->where($table . '.approved', false)->orWhereNull($table . '.approved');
            });
        }
        if ((str_contains($m, 'unpaid') || str_contains($m, 'due')) && Schema::hasColumn($table, 'balance_due')) {
            $query->where('balance_due', '>', 0);
        }
        if (str_contains($m, 'today') && $config['date'] && Schema::hasColumn($table, $config['date'])) {
            $query->whereDate($config['date'], now()->toDateString());
        }
        if (str_contains($m, 'this month') && $config['date'] && Schema::hasColumn($table, $config['date'])) {
            $query->whereDate($config['date'], '>=', now()->startOfMonth()->toDateString())
                ->whereDate($config['date'], '<=', now()->endOfMonth()->toDateString());
        }

        $keyword = $this->extractKeyword($message);
        if ($keyword) {
            $query->where(function ($q) use ($table, $config, $keyword) {
                foreach (['name', 'title', 'reference', 'notes', 'status', $config['number']] as $column) {
                    if ($column && Schema::hasColumn($table, $column)) {
                        $q->orWhere($column, 'like', '%' . $keyword . '%');
                    }
                }
            });
        }

        $columns = ['id'];
        foreach ([$config['number'], 'name', 'title', 'status', $config['date'], $config['amount'], 'balance_due'] as $column) {
            if ($column && Schema::hasColumn($table, $column) && !in_array($column, $columns, true)) {
                $columns[] = $column;
            }
        }

        if ($config['date'] && Schema::hasColumn($table, $config['date'])) {
            $query->orderByDesc($config['date']);
        } elseif (Schema::hasColumn($table, 'created_at')) {
            $query->orderByDesc('created_at');
        }

        $records = $query->limit($limit)->get($columns)->map(function ($row) use ($config) {
            $id = $row->id ?? null;
            return [
                'id' => $id,
                'number' => $config['number'] && isset($row->{$config['number']}) ? $row->{$config['number']} : null,
                'name' => $row->name ?? $row->title ?? null,
                'date' => $config['date'] && isset($row->{$config['date']}) ? (string) $row->{$config['date']} : null,
                'amount' => $config['amount'] && isset($row->{$config['amount']}) ? (float) $row->{$config['amount']} : null,
                'balance_due' => isset($row->balance_due) ? (float) $row->balance_due : null,
                'status' => $row->status ?? null,
                'open_url' => $id ? $config['url'] . '/' . $id : $config['url'],
            ];
        })->values()->all();

        return [
            'type' => 'record_list',
            'module' => $module,
            'title' => 'Matching ' . str_replace('_', ' ', $module),
            'records' => $records,
            'open_url' => $config['url'],
        ];
    }

    private function extractKeyword(string $message): ?string
    {
        $message = trim($message);
        if (preg_match('/(?:for|of|from|customer|supplier)\s+([A-Za-z0-9\-_. ]{3,40})/i', $message, $m)) {
            return trim($m[1]);
        }
        return null;
    }
}
