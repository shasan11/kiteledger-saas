<?php

namespace App\Http\Controllers\Api;

use App\Models\Deal;
use App\Models\CrmDealStageHistory;
use App\Models\DealPipeline;
use App\Models\DealStage;
use App\Services\Crm\CrmPipelineResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DealController extends BaseCrudApiController
{
    protected string $modelClass = Deal::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'lead',
        'contact',
        'crmAccount',
        'dealPipeline',
        'dealStage',
        'assignedTo',
        'campaign',
        'stageHistories',
    ];

    protected array $relationDetails = [
        'lead' => 'lead_id',
        'contact' => 'contact_id',
        'crmAccount' => 'crm_account_id',
        'campaign' => 'campaign_id',
        'dealPipeline' => 'deal_pipeline_id',
        'dealStage' => 'deal_stage_id',
        'assignedTo' => 'assigned_to_id',
    ];

    protected array $searchable = [
        'deal_no',
        'title',
        'source',
        'lost_reason',
        'description',
    ];

    protected array $filterable = [
        'lead_id',
        'contact_id',
        'crm_account_id',
        'deal_pipeline_id',
        'deal_stage_id',
        'assigned_to_id',
        'campaign_id',
        'status',
        'priority',
        'source',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated', 'committed'];

    protected array $dateRangeFilters = [
        'expected_close_date' => ['from' => 'close_from', 'to' => 'close_to'],
        'closed_date' => ['from' => 'closed_from', 'to' => 'closed_to'],
    ];

    protected array $sortable = [
        'id',
        'deal_no',
        'title',
        'amount',
        'expected_close_date',
        'closed_date',
        'probability',
        'status',
        'priority',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected function baseQuery(): Builder
    {
        return $this->applyAssignedUserScope(parent::baseQuery());
    }

    protected function findRecord(mixed $id): Model
    {
        return $this->applyAssignedUserScope($this->newQuery())->findOrFail($id);
    }

    private function applyAssignedUserScope(Builder $query): Builder
    {
        $user = request()->user();

        if (!$user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        return $query->where('assigned_to_id', $user->getAuthIdentifier());
    }

    private function userHasFullCrmAccess($user): bool
    {
        return method_exists($user, 'can') && (
            $user->can('crm.manage') ||
            $user->can('crm.*')
        );
    }

    protected array $storeRules = [
        'deal_no' => ['nullable', 'string', 'max:40', 'unique:deals,deal_no'],
        'lead_id' => ['nullable', 'uuid', 'exists:leads,id'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'crm_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
        'campaign_id' => ['nullable', 'uuid', 'exists:crm_campaigns,id'],
        'deal_pipeline_id' => ['nullable', 'uuid', 'exists:deal_pipelines,id'],
        'deal_stage_id' => ['nullable', 'uuid', 'exists:deal_stages,id'],
        'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        'title' => ['required', 'string', 'max:180'],
        'amount' => ['nullable', 'numeric', 'min:0'],
        'expected_close_date' => ['nullable', 'date'],
        'closed_date' => ['nullable', 'date'],
        'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
        'committed' => ['nullable', 'boolean'],
        'source' => ['nullable', 'string', 'max:80'],
        'priority' => ['nullable', 'in:low,medium,high,urgent'],
        'status' => ['nullable', 'in:open,won,lost,cancelled'],
        'lost_reason' => ['nullable', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $resolver = new CrmPipelineResolver();
        $resolved = $resolver->resolvePipelineAndStage(
            $parentData['deal_pipeline_id'] ?? null,
            $parentData['deal_stage_id'] ?? null
        );
        if (empty($parentData['deal_pipeline_id'])) {
            $parentData['deal_pipeline_id'] = $resolved['pipeline_id'];
        }
        if (empty($parentData['deal_stage_id'])) {
            $parentData['deal_stage_id'] = $resolved['stage_id'];
        }
        return $parentData;
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'deal_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:deals,deal_no,' . $record->id . ',id'],
            'lead_id' => ['sometimes', 'nullable', 'uuid', 'exists:leads,id'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'crm_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_accounts,id'],
            'campaign_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_campaigns,id'],
            'deal_pipeline_id' => ['sometimes', 'nullable', 'uuid', 'exists:deal_pipelines,id'],
            'deal_stage_id' => ['sometimes', 'nullable', 'uuid', 'exists:deal_stages,id'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['sometimes', 'nullable', 'date'],
            'closed_date' => ['sometimes', 'nullable', 'date'],
            'probability' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'committed' => ['sometimes', 'nullable', 'boolean'],
            'source' => ['sometimes', 'nullable', 'string', 'max:80'],
            'priority' => ['sometimes', 'nullable', 'in:low,medium,high,urgent'],
            'status' => ['sometimes', 'nullable', 'in:open,won,lost,cancelled'],
            'lost_reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        if ($isUpdate && array_key_exists('deal_stage_id', $parentData) && $record->wasChanged('deal_stage_id')) {
            $fromStageId = $record->getOriginal('deal_stage_id');
            $lastChange = CrmDealStageHistory::query()
                ->where('deal_id', $record->getKey())
                ->latest('changed_at')
                ->first();

            $enteredAt = $lastChange?->changed_at ?? $record->created_at;

            CrmDealStageHistory::query()->create([
                'deal_id' => $record->getKey(),
                'from_stage_id' => $fromStageId,
                'to_stage_id' => $record->deal_stage_id,
                'event_type' => 'stage_change',
                'to_status' => in_array($record->status, ['won', 'lost'], true) ? $record->status : null,
                'changed_by' => request()->user()?->id,
                'changed_at' => now(),
                'days_in_previous_stage' => $enteredAt ? $enteredAt->diffInDays(now()) : null,
                'remarks' => request()->input('stage_change_remarks'),
            ]);
        }

        if (($parentData['status'] ?? null) === 'won' && !$record->closed_date) {
            $record->forceFill(['closed_date' => now()->toDateString()])->save();
        }

        return $record;
    }

    public function moveStage(Request $request, string $id)
    {
        $deal = $this->applyAssignedUserScope(Deal::query())
            ->with(['dealPipeline', 'dealStage'])
            ->findOrFail($id);

        $data = $request->validate([
            'deal_stage_id' => ['required', 'uuid', 'exists:deal_stages,id'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $newStage = DealStage::query()
            ->where('active', true)
            ->findOrFail($data['deal_stage_id']);

        if ($deal->deal_pipeline_id && $newStage->deal_pipeline_id !== $deal->deal_pipeline_id) {
            abort(422, 'The selected stage does not belong to this deal pipeline.');
        }

        $fromStageId = $deal->deal_stage_id;
        $lastChange = CrmDealStageHistory::query()
            ->where('deal_id', $deal->id)
            ->latest('changed_at')
            ->first();
        $enteredAt = $lastChange?->changed_at ?? $deal->created_at;

        DB::transaction(function () use ($deal, $newStage, $fromStageId, $enteredAt, $data, $request) {
            $updates = [
                'deal_stage_id' => $newStage->id,
                'deal_pipeline_id' => $newStage->deal_pipeline_id ?? $deal->deal_pipeline_id,
            ];

            if ($newStage->is_won_stage) {
                $updates['status'] = 'won';
                $updates['closed_date'] = now()->toDateString();
            } elseif ($newStage->is_lost_stage) {
                $updates['status'] = 'lost';
                $updates['closed_date'] = now()->toDateString();
                $updates['lost_reason'] = $data['lost_reason'] ?? null;
            } else {
                if (in_array($deal->status, ['won', 'lost'])) {
                    $updates['status'] = 'open';
                    $updates['closed_date'] = null;
                }
            }

            if ($newStage->probability !== null) {
                $updates['probability'] = $newStage->probability;
            }

            $deal->update($updates);

            if ($fromStageId !== $newStage->id) {
                CrmDealStageHistory::query()->create([
                    'deal_id' => $deal->id,
                    'from_stage_id' => $fromStageId,
                    'to_stage_id' => $newStage->id,
                    'event_type' => 'stage_change',
                    'to_status' => $newStage->is_won_stage
                        ? 'won'
                        : ($newStage->is_lost_stage ? 'lost' : null),
                    'changed_by' => $request->user()?->id,
                    'changed_at' => now(),
                    'days_in_previous_stage' => $enteredAt ? $enteredAt->diffInDays(now()) : null,
                    'remarks' => $data['remarks'] ?? ($newStage->is_lost_stage ? ($data['lost_reason'] ?? null) : null),
                ]);
            }
        });

        return response()->json($deal->fresh(['dealPipeline', 'dealStage', 'assignedTo', 'lead', 'contact', 'stageHistories']));
    }
}
