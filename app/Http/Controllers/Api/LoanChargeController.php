<?php

namespace App\Http\Controllers\Api;

use App\Models\LoanCharge;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LoanChargeController extends BaseCrudApiController
{
    protected string $modelClass = LoanCharge::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'loanAccount',
        'chargesPaidFromAccount',
    ];

    protected array $relationDetails = [
        'loanAccount' => 'loan_account_id',
        'chargesPaidFromAccount' => 'charges_paid_from_account_id',
    ];

    protected array $searchable = [
        'charge_name',
        'reference',
        'notes',
        'loanAccount.name',
        'chargesPaidFromAccount.name',
        'chargesPaidFromAccount.code',
    ];

    protected array $filterable = [
        'loan_account_id',
        'charges_paid_from_account_id',
    ];

    protected array $booleanFilters = ['active', 'approved', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'charge_date' => ['from' => 'date_from', 'to' => 'date_to'],
    ];

    protected array $sortable = [
        'id',
        'charge_name',
        'charge_date',
        'amount',
        'reference',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-charge_date';

    protected array $storeRules = [
        'loan_account_id' => ['required', 'uuid', 'exists:loan_accounts,id'],
        'charge_name' => ['required', 'string', 'max:150'],
        'charge_date' => ['required', 'date'],
        'amount' => ['required', 'numeric', 'min:0.01'],
        'charges_paid_from_account_id' => ['required', 'uuid', 'exists:accounts,id'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'approved' => ['nullable', 'boolean'],
        'approved_at' => ['nullable', 'date'],
        'approved_by_id' => ['nullable', 'integer', 'exists:users,id'],
        'status' => ['nullable', 'string', 'max:40'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules($request));
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (array_key_exists('approved', $parentData)) {
            if ($parentData['approved']) {
                $parentData['approved_at'] = $parentData['approved_at'] ?? now();
                $parentData['approved_by_id'] = $parentData['approved_by_id'] ?? request()->user()?->getAuthIdentifier();
            } else {
                $parentData['approved_at'] = null;
                $parentData['approved_by_id'] = null;
            }
        }

        return $parentData;
    }
}
