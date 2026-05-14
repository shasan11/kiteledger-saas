<?php

namespace App\Services\Crm;

use App\Models\CrmAccount;
use App\Models\CrmActivity;
use App\Models\CrmCommunication;
use App\Models\CrmDealStageHistory;
use App\Models\Deal;
use App\Models\Invoice;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CrmInsightService
{
    public function dashboard(array $filters = []): array
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();

        $openDeals = Deal::query()->where('status', 'open');
        $wonThisMonth = Deal::query()->where('status', 'won')->whereBetween('closed_date', [$monthStart, $monthEnd]);
        $lostThisMonth = Deal::query()->where('status', 'lost')->whereBetween('closed_date', [$monthStart, $monthEnd]);

        $wonCount = (clone $wonThisMonth)->count();
        $lostCount = (clone $lostThisMonth)->count();
        $closedCount = $wonCount + $lostCount;

        return [
            'metrics' => [
                'leads_created_this_week' => Lead::query()->where('created_at', '>=', $now->copy()->startOfWeek())->count(),
                'open_leads' => Lead::query()->whereNotIn('status', ['converted', 'lost'])->count(),
                'followups_due_today' => CrmActivity::query()->whereDate('due_at', $now->toDateString())->whereNotIn('status', ['completed', 'cancelled'])->count(),
                'overdue_activities' => CrmActivity::query()->where('due_at', '<', $now)->whereNotIn('status', ['completed', 'cancelled'])->count(),
                'deals_at_risk' => $this->stuckDeals((int) ($filters['stuck_deal_days'] ?? 14))->count(),
                'open_pipeline_value' => (float) (clone $openDeals)->sum('amount'),
                'weighted_forecast_this_month' => $this->forecast(['period' => 'this_month'])['totals']['weighted_forecast'],
                'won_deals_this_month' => $wonCount,
                'lost_deals_this_month' => $lostCount,
                'win_rate' => $closedCount > 0 ? round(($wonCount / $closedCount) * 100, 1) : 0,
            ],
            'top_overdue_customer_responses' => $this->activityInbox(['bucket' => 'overdue'])->take(8)->values(),
            'charts' => [
                'lead_source_breakdown' => $this->countBy(Lead::query(), 'lead_source', 'Unspecified'),
                'deals_by_stage' => Deal::query()
                    ->leftJoin('deal_stages', 'deals.deal_stage_id', '=', 'deal_stages.id')
                    ->selectRaw('COALESCE(deal_stages.name, ?) as name, COUNT(*) as count, COALESCE(SUM(deals.amount), 0) as value', ['Unassigned'])
                    ->groupBy('deal_stages.name')
                    ->orderBy('value', 'desc')
                    ->get(),
                'forecast_by_month' => $this->forecastByMonth(),
                'win_loss_trend' => $this->winLossTrend(),
                'activity_completion_status' => $this->countBy(CrmActivity::query(), 'status', 'pending'),
            ],
        ];
    }

    public function accountSummary(CrmAccount $account): array
    {
        $contactIds = $account->contacts()->pluck('id');
        $openInvoices = Invoice::query()
            ->whereIn('contact_id', $contactIds)
            ->where('balance_due', '>', 0);

        $overdueAmount = (clone $openInvoices)
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString())
            ->sum('balance_due');

        $lastInteraction = collect([
            $account->activities()->max('updated_at'),
            $account->communications()->max('communication_date'),
        ])->filter()->max();

        $nextFollowUp = $account->activities()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->orderBy('due_at')
            ->first();

        $score = $this->healthFor($account, (float) $overdueAmount, (int) (clone $openInvoices)->count(), $lastInteraction);

        return [
            'account' => $account->load([
                'owner',
                'branch',
                'parentAccount',
                'contacts',
                'contactRoles.contact',
                'deals.dealStage',
                'activities' => fn ($query) => $query->latest()->limit(20),
            ]),
            'counts' => [
                'contacts' => $account->contacts()->count(),
                'open_leads' => $account->leads()->whereNotIn('status', ['converted', 'lost'])->count(),
                'open_deals' => $account->deals()->where('status', 'open')->count(),
                'open_activities' => $account->activities()->whereNotIn('status', ['completed', 'cancelled'])->count(),
                'open_invoices' => (clone $openInvoices)->count(),
            ],
            'commercials' => [
                'open_pipeline_value' => (float) $account->deals()->where('status', 'open')->sum('amount'),
                'won_revenue' => (float) $account->deals()->where('status', 'won')->sum('amount'),
                'outstanding_receivables' => (float) (clone $openInvoices)->sum('balance_due'),
                'overdue_invoice_amount' => (float) $overdueAmount,
                'credit_limit' => (float) ($account->credit_limit ?? 0),
                'credit_exposure' => (float) (clone $openInvoices)->sum('balance_due'),
            ],
            'last_interaction_at' => $lastInteraction,
            'next_follow_up' => $nextFollowUp,
            'health' => $score,
            'next_best_action' => $this->nextBestAction($account, $score, $nextFollowUp, (float) $overdueAmount),
        ];
    }

    public function accountCommercials(CrmAccount $account): array
    {
        $contactIds = $account->contacts()->pluck('id');

        return [
            'quotations' => DB::table('quotations')->whereIn('contact_id', $contactIds)->latest()->limit(20)->get(),
            'sales_orders' => DB::table('sales_orders')->whereIn('contact_id', $contactIds)->latest()->limit(20)->get(),
            'invoices' => DB::table('invoices')->whereIn('contact_id', $contactIds)->latest()->limit(20)->get(),
            'payments' => DB::table('customer_payments')->whereIn('contact_id', $contactIds)->latest()->limit(20)->get(),
            'credit_notes' => DB::table('sales_returns')->whereIn('contact_id', $contactIds)->latest()->limit(20)->get(),
            'receivables' => DB::table('invoices')->whereIn('contact_id', $contactIds)->where('balance_due', '>', 0)->latest()->limit(20)->get(),
        ];
    }

    public function timeline(CrmAccount $account): Collection
    {
        $contactIds = $account->contacts()->pluck('id');

        $activities = $account->activities()->with(['assignedTo', 'lead', 'deal', 'contact'])->latest()->limit(50)->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'type' => 'activity',
                'title' => $row->subject,
                'status' => $row->status,
                'description' => $row->description,
                'date' => $row->due_at ?? $row->created_at,
                'record' => $row,
            ]);

        $communications = $account->communications()->with(['createdBy'])->latest('communication_date')->limit(50)->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'type' => 'communication',
                'title' => $row->subject ?: ucfirst($row->type),
                'status' => $row->sentiment,
                'description' => $row->body,
                'date' => $row->communication_date ?? $row->created_at,
                'record' => $row,
            ]);

        $documents = collect()
            ->merge(DB::table('quotations')->whereIn('contact_id', $contactIds)->select('id', 'quotation_no as title', 'status', 'total', 'quotation_date as date')->limit(30)->get()->map(fn ($row) => (array) $row + ['type' => 'quotation']))
            ->merge(DB::table('invoices')->whereIn('contact_id', $contactIds)->select('id', 'invoice_no as title', 'status', 'total', 'invoice_date as date')->limit(30)->get()->map(fn ($row) => (array) $row + ['type' => 'invoice']))
            ->map(fn ($row) => [
                'id' => $row['id'],
                'type' => $row['type'],
                'title' => $row['title'],
                'status' => $row['status'],
                'description' => isset($row['total']) ? 'Amount: ' . $row['total'] : null,
                'date' => $row['date'],
                'record' => $row,
            ]);

        return $activities
            ->merge($communications)
            ->merge($documents)
            ->sortByDesc(fn ($row) => Carbon::parse($row['date'] ?? now())->timestamp)
            ->values();
    }

    public function activityInbox(array $filters = []): Collection
    {
        $query = CrmActivity::query()->with(['lead', 'deal', 'contact', 'crmAccount', 'assignedTo']);
        $bucket = $filters['bucket'] ?? null;

        $query->when($bucket === 'today', fn (Builder $q) => $q->whereDate('due_at', now()->toDateString())->whereNotIn('status', ['completed', 'cancelled']));
        $query->when($bucket === 'overdue', fn (Builder $q) => $q->where('due_at', '<', now())->whereNotIn('status', ['completed', 'cancelled']));
        $query->when($bucket === 'upcoming', fn (Builder $q) => $q->where('due_at', '>', now())->whereNotIn('status', ['completed', 'cancelled']));
        $query->when(!empty($filters['assigned_to_id']), fn (Builder $q) => $q->where('assigned_to_id', $filters['assigned_to_id']));
        $query->when(!empty($filters['priority']), fn (Builder $q) => $q->where('priority', $filters['priority']));
        $query->when(!empty($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']));
        $query->when(!empty($filters['activity_type']), fn (Builder $q) => $q->where('activity_type', $filters['activity_type']));

        return $query->orderByRaw('CASE WHEN due_at IS NULL THEN 1 ELSE 0 END')->orderBy('due_at')->limit(200)->get();
    }

    public function stuckDeals(int $days = 14): Collection
    {
        $threshold = now()->subDays(max($days, 1));

        return Deal::query()
            ->with(['contact', 'crmAccount', 'dealStage', 'assignedTo', 'crmActivities' => fn ($q) => $q->latest()->limit(1), 'stageHistories' => fn ($q) => $q->latest('changed_at')->limit(1)])
            ->where('status', 'open')
            ->get()
            ->map(function (Deal $deal) use ($threshold) {
                $lastActivityAt = $deal->crmActivities->first()?->created_at;
                $lastStageChangeAt = $deal->stageHistories->first()?->changed_at ?? $deal->updated_at;
                $reasons = [];

                if (!$lastActivityAt || Carbon::parse($lastActivityAt)->lt($threshold)) {
                    $reasons[] = 'No activity';
                }

                if (!$lastStageChangeAt || Carbon::parse($lastStageChangeAt)->lt($threshold)) {
                    $reasons[] = 'Stage idle';
                }

                if ($deal->expected_close_date && Carbon::parse($deal->expected_close_date)->lt(now()->startOfDay())) {
                    $reasons[] = 'Close date overdue';
                }

                $deal->setAttribute('stuck_reasons', $reasons);
                $deal->setAttribute('is_stuck', count($reasons) > 0);

                return $deal;
            })
            ->filter(fn (Deal $deal) => $deal->is_stuck)
            ->values();
    }

    public function forecast(array $filters = []): array
    {
        $query = Deal::query()->with(['dealStage', 'assignedTo'])->whereIn('status', ['open', 'won']);
        $period = $filters['period'] ?? 'this_month';

        [$start, $end] = $this->periodBounds($period);
        $query->whereBetween('expected_close_date', [$start, $end]);
        $query->when(!empty($filters['owner_id']), fn ($q) => $q->where('assigned_to_id', $filters['owner_id']));
        $query->when(!empty($filters['pipeline_id']), fn ($q) => $q->where('deal_pipeline_id', $filters['pipeline_id']));

        $deals = $query->get();
        $weighted = $deals->sum(fn ($deal) => (float) $deal->amount * ((int) $deal->probability / 100));

        return [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'totals' => [
                'pipeline_value' => (float) $deals->where('status', 'open')->sum('amount'),
                'weighted_forecast' => round($weighted, 2),
                'committed_forecast' => (float) $deals->where('committed', true)->where('status', 'open')->sum('amount'),
                'best_case_forecast' => (float) $deals->where('status', 'open')->filter(fn ($deal) => (int) $deal->probability >= 70)->sum('amount'),
                'won_revenue' => (float) $deals->where('status', 'won')->sum('amount'),
            ],
            'by_stage' => $deals->groupBy(fn ($deal) => $deal->dealStage?->name ?: 'Unassigned')->map(fn ($items, $stage) => [
                'stage' => $stage,
                'value' => (float) $items->sum('amount'),
                'weighted' => round($items->sum(fn ($deal) => (float) $deal->amount * ((int) $deal->probability / 100)), 2),
                'count' => $items->count(),
            ])->values(),
            'by_owner' => $deals->groupBy(fn ($deal) => $deal->assignedTo?->name ?: 'Unassigned')->map(fn ($items, $owner) => [
                'owner' => $owner,
                'pipeline' => (float) $items->where('status', 'open')->sum('amount'),
                'weighted' => round($items->sum(fn ($deal) => (float) $deal->amount * ((int) $deal->probability / 100)), 2),
                'won' => (float) $items->where('status', 'won')->sum('amount'),
            ])->values(),
            'deals' => $deals,
        ];
    }

    public function winLossAnalytics(array $filters = []): array
    {
        $closed = Deal::query()->whereIn('status', ['won', 'lost'])->get();
        $won = $closed->where('status', 'won')->count();
        $lost = $closed->where('status', 'lost')->count();
        $total = max($closed->count(), 1);

        return [
            'win_rate' => round(($won / $total) * 100, 1),
            'loss_rate' => round(($lost / $total) * 100, 1),
            'lost_reasons' => $closed->where('status', 'lost')->groupBy(fn ($deal) => $deal->lost_reason ?: 'Unspecified')->map(fn ($items, $reason) => ['reason' => $reason, 'count' => $items->count()])->values(),
            'average_sales_cycle_days' => round($closed->filter(fn ($deal) => $deal->closed_date)->avg(fn ($deal) => Carbon::parse($deal->created_at)->diffInDays(Carbon::parse($deal->closed_date))) ?? 0, 1),
            'source_conversion' => $closed->groupBy(fn ($deal) => $deal->source ?: 'Unspecified')->map(fn ($items, $source) => [
                'source' => $source,
                'won' => $items->where('status', 'won')->count(),
                'lost' => $items->where('status', 'lost')->count(),
            ])->values(),
        ];
    }

    public function sourceRoi(): Collection
    {
        return DB::table('crm_attributions')
            ->leftJoin('crm_campaigns', 'crm_attributions.campaign_id', '=', 'crm_campaigns.id')
            ->selectRaw('COALESCE(crm_campaigns.name, crm_attributions.source, ?) as source, COUNT(DISTINCT lead_id) as leads, COUNT(DISTINCT deal_id) as deals, COALESCE(SUM(revenue), 0) as revenue, COALESCE(SUM(cost), 0) as cost', ['Unspecified'])
            ->groupBy('crm_campaigns.name', 'crm_attributions.source')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($row) {
                $cost = (float) $row->cost;
                $row->roi = $cost > 0 ? round((((float) $row->revenue - $cost) / $cost) * 100, 1) : null;
                $row->cost_per_lead = $row->leads > 0 ? round($cost / $row->leads, 2) : null;
                return $row;
            });
    }

    private function countBy(Builder $query, string $column, string $fallback): Collection
    {
        return $query->selectRaw("COALESCE({$column}, ?) as name, COUNT(*) as count", [$fallback])
            ->groupBy($column)
            ->orderByDesc('count')
            ->get();
    }

    private function forecastByMonth(): Collection
    {
        return Deal::query()
            ->whereNotNull('expected_close_date')
            ->where('expected_close_date', '>=', now()->startOfMonth()->subMonths(2))
            ->selectRaw("DATE_FORMAT(expected_close_date, '%Y-%m') as month, COALESCE(SUM(amount * probability / 100), 0) as weighted, COALESCE(SUM(amount), 0) as pipeline")
            ->groupBy('month')
            ->orderBy('month')
            ->get();
    }

    private function winLossTrend(): Collection
    {
        return Deal::query()
            ->whereIn('status', ['won', 'lost'])
            ->whereNotNull('closed_date')
            ->selectRaw("DATE_FORMAT(closed_date, '%Y-%m') as month, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost")
            ->groupBy('month')
            ->orderBy('month')
            ->limit(12)
            ->get();
    }

    private function periodBounds(string $period): array
    {
        return match ($period) {
            'next_month' => [now()->addMonthNoOverflow()->startOfMonth(), now()->addMonthNoOverflow()->endOfMonth()],
            'this_quarter' => [now()->startOfQuarter(), now()->endOfQuarter()],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }

    private function healthFor(CrmAccount $account, float $overdueAmount, int $openInvoices, mixed $lastInteraction): array
    {
        $score = 80;
        $reasons = [];

        if ($overdueAmount > 0) {
            $score -= 25;
            $reasons[] = 'Overdue receivables';
        }

        if ($openInvoices > 3) {
            $score -= 10;
            $reasons[] = 'Multiple open invoices';
        }

        if (!$lastInteraction || Carbon::parse($lastInteraction)->lt(now()->subDays(30))) {
            $score -= 20;
            $reasons[] = 'No recent interaction';
        }

        $score = max(0, min(100, $score));
        $status = $score >= 75 ? 'healthy' : ($score >= 55 ? 'neutral' : ($score >= 35 ? 'at_risk' : 'churn_risk'));

        return [
            'score' => $score,
            'status' => $status,
            'reason' => $reasons ? implode(', ', $reasons) : 'Relationship is on track',
        ];
    }

    private function nextBestAction(CrmAccount $account, array $health, ?CrmActivity $nextFollowUp, float $overdueAmount): array
    {
        if ($overdueAmount > 0) {
            return ['type' => 'collection_follow_up', 'title' => 'Follow up on overdue receivables', 'priority' => 'high'];
        }

        if ($nextFollowUp) {
            return ['type' => 'activity', 'title' => $nextFollowUp->subject, 'priority' => $nextFollowUp->priority];
        }

        if (in_array($health['status'], ['at_risk', 'churn_risk'], true)) {
            return ['type' => 'relationship_check', 'title' => 'Schedule a relationship check-in', 'priority' => 'high'];
        }

        return ['type' => 'follow_up', 'title' => 'Log the next follow-up', 'priority' => 'medium'];
    }
}
