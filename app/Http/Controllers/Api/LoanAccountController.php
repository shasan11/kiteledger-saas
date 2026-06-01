<?php

namespace App\Http\Controllers\Api;

use App\Domain\Accounting\Services\LoanAccountService;
use App\Models\LoanAccount;
use App\Models\LoanCharge;
use App\Models\LoanPayback;
use App\Models\LoanTopUp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
        'userAdd',
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
        'remarks' => ['nullable', 'string'],
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
            'remarks' => ['sometimes', 'nullable', 'string'],
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

    // -----------------------------------------------------------------------
    // Principal Payback
    // -----------------------------------------------------------------------

    /**
     * List all paybacks for a given loan account.
     */
    public function paybacks(LoanAccount $loanAccount)
    {
        $paybacks = LoanPayback::query()
            ->where('loan_account_id', $loanAccount->id)
            ->with(['paidFromAccount', 'journalVoucher', 'userAdd'])
            ->orderByDesc('payback_date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LoanPayback $p) => [
                'id'                    => $p->id,
                'payback_date'          => $p->payback_date?->toDateString(),
                'amount'                => (float) $p->amount,
                'paid_from_account_id'  => $p->paid_from_account_id,
                'paid_from_account'     => $p->paidFromAccount ? [
                    'id'   => $p->paidFromAccount->id,
                    'code' => $p->paidFromAccount->code,
                    'name' => $p->paidFromAccount->name,
                ] : null,
                'reference'             => $p->reference,
                'notes'                 => $p->notes,
                'active'                => $p->active,
                'journal_voucher_id'    => $p->journal_voucher_id,
                'created_at'            => $p->created_at?->toDateTimeString(),
            ]);

        return response()->json([
            'data'  => $paybacks,
            'count' => $paybacks->count(),
        ]);
    }

    /**
     * Record a principal repayment.
     */
    public function storePayback(Request $request, LoanAccount $loanAccount)
    {
        $validated = $request->validate([
            'payback_date'         => ['required', 'date'],
            'amount'               => ['required', 'numeric', 'min:0.01'],
            'paid_from_account_id' => ['required', 'uuid', 'exists:accounts,id'],
            'reference'            => ['nullable', 'string', 'max:120'],
            'notes'                => ['nullable', 'string', 'max:1000'],
        ]);

        if ((float) ($loanAccount->current_balance ?? 0) <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'This loan account has no outstanding principal balance to repay.',
            ]);
        }

        $service  = app(LoanAccountService::class);
        $payback  = $service->recordPayback(
            $loanAccount,
            $validated,
            $request->user()?->getAuthIdentifier()
        );

        // Refresh the loan account so the response reflects the new balance
        $loanAccount->refresh();

        return response()->json([
            'message'      => 'Principal repayment recorded successfully.',
            'payback'      => $payback,
            'loan_account' => [
                'id'              => $loanAccount->id,
                'current_balance' => (float) $loanAccount->current_balance,
            ],
        ], 201);
    }

    /**
     * Void / deactivate a payback (soft delete).
     */
    public function destroyPayback(Request $request, LoanAccount $loanAccount, LoanPayback $payback)
    {
        if ((string) $payback->loan_account_id !== (string) $loanAccount->id) {
            abort(404);
        }

        $payback->forceFill(['active' => false])->save();

        // Recalculate balance without this payback
        app(LoanAccountService::class)->recalculateCurrentBalance(
            $loanAccount->fresh(['loanTopUps', 'loanPaybacks'])
        );

        return response()->json([
            'message' => 'Payback record voided.',
            'loan_account' => [
                'id'              => $loanAccount->id,
                'current_balance' => (float) $loanAccount->fresh()->current_balance,
            ],
        ]);
    }
}
