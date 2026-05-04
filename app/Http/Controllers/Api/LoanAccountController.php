<?php

namespace App\Http\Controllers\Api;

use App\Models\LoanAccount;
use App\Models\LoanCharge;
use App\Models\LoanTopUp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LoanAccountController extends BaseCrudApiController
{
    protected string $modelClass = LoanAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'loanReceivedInAccount',
        'relatedAccount',
        'processingFeePaidFromAccount',
        'loanTopUps',
        'loanCharges',
    ];

    protected array $relationDetails = [
        'loanReceivedInAccount' => 'loan_received_in_account_id',
        'relatedAccount' => 'related_account_id',
        'processingFeePaidFromAccount' => 'processing_fee_paid_from_account_id',
    ];

    protected array $searchable = ['name', 'bank_name', 'loan_number', 'description'];

    protected array $filterable = [
        'loan_received_in_account_id',
        'related_account_id',
        'processing_fee_paid_from_account_id',
        'status',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'balance_as_of' => ['from' => 'balance_from', 'to' => 'balance_to'],
    ];

    protected array $sortable = [
        'id',
        'name',
        'bank_name',
        'loan_number',
        'opening_balance',
        'current_balance',
        'status',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'top_ups' => [
            'relation' => 'loanTopUps',
            'model' => LoanTopUp::class,
            'foreign_key' => 'loan_account_id',
            'delete_key' => 'deleted_top_up_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => ['loanReceivedInAccount'],
            'relation_details' => [
                'loanReceivedInAccount' => 'loan_received_in_account_id',
            ],
            'rules' => [
                'topup_date' => ['required', 'date'],
                'loan_received_in_account_id' => ['required', 'uuid', 'exists:accounts,id'],
                'amount' => ['required', 'numeric', 'min:0'],
                'reference' => ['nullable', 'string', 'max:120'],
                'notes' => ['nullable', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'topup_date' => ['required', 'date'],
                'loan_received_in_account_id' => ['required', 'uuid', 'exists:accounts,id'],
                'amount' => ['required', 'numeric', 'min:0'],
                'reference' => ['nullable', 'string', 'max:120'],
                'notes' => ['nullable', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
        'charges' => [
            'relation' => 'loanCharges',
            'model' => LoanCharge::class,
            'foreign_key' => 'loan_account_id',
            'delete_key' => 'deleted_charge_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => ['chargesPaidFromAccount'],
            'relation_details' => [
                'chargesPaidFromAccount' => 'charges_paid_from_account_id',
            ],
            'rules' => [
                'charge_name' => ['required', 'string', 'max:150'],
                'charge_date' => ['required', 'date'],
                'amount' => ['required', 'numeric', 'min:0'],
                'charges_paid_from_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'reference' => ['nullable', 'string', 'max:120'],
                'notes' => ['nullable', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'charge_name' => ['required', 'string', 'max:150'],
                'charge_date' => ['required', 'date'],
                'amount' => ['required', 'numeric', 'min:0'],
                'charges_paid_from_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'reference' => ['nullable', 'string', 'max:120'],
                'notes' => ['nullable', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:150'],
        'bank_name' => ['nullable', 'string', 'max:150'],
        'loan_number' => ['nullable', 'string', 'max:80'],
        'description' => ['nullable', 'string'],
        'opening_balance' => ['nullable', 'numeric', 'min:0'],
        'current_balance' => ['nullable', 'numeric', 'min:0'],
        'balance_as_of' => ['nullable', 'date'],
        'loan_received_in_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'related_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'interest_rate_per_annum' => ['nullable', 'numeric', 'min:0'],
        'duration_in_month' => ['nullable', 'integer', 'min:0'],
        'processing_fee' => ['nullable', 'numeric', 'min:0'],
        'processing_fee_paid_from_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'status' => ['nullable', 'in:active,closed,settled,cancelled'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'loan_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string'],
            'opening_balance' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'current_balance' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'balance_as_of' => ['sometimes', 'nullable', 'date'],
            'loan_received_in_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'related_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'interest_rate_per_annum' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'duration_in_month' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'processing_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'processing_fee_paid_from_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'status' => ['sometimes', 'nullable', 'in:active,closed,settled,cancelled'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
