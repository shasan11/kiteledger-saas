<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmCampaign;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\PurchaseBill;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmCampaignController extends BaseCrudApiController
{
    protected string $modelClass = CrmCampaign::class;

    protected ?string $permissionPrefix = 'crm.campaign';
    protected bool $usePolicyAuthorization = false;

    protected array $searchable = ['name', 'code', 'source', 'medium'];

    protected array $filterable = ['branch_id', 'source', 'medium', 'status'];

    protected array $booleanFilters = ['active'];

    protected array $sortable = ['id', 'name', 'code', 'budget', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected array $relations = [
        'branch',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')],
            'source' => ['nullable', 'string', 'max:80'],
            'medium' => ['nullable', 'string', 'max:80'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:draft,active,paused,completed,cancelled'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules($request));
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')->ignore($record->getKey())];

        return $rules;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $campaignId = $record->getKey();

        $leadsCount = Lead::query()->where('campaign_id', $campaignId)->count();
        $dealsCount = Deal::query()->where('campaign_id', $campaignId)->count();
        $wonDeals = Deal::query()->where('campaign_id', $campaignId)->where('status', 'won')->get();
        $wonDealsCount = $wonDeals->count();
        $revenue = $wonDeals->sum(fn ($d) => (float) ($d->amount ?? 0));

        $cost = PurchaseBill::query()
            ->where('campaign_id', $campaignId)
            ->whereNotIn('status', ['cancelled', 'void'])
            ->sum('total');
        $actualCost = round((float) $cost, 2);

        $roi = $actualCost > 0 ? round(($revenue - $actualCost) / $actualCost * 100, 2) : null;
        $conversionRate = $leadsCount > 0 ? round($wonDealsCount / $leadsCount * 100, 2) : null;
        $costPerLead = $leadsCount > 0 ? round($actualCost / $leadsCount, 2) : null;

        $data['stats'] = [
            'leads_count' => $leadsCount,
            'deals_count' => $dealsCount,
            'won_deals_count' => $wonDealsCount,
            'revenue' => round($revenue, 2),
            'actual_cost' => $actualCost,
            'roi' => $roi,
            'conversion_rate' => $conversionRate,
            'cost_per_lead' => $costPerLead,
        ];

        return $data;
    }

    public function summary(Request $request): JsonResponse
    {
        $query = CrmCampaign::query();
        $this->applyBranchScope($query, $request);

        $campaigns = $query->get();
        $campaignIds = $campaigns->pluck('id');

        $totalBudget = $campaigns->sum(fn ($c) => (float) ($c->budget ?? 0));

        $totalCost = PurchaseBill::query()
            ->whereIn('campaign_id', $campaignIds)
            ->whereNotIn('status', ['cancelled', 'void'])
            ->sum('total');

        $leadsCount = Lead::query()->whereIn('campaign_id', $campaignIds)->count();
        $dealsCount = Deal::query()->whereIn('campaign_id', $campaignIds)->count();
        $wonDeals = Deal::query()->whereIn('campaign_id', $campaignIds)->where('status', 'won')->get();
        $revenue = $wonDeals->sum(fn ($d) => (float) ($d->amount ?? 0));
        $cost = round((float) $totalCost, 2);
        $roi = $cost > 0 ? round(($revenue - $cost) / $cost * 100, 2) : null;

        return response()->json([
            'total_budget' => round($totalBudget, 2),
            'total_cost' => $cost,
            'leads_count' => $leadsCount,
            'deals_count' => $dealsCount,
            'won_deals_count' => $wonDeals->count(),
            'revenue' => round($revenue, 2),
            'roi' => $roi,
        ]);
    }
}
