<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;
use Illuminate\Support\Facades\DB;

class AiInventoryInsightService
{
    protected const MODULE     = 'inventory_insights';
    protected const PERMISSION = 'ai.inventory_insight.use';

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    public function insights(array $filters): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $inventoryData = $this->fetchInventoryData($filters);

        $context = $this->contextBuilder->inventoryContext($filters);
        $context['inventory_snapshot'] = $inventoryData;

        $userPrompt = "Analyse inventory health and provide insights.\n"
            . "Filters: " . json_encode($filters) . "\n\n"
            . "Inventory data:\n" . json_encode($inventoryData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, low_stock (array), dead_stock (array), reorder_suggestions (array), risks (array), recommended_actions (array).";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->inventoryInsightPrompt(),
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'              => '',
            'low_stock'            => [],
            'dead_stock'           => [],
            'reorder_suggestions'  => [],
            'risks'                => [],
            'recommended_actions'  => [],
        ], $data);
    }

    private function fetchInventoryData(array $filters): array
    {
        try {
            $query = DB::table('warehouse_items as wi')
                ->join('products as p', 'p.id', '=', 'wi.product_id')
                ->select([
                    'p.id as product_id',
                    'p.name as product_name',
                    'p.sku',
                    DB::raw('SUM(wi.quantity_on_hand) as qty_on_hand'),
                    DB::raw('MIN(p.reorder_point) as reorder_point'),
                ])
                ->groupBy('p.id', 'p.name', 'p.sku');

            if (!empty($filters['branch_id'])) {
                $query->where('wi.branch_id', $filters['branch_id']);
            }

            if (!empty($filters['warehouse_id'])) {
                $query->where('wi.warehouse_id', $filters['warehouse_id']);
            }

            return $query->orderBy('qty_on_hand')->limit(100)->get()->toArray();
        } catch (\Throwable) {
            return [];
        }
    }
}
