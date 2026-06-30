<?php

namespace App\Services\AI\Knowledge;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class AppKnowledgeIndexer
{
    public function __construct(private AiKnowledgeChunkWriter $writer) {}

    public function index(bool $embed = true, ?callable $progress = null): array
    {
        $stats = $this->emptyStats();
        foreach ($this->curated() as $chunk) {
            $this->write($chunk, $embed, $stats, $progress);
        }

        foreach (RouteFacade::getRoutes() as $route) {
            if (! $route instanceof Route || ! in_array('GET', $route->methods(), true)) {
                continue;
            }
            $uri = '/'.ltrim($route->uri(), '/');
            if (str_starts_with($uri, '/api/') || str_starts_with($uri, '/install') || str_contains($uri, '{')) {
                continue;
            }
            $name = $route->getName() ?: trim($route->uri(), '/');
            if (! $name) {
                continue;
            }
            $title = Str::headline(str_replace(['.', '-', '/'], ' ', $name));
            $module = Str::headline(explode('.', $name)[0] ?? 'General');
            $this->write([
                'source_type' => 'route', 'source_id' => 'route:'.$name,
                'module' => $module, 'title' => $title,
                'content' => "KiteLedger page {$title}. Open it at {$uri}. Use this page for {$title} tasks.",
                'route' => $uri, 'permission' => $this->permission($route),
                'keywords' => array_values(array_unique(array_filter(explode(' ', Str::lower($title.' '.$module))))),
                'metadata' => ['kind' => 'page', 'route_name' => $name],
            ], $embed, $stats, $progress);
        }

        foreach (['README.md', 'INSTALL.md', 'PACKAGING.md'] as $file) {
            $this->indexDocument(base_path($file), $embed, $stats, $progress);
        }
        foreach (glob(base_path('docs/*.md')) ?: [] as $file) {
            $this->indexDocument($file, $embed, $stats, $progress);
        }
        $this->indexAppTables($embed, $stats, $progress);

        return $stats;
    }

    private function curated(): array
    {
        return [
            $this->help('invoice-workflow', 'Sales', 'Create Invoice Workflow', 'Go to Sales > Invoices and choose New Invoice. Select the customer, add products or services, review tax, discounts and totals, then save as draft or approve when permitted.', '/payment-in/invoices', ['invoice', 'create invoice', 'sales workflow']),
            $this->help('cheque-format', 'Settings', 'Cheque Format Settings', 'Open Settings > Cheque Format Editor to configure cheque dimensions, fields, alignment and printing layout.', '/settings/cheque-formats', ['cheque', 'print cheque', 'cheque format']),
            $this->help('branch-scope', 'Administration', 'Branch Scope', 'Branch scope limits records to branches assigned to a user. Above-branch roles can select all branches; branch-limited users can only access assigned branch records.', null, ['branch', 'scope', 'permissions', 'access']),
            $this->help('trial-balance', 'Reports', 'Trial Balance Report', 'Trial Balance lists account debit and credit balances for a selected period. Total debits and credits should balance. Open Reports > Accounting > Trial Balance and apply branch and fiscal-period filters.', '/reports/accounting/trial-balance', ['trial balance', 'debit', 'credit', 'accounting report']),
            $this->help('payment-gateway', 'Settings', 'Payment Gateway Setup', 'Open Settings > Online Payments to enable a gateway, enter credentials, choose test or live mode, save, and verify the connection before sharing payment links.', '/settings/payment-gateways', ['payment gateway', 'online payment', 'stripe', 'paypal']),
            $this->help('ai-settings', 'Settings', 'AI Assistant Settings', 'Open Settings > AI to enable the assistant and configure its provider credentials. Normal users do not see provider, model, or technical retrieval details.', '/settings/ai', ['ai settings', 'assistant', 'api key']),
            $this->help('inventory-low-stock', 'Inventory', 'Inventory Low Stock', 'Use the inventory and low-stock reports to compare available quantity with each product reorder level. Filter by branch and warehouse for an accurate view.', '/reports/inventory', ['inventory', 'low stock', 'reorder']),
            $this->help('customer-payment', 'Sales', 'Customer Payment Workflow', 'Open Sales > Customer Payments, choose the customer, enter payment details, and allocate the amount to outstanding invoices. Review the unallocated amount before saving.', '/payment-in/customer-payments', ['customer payment', 'invoice allocation', 'receivable']),
            $this->help('quotation-sales-order', 'Sales', 'Quotation and Sales Order Difference', 'A quotation is an offer sent before customer commitment. A sales order records the confirmed customer order. A quotation can be converted into a sales order and later invoiced.', '/payment-in/quotations', ['quotation', 'sales order', 'difference']),
            $this->help('unpaid-invoices', 'Sales', 'Unpaid Invoices', 'An invoice remains unpaid when its allocated customer payments are below the invoice total. Review the receivables or ageing report for exact outstanding balances.', '/reports/receivables', ['unpaid invoice', 'outstanding', 'receivable', 'ageing']),
        ];
    }

