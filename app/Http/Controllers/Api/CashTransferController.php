<?php

namespace App\Http\Controllers\Api;

use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashTransferController extends BaseCrudApiController
{
    protected string $modelClass = CashTransfer::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'fromAccount',
        'currency',
        'cashTransferLines',
        'cashTransferLines.toAccount',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'fromAccount' => 'from_account_id',
        'currency' => 'currency_id',
    ];

    protected array $searchable = [
        'transfer_no',
        'reference',
        'notes',
        'status',
        'fromAccount.name',
        'fromAccount.code',
        'currency.code',
        'currency.name',
        'branch.name',
        'branch.code',
    ];

    protected array $filterable = [
        'branch_id',
        'from_account_id',
        'currency_id',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'void',
    ];

    protected array $amountRangeFilters = ['total_amount' => ['min' => 'amount_min', 'max' => 'amount_max']];
    protected array $dateRangeFilters = [
        'transfer_date' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'transfer_no',
        'transfer_date',
        'from_account_id',
        'currency_id',
        'total_amount',
        'status',
        'active',
        'approved',
        'void',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'cashTransferLines',
            'model' => CashTransferLine::class,
            'foreign_key' => 'cash_transfer_id',
            'delete_key' => 'deleted_item_ids',

            'required' => true,
            'min' => 1,

            'replace_on_update' => false,

            'parent_total_field' => 'total_amount',
            'child_total_field' => 'amount',

            'relations' => [
                'toAccount',
            ],

            'relation_details' => [
                'toAccount' => 'to_account_id',
            ],

            'rules' => [
                'to_account_id' => [
                    'required',
                    'uuid',
                    'exists:accounts,id',
                ],

                'exchange_rate_to_default' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],

                'amount' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],

                'description' => [
                    'nullable',
                    'string',
                    'max:200',
                ],
            ],

            'update_rules' => [
                'to_account_id' => [
                    'required',
                    'uuid',
                    'exists:accounts,id',
                ],

                'exchange_rate_to_default' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],

                'amount' => [
                    'required',
                    'numeric',
                    'min:0.01',
                ],

                'description' => [
                    'nullable',
                    'string',
                    'max:200',
                ],
            ],
        ],
    ];

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => [
                'nullable',
                'uuid',
                'exists:branches,id',
            ],

            'transfer_no' => [
                'nullable',
                'string',
                'max:40',
                'unique:cash_transfers,transfer_no',
            ],

            'transfer_date' => [
                'required',
                'date',
            ],

            'from_account_id' => [
                'required',
                'uuid',
                'exists:accounts,id',
            ],

            'reference' => [
                'nullable',
                'string',
                'max:120',
            ],

            'currency_id' => [
                'required',
                'uuid',
                'exists:currencies,id',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'draft',
                    'posted',
                    'cancelled',
                ]),
            ],

            'active' => [
                'nullable',
                'boolean',
            ],

            'approved' => [
                'nullable',
                'boolean',
            ],

            'approved_at' => [
                'nullable',
                'date',
            ],

            'approved_by_id' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'void' => [
                'nullable',
                'boolean',
            ],

            'voided_by_id' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'voided_reason' => [
                'nullable',
                'string',
            ],

            'voided_at' => [
                'nullable',
                'date',
            ],

            'exchange_rate' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'total_amount' => [
                'exclude',
            ],

            'user_add_id' => [
                'exclude',
            ],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:branches,id',
            ],

            'transfer_no' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('cash_transfers', 'transfer_no')->ignore($record->getKey()),
            ],

            'transfer_date' => [
                'sometimes',
                'required',
                'date',
            ],

            'from_account_id' => [
                'sometimes',
                'required',
                'uuid',
                'exists:accounts,id',
            ],

            'reference' => [
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],

            'currency_id' => [
                'sometimes',
                'required',
                'uuid',
                'exists:currencies,id',
            ],

            'notes' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'status' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'draft',
                    'posted',
                    'cancelled',
                ]),
            ],

            'active' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'approved' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'approved_at' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'approved_by_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'void' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'voided_by_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'voided_reason' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'voided_at' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'exchange_rate' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'total_amount' => [
                'exclude',
            ],

            'user_add_id' => [
                'exclude',
            ],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        if (empty($parentData['transfer_no'])) {
            $parentData['transfer_no'] = $this->generateTransferNo();
        }

        $parentData['status'] = $parentData['status'] ?? 'draft';
        $parentData['active'] = $parentData['active'] ?? true;
        $parentData['approved'] = $parentData['approved'] ?? false;
        $parentData['void'] = $parentData['void'] ?? false;
        $parentData['exchange_rate'] = $parentData['exchange_rate'] ?? 1;

        $totalAmount = collect($nestedData['items'] ?? [])
            ->sum(fn ($item) => (float) ($item['amount'] ?? 0));

        $parentData['total_amount'] = $totalAmount;
        $parentData['user_add_id'] = request()->user()?->getAuthIdentifier();

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        unset(
            $parentData['total_amount'],
            $parentData['user_add_id']
        );

        if (isset($parentData['approved']) && $parentData['approved']) {
            $parentData['approved_at'] = $parentData['approved_at'] ?? now();
            $parentData['approved_by_id'] = $parentData['approved_by_id']
                ?? request()->user()?->getAuthIdentifier();
        }

        if (isset($parentData['void']) && $parentData['void']) {
            $parentData['voided_at'] = $parentData['voided_at'] ?? now();
            $parentData['voided_by_id'] = $parentData['voided_by_id']
                ?? request()->user()?->getAuthIdentifier();
        }

        return $parentData;
    }

    protected function mutateNestedRowBeforeSave(
        array $row,
        Model $parent,
        array $config,
        bool $isUpdate
    ): array {
        $row['exchange_rate_to_default'] = $row['exchange_rate_to_default'] ?? 1;

        return $row;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['items'] = $data['items'] ?? $data['cash_transfer_lines'] ?? [];
        $data['approval_status'] = ($record->approved ?? false) ? 'Approved' : 'Not Approved';

        return $data;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        $totalAmount = $record->cashTransferLines()->sum('amount');

        $record->forceFill([
            'total_amount' => $totalAmount,
        ])->saveQuietly();

        return $record->fresh([
            'branch',
            'fromAccount',
            'currency',
            'cashTransferLines',
            'cashTransferLines.toAccount',
        ]);
    }

    protected function generateTransferNo(): string
    {
        $prefix = 'CT-';

        $numbers = CashTransfer::query()
            ->where('transfer_no', 'like', $prefix . '%')
            ->pluck('transfer_no')
            ->map(function ($transferNo) use ($prefix) {
                $number = str_replace($prefix, '', (string) $transferNo);

                return is_numeric($number) ? (int) $number : 0;
            });

        $nextNumber = ((int) $numbers->max()) + 1;

        do {
            $transferNo = $prefix . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
            $nextNumber++;
        } while (
            CashTransfer::query()
                ->where('transfer_no', $transferNo)
                ->exists()
        );

        return $transferNo;
    }
}
