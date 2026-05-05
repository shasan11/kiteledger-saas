<?php

namespace App\Http\Controllers\Api;

use App\Models\LoanTopUp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LoanTopUpController extends BaseCrudApiController
{
    protected string $modelClass = LoanTopUp::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'loanAccount',
        'loanReceivedInAccount',
    ];

    protected array $relationDetails = [
        'loanAccount' => 'loan_account_id',
        'loanReceivedInAccount' => 'loan_received_in_account_id',
    ];

    protected array $searchable = [
        'reference',
        'notes',
        'loanAccount.name',
        'loanReceivedInAccount.name',
        'loanReceivedInAccount.code',
    ];

    protected array $filterable = [
        'loan_account_id',
        'loan_received_in_account_id',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'topup_date' => ['from' => 'date_from', 'to' => 'date_to'],
    ];

    protected array $sortable = [
        'id',
        'topup_date',
        'amount',
        'reference',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-topup_date';

    protected array $storeRules = [
        'loan_account_id' => ['required', 'uuid', 'exists:loan_accounts,id'],
        'topup_date' => ['required', 'date'],
        'loan_received_in_account_id' => ['required', 'uuid', 'exists:accounts,id'],
        'amount' => ['required', 'numeric', 'min:0.01'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules($request));
    }
}