    private function help(string $id, string $module, string $title, string $content, ?string $route, array $keywords): array
    {
        return ['source_type' => 'app_help', 'source_id' => $id, 'module' => $module, 'title' => $title, 'content' => $content, 'route' => $route, 'permission' => null, 'keywords' => $keywords, 'metadata' => ['kind' => 'curated_help']];
    }

    private function indexDocument(string $path, bool $embed, array &$stats, ?callable $progress): void
    {
        if (! is_file($path)) {
            return;
        }
        $content = (string) file_get_contents($path);
        $parts = preg_split('/(?=^#{1,3}\s+)/m', $content) ?: [];
        foreach ($parts as $index => $part) {
            $part = trim($part);
            if (mb_strlen($part) < 40) {
                continue;
            }
            preg_match('/^#{1,3}\s+(.+)$/m', $part, $match);
            $title = trim($match[1] ?? pathinfo($path, PATHINFO_FILENAME));
            $this->write([
                'source_type' => 'documentation',
                'source_id' => 'doc:'.sha1($path.':'.$index),
                'module' => 'Documentation', 'title' => $title,
                'content' => Str::limit(strip_tags($part), 3500, ''),
                'route' => null, 'permission' => null,
                'keywords' => explode(' ', Str::lower($title)),
                'metadata' => ['file' => basename($path)],
            ], $embed, $stats, $progress);
        }
    }

    private function permission(Route $route): ?string
    {
        foreach ($route->gatherMiddleware() as $middleware) {
            if (str_starts_with($middleware, 'permission:')) {
                return explode(',', substr($middleware, 11))[0] ?: null;
            }
        }

        return null;
    }

    private function indexAppTables(bool $embed, array &$stats, ?callable $progress): void
    {
        $tables = [
            'permissions' => ['module' => 'Access Control', 'title' => ['label', 'name'], 'content' => ['description', 'name']],
            'printing_templates' => ['module' => 'Printing', 'title' => ['name', 'title'], 'content' => ['description', 'content', 'body']],
            'email_templates' => ['module' => 'Email', 'title' => ['name', 'title', 'subject'], 'content' => ['description', 'subject', 'body', 'content']],
        ];

        foreach ($tables as $table => $cfg) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $columns = Schema::getColumnListing($table);
            DB::table($table)->orderBy('id')->chunk(100, function ($rows) use ($table, $cfg, $columns, $embed, &$stats, $progress): void {
                foreach ($rows as $row) {
                    $data = (array) $row;
                    $title = $this->firstValue($data, $cfg['title']) ?: Str::headline($table);
                    $content = collect($cfg['content'])
                        ->filter(fn ($column) => in_array($column, $columns, true) && ! empty($data[$column]))
                        ->map(fn ($column) => Str::headline($column).': '.strip_tags((string) $data[$column]))
                        ->implode(' ');
                    if ($content === '') {
                        continue;
                    }
                    $this->write([
                        'source_type' => $table === 'permissions' ? 'permission' : 'template',
                        'source_id' => $table.':'.$data['id'], 'module' => $cfg['module'],
                        'title' => (string) $title, 'content' => Str::limit($content, 3500, ''),
                        'route' => null, 'permission' => null,
                        'keywords' => explode(' ', Str::lower((string) $title)),
                        'metadata' => ['kind' => Str::singular($table)],
                    ], $embed, $stats, $progress);
                }
            });
        }
    }

    private function firstValue(array $row, array $columns): mixed
    {
        foreach ($columns as $column) {
            if (! empty($row[$column])) {
                return $row[$column];
            }
        }

        return null;
    }

    private function write(array $chunk, bool $embed, array &$stats, ?callable $progress): void
    {
        try {
            $stats = $this->merge($stats, $this->writer->write($chunk, $embed));
            if ($progress) {
                $progress($chunk['title']);
            }
        } catch (Throwable) {
            $stats['errors']++;
        }
    }

    private function emptyStats(): array
    {
        return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'embeddings_created' => 0, 'embeddings_skipped' => 0, 'errors' => 0];
    }

    private function merge(array $a, array $b): array
    {
        foreach ($a as $key => $value) {
            $a[$key] = $value + ($b[$key] ?? 0);
        }

        return $a;
    }
}
