<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesAccountPayloads;
use App\Models\Expense;
use App\Models\ExpenseLine;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ExpenseController extends BaseCrudApiController
{
    use ResolvesAccountPayloads;

    protected string $modelClass = Expense::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;
    protected ?string $businessDateColumn = 'expense_date';

    protected array $relations = ['branch', 'contact', 'currency', 'tdsChargesAccount'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'currency' => 'currency_id', 'tdsChargesAccount' => 'tds_charges_account_id'];
    protected array $searchable = ['expense_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $amountRangeFilters = ['total' => ['min' => 'amount_min', 'max' => 'amount_max']];
    protected array $dateRangeFilters = ['expense_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'expense_no', 'expense_date', 'status', 'total', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'expenseLines',
            'model' => ExpenseLine::class,
            'foreign_key' => 'expense_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['account', 'taxRate'],
            'relation_details' => ['account' => 'account_id', 'taxRate' => 'tax_rate_id'],
            'rules' => [
                'account_id' => ['required_without:chart_of_account_id', 'uuid', 'exists:accounts,id'],
                'chart_of_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
                'description' => ['nullable', 'string', 'max:200'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'amount' => ['required', 'numeric', 'gt:0'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
            'update_rules' => [
                'account_id' => ['required_without:chart_of_account_id', 'uuid', 'exists:accounts,id'],
                'chart_of_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
                'description' => ['nullable', 'string', 'max:200'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'amount' => ['required', 'numeric', 'gt:0'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'expense_no' => ['nullable', 'string', 'max:40', 'unique:expenses,expense_no'],
        'reference' => ['nullable', 'string', 'max:120'],
        'expense_date' => ['required', 'date'],
        'due_date' => ['nullable', 'date'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'notes' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,posted,cancelled'],
        'tds_charges_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'tds_type' => ['nullable', 'string', 'max:20'],
        'tds_charges' => ['nullable', 'numeric', 'min:0'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'expense_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:expenses,expense_no,' . $record->id . ',id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'expense_date' => ['sometimes', 'required', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'tds_charges_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'tds_type' => ['sometimes', 'nullable', 'string', 'max:20'],
            'tds_charges' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $total = (float) $record->expenseLines()->sum('line_total');
        $record->forceFill(['total' => $total])->save();

        return $record;
    }

    protected function mutateNestedRowBeforeSave(
        array $row,
        Model $parent,
        array $config,
        bool $isUpdate
    ): array {
        $amount = (float) ($row['amount'] ?? 0);
        $row = $this->normalizeAccountPayload($row);
        $row['tax_amount'] = $this->calculateTaxAmount($row, $amount);
        $row['line_total'] = round($amount + (float) $row['tax_amount'], 2);

        return $row;
    }

    protected function calculateTaxAmount(array $row, float $amount): float
    {
        if (empty($row['tax_rate_id'])) {
            return (float) ($row['tax_amount'] ?? 0);
        }

        $taxRate = TaxRate::query()->find($row['tax_rate_id']);
        if (!$taxRate) {
            return (float) ($row['tax_amount'] ?? 0);
        }

        return round($amount * ((float) $taxRate->rate_percent / 100), 2);
    }
}
