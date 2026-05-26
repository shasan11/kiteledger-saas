<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;
use Illuminate\Support\Facades\DB;

class AiPaymentCollectionService
{
    protected const MODULE     = 'payment_collection';
    protected const PERMISSION = 'ai.payment_collection.use';

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    public function collectionPlan(array $filters): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        // Build overdue invoice summary (safe DB query, no mutations)
        $overdueData = $this->fetchOverdueData($filters);

        $context = $this->contextBuilder->paymentCollectionContext($filters);
        $context['overdue_summary'] = $overdueData;

        $userPrompt = "Create a payment collection plan for the following overdue invoices.\n"
            . "Filters: " . json_encode($filters) . "\n\n"
            . "Overdue data:\n" . json_encode($overdueData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, customers (array). "
            . "Each customer: contact_id, name, overdue_amount, oldest_due_days, risk_score (0-100), priority (high|medium|low), recommended_action, message_draft.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->paymentCollectionPrompt(),
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'   => '',
            'customers' => [],
        ], $data);
    }

    private function fetchOverdueData(array $filters): array
    {
        try {
            $query = DB::table('invoices as i')
                ->join('contacts as c', 'c.id', '=', 'i.contact_id')
                ->where('i.status', 'approved')
                ->where('i.balance_due', '>', 0)
                ->where('i.due_date', '<', now()->toDateString())
                ->select([
                    'c.id as contact_id',
                    'c.name',
                    DB::raw('SUM(i.balance_due) as overdue_amount'),
                    DB::raw('MAX(DATEDIFF(NOW(), i.due_date)) as oldest_due_days'),
                    DB::raw('COUNT(i.id) as invoice_count'),
                ])
                ->groupBy('c.id', 'c.name');

            if (!empty($filters['customer_id'])) {
                $query->where('i.contact_id', $filters['customer_id']);
            }

            if (!empty($filters['branch_id'])) {
                $query->where('i.branch_id', $filters['branch_id']);
            }

            if (!empty($filters['min_overdue_days'])) {
                $query->havingRaw('MAX(DATEDIFF(NOW(), i.due_date)) >= ?', [$filters['min_overdue_days']]);
            }

            return $query->orderByDesc('overdue_amount')->limit(50)->get()->toArray();
        } catch (\Throwable) {
            return [];
        }
    }
}
