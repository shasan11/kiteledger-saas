<?php

namespace App\Http\Controllers\Api;

use App\Models\Contact;
use App\Models\ChartOfAccount;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ContactController extends BaseCrudApiController
{
    protected string $modelClass = Contact::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'contactGroup',
        'account',
        'crmAccount',
        'creditTerm',
    ];

    protected array $relationDetails = [
        'contactGroup' => 'contact_group_id',
        'account' => 'account_id',
        'crmAccount' => 'crm_account_id',
        'creditTerm' => 'credit_term_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'phone',
        'email',
        'pan',
        'contactGroup.name',
        'account.name',
        'account.code',
        'crmAccount.name',
        'creditTerm.name',
    ];

    protected array $filterable = [
        'contact_group_id',
        'account_id',
        'crm_account_id',
        'contact_type',
        'credit_term_id',
    ];

    protected array $booleanFilters = [
        'active',
        'accept_purchase',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'contact_type',
        'credit_limit',
        'branch_id',
        'contact_group_id',
        'credit_term_id',
        'active',
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

        $userId = $user->getAuthIdentifier();

        return $query->where(function (Builder $query) use ($userId) {
            $query->whereHas('leads', fn (Builder $leadQuery) => $leadQuery->where('assigned_to_id', $userId))
                ->orWhereHas('deals', fn (Builder $dealQuery) => $dealQuery->where('assigned_to_id', $userId))
                ->orWhereHas('crmActivities', fn (Builder $activityQuery) => $activityQuery->where('assigned_to_id', $userId));
        });
    }

    private function userHasFullCrmAccess($user): bool
    {
        return method_exists($user, 'can') && (
            $user->can('crm.manage') ||
            $user->can('crm.*')
        );
    }

    protected array $storeRules = [
        'contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'crm_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
        'contact_type' => ['required', 'in:customer,supplier,lead'],
        'name' => ['required', 'string', 'max:180'],
        'code' => ['nullable', 'string', 'max:50'],
        'address' => ['nullable', 'string'],
        'pan' => ['nullable', 'string', 'max:80'],
        'tax_registration_no' => ['nullable', 'string', 'max:80'],
        'tax_registration_type' => ['nullable', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id,none'],
        'phone' => ['nullable', 'string', 'max:40'],
        'accept_purchase' => ['nullable', 'boolean'],
        'email' => ['nullable', 'email', 'max:120'],
        'credit_term_id' => ['nullable', 'uuid', 'exists:credit_terms,id'],
        'credit_limit' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'contact_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'crm_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_accounts,id'],
            'contact_type' => ['sometimes', 'required', 'in:customer,supplier,lead'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string'],
            'pan' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_registration_no' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_registration_type' => ['sometimes', 'nullable', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id,none'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'accept_purchase' => ['sometimes', 'nullable', 'boolean'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'credit_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        return $parentData;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['recent_transactions'] = [];

        if (!$record->account_id) {
            return $data;
        }

        $chartAccountIds = ChartOfAccount::query()
            ->where('account_id', $record->account_id)
            ->pluck('id');

        if ($chartAccountIds->isEmpty()) {
            return $data;
        }

        $lines = JournalVoucherLine::query()
            ->with(['journalVoucher.branch'])
            ->whereIn('chart_of_account_id', $chartAccountIds)
            ->whereHas('journalVoucher')
            ->latest('created_at')
            ->limit(25)
            ->get();

        $data['recent_transactions'] = $lines->map(function (JournalVoucherLine $line) {
            $voucher = $line->journalVoucher;
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;

            return [
                'id' => $line->getKey(),
                'journal_voucher_id' => $voucher?->getKey(),
                'voucher_no' => $voucher?->voucher_no,
                'voucher_date' => optional($voucher?->voucher_date)->toDateString(),
                'description' => $line->description ?: $voucher?->narration,
                'debit' => $debit,
                'credit' => $credit,
                'net_movement' => round($debit - $credit, 2),
                'status' => $voucher?->status,
                'approved' => (bool) ($voucher?->approved ?? false),
                'approval_status' => ($voucher?->approved ?? false) ? 'Approved' : 'Not Approved',
                'source_type' => $voucher?->source_type,
                'source_id' => $voucher?->source_id,
                'source_no' => $voucher?->source_no,
                'source_module' => $voucher?->source_module,
                'branch' => $this->serializeRelated($voucher?->branch),
            ];
        })->values()->all();

        return $data;
    }
}
