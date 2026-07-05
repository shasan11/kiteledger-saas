<?php

namespace App\Services\SaaS;

use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DefaultTemplateService
{
    private const TABLES = [
        'chart_of_accounts' => 'chart_of_accounts', 'currencies' => 'currencies', 'tax_rates' => 'tax_rates',
        'product_categories' => 'product_categories', 'product_units' => 'product_units', 'payment_methods' => 'master_data',
        'app_settings' => 'app_settings', 'document_numbering' => 'document_numberings',
    ];

    public function apply(Tenant $tenant, ?DefaultDataTemplate $template): void
    {
        if (! $template) {
            return;
        }
        $items = $template->items()->where('is_active', true)->get();
        $tenant->run(function () use ($items): void {
            foreach ($items as $item) {
                $table = self::TABLES[$item->category] ?? null;
                if (! $table || ! Schema::hasTable($table)) {
                    continue;
                }
                $records = array_is_list($item->payload) ? $item->payload : [$item->payload];
                foreach ($records as $record) {
                    $record = array_intersect_key($record, array_flip(Schema::getColumnListing($table)));
                    if ($record) {
                        DB::table($table)->updateOrInsert(array_filter(['id' => $record['id'] ?? null, 'code' => $record['code'] ?? null, 'name' => $record['name'] ?? null]), $record);
                    }
                }
            }
        });
    }
}
