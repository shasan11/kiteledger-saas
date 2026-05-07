<?php

namespace App\Http\Controllers\Api;

use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class JournalVoucherController extends BaseCrudApiController
{
    protected string $modelClass = JournalVoucher::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'currency',
        'items',
        'items.chartOfAccount',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'currency' => 'currency_id',
    ];

    protected array $searchable = [
        'voucher_no',
        'reference',
        'narration',
        'status',
        'branch.name',
        'branch.code',
        'currency.name',
        'currency.code',
    ];

    protected array $filterable = [
        'branch_id',
        'currency_id',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'void',
    ];

    protected array $dateRangeFilters = [
        'voucher_date' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'voucher_no',
        'voucher_date',
        'currency_id',
        'status',
        'active',
        'approved',
        'void',
        'exchange_rate',
        'total',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'items',
            'model' => JournalVoucherLine::class,
            'foreign_key' => 'journal_voucher_id',
            'delete_key' => 'deleted_item_ids',

            /*
             * Journal voucher needs at least 2 lines:
             * one debit and one credit.
             */
            'required' => true,
            'min' => 2,

            /*
             * This makes update work like a full nested save.
             * Existing rows not sent again will be deleted.
             * Easier for ReusableCrud/objectArray.
             */
            'replace_on_update' => true,

            /*
             * Parent total = total debit amount.
             */
            'parent_total_field' => 'total',
            'child_total_field' => 'debit',

            'relations' => [
                'chartOfAccount',
            ],

            'relation_details' => [
                'chartOfAccount' => 'chart_of_account_id',
            ],

            'rules' => [
                'chart_of_account_id' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
                'description' => ['nullable', 'string', 'max:200'],
                'debit' => ['nullable', 'numeric', 'min:0'],
                'credit' => ['nullable', 'numeric', 'min:0'],
            ],

            'update_rules' => [
                'chart_of_account_id' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
                'description' => ['nullable', 'string', 'max:200'],
                'debit' => ['nullable', 'numeric', 'min:0'],
                'credit' => ['nullable', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],

        'voucher_no' => ['nullable', 'string', 'max:40', 'unique:journal_vouchers,voucher_no'],
        'voucher_date' => ['required', 'date'],

        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'min:0'],

        'reference' => ['nullable', 'string', 'max:120'],
        'narration' => ['nullable', 'string'],

        'status' => ['nullable', 'in:draft,posted,cancelled'],
        'active' => ['nullable', 'boolean'],

        'approved' => ['nullable', 'boolean'],
        'approved_at' => ['nullable', 'date'],
        'approved_by_id' => ['nullable', 'integer', 'exists:users,id'],

        'void' => ['nullable', 'boolean'],
        'voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
        'voided_reason' => ['nullable', 'string'],
        'voided_at' => ['nullable', 'date'],

        'total' => ['nullable', 'numeric', 'min:0'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],

            'voucher_no' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                'unique:journal_vouchers,voucher_no,' . $record->id . ',id',
            ],

            'voucher_date' => ['sometimes', 'required', 'date'],

            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'narration' => ['sometimes', 'nullable', 'string'],

            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'active' => ['sometimes', 'nullable', 'boolean'],

            'approved' => ['sometimes', 'nullable', 'boolean'],
            'approved_at' => ['sometimes', 'nullable', 'date'],
            'approved_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],

            'void' => ['sometimes', 'nullable', 'boolean'],
            'voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'voided_reason' => ['sometimes', 'nullable', 'string'],
            'voided_at' => ['sometimes', 'nullable', 'date'],

            'total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        $parentData['status'] = $parentData['status'] ?? 'draft';
        $parentData['active'] = $parentData['active'] ?? true;
        $parentData['approved'] = $parentData['approved'] ?? false;
        $parentData['void'] = $parentData['void'] ?? false;
        $parentData['exchange_rate'] = $parentData['exchange_rate'] ?? 1;

        $totals = $this->calculateLineTotals($nestedData['items'] ?? []);

        $this->assertBalancedVoucher($totals);

        $parentData['total'] = $totals['debit'];

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        if (array_key_exists('items', $nestedData)) {
            $totals = $this->calculateLineTotals($nestedData['items'] ?? []);

            $this->assertBalancedVoucher($totals);

            $parentData['total'] = $totals['debit'];
        }

        return $parentData;
    }

    protected function mutateNestedRowBeforeSave(
        array $row,
        Model $parent,
        array $config,
        bool $isUpdate
    ): array {
        $row['debit'] = $row['debit'] ?? 0;
        $row['credit'] = $row['credit'] ?? 0;

        $debit = (float) $row['debit'];
        $credit = (float) $row['credit'];

        if ($debit > 0 && $credit > 0) {
            abort(422, 'A journal voucher line cannot have both debit and credit.');
        }

        if ($debit <= 0 && $credit <= 0) {
            abort(422, 'Each journal voucher line must have either debit or credit.');
        }

        return $row;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        if (method_exists($record, 'items')) {
            $debitTotal = (float) $record->items()->sum('debit');
            $creditTotal = (float) $record->items()->sum('credit');

            if (round($debitTotal, 2) !== round($creditTotal, 2)) {
                abort(422, 'Journal voucher is not balanced. Debit and credit totals must be equal.');
            }

            $record->forceFill([
                'total' => $debitTotal,
            ])->save();
        }

        return $record;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $lines = collect($record->items ?? $record->journalVoucherLines ?? []);
        $debit = round((float) $lines->sum('debit'), 2);
        $credit = round((float) $lines->sum('credit'), 2);

        $data['items'] = $data['items'] ?? $data['journal_voucher_lines'] ?? [];
        $data['lines'] = $data['items'];
        $data['total_debit'] = $debit;
        $data['total_credit'] = $credit;
        $data['difference'] = round(abs($debit - $credit), 2);
        $data['approval_status'] = ($record->approved ?? false) ? 'Approved' : 'Not Approved';

        return $data;
    }

    protected function calculateLineTotals(array $items): array
    {
        $debit = 0;
        $credit = 0;

        foreach ($items as $item) {
            $debit += (float) ($item['debit'] ?? 0);
            $credit += (float) ($item['credit'] ?? 0);
        }

        return [
            'debit' => round($debit, 2),
            'credit' => round($credit, 2),
        ];
    }

    protected function assertBalancedVoucher(array $totals): void
    {
        if ($totals['debit'] <= 0 || $totals['credit'] <= 0) {
            abort(422, 'Journal voucher must have both debit and credit entries.');
        }

        if ($totals['debit'] !== $totals['credit']) {
            abort(422, 'Journal voucher is not balanced. Debit and credit totals must be equal.');
        }
    }
}
