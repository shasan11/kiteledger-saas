<?php

namespace App\Http\Controllers\Api;

use App\Models\DocumentNumbering;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DocumentNumberingController extends BaseCrudApiController
{
    protected string $modelClass = DocumentNumbering::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['document_type', 'prefix'];

    protected array $filterable = ['document_type', 'type_of_account'];

    protected array $booleanFilters = [
        'active',
        'reset_every_fiscal_year',
        'add_fiscal_year_in_code',
        'enable_fiscal_year_next_number',
        'is_system_generated',
    ];

    protected array $sortable = ['id', 'document_type', 'next_number', 'created_at', 'updated_at'];

    protected string $defaultSort = 'document_type';

    protected array $storeRules = [
        'document_type' => [
            'required',
            'string',
            'in:cash_transfer,credit_note,debit_note,expense,inventory_adjustment,invoice,journal_voucher,payment,production_journal,production_order,purchase_bill,purchase_order,quotation,receipt,sales_order,sales_return,warehouse_transfer,payroll,deduction,increment,contact,lead,deal,product,bank_account,capital,cash,current_asset,current_liability,direct_expense,direct_income,indirect_expense,indirect_income,non_current_asset,non_current_liability,reserve_surplus,loan_account,loan_topup,loan_charge',
        ],
        'prefix' => ['nullable', 'string', 'max:20'],
        'next_number' => ['nullable', 'integer', 'min:1'],
        'type_of_account' => ['nullable', 'in:auto_numbering,manual_numbering'],
        'reset_every_fiscal_year' => ['nullable', 'boolean'],
        'add_fiscal_year_in_code' => ['nullable', 'boolean'],
        'enable_fiscal_year_next_number' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'document_type' => [
                'sometimes',
                'required',
                'string',
                'in:cash_transfer,credit_note,debit_note,expense,inventory_adjustment,invoice,journal_voucher,payment,production_journal,production_order,purchase_bill,purchase_order,quotation,receipt,sales_order,sales_return,warehouse_transfer,payroll,deduction,increment,contact,lead,deal,product,bank_account,capital,cash,current_asset,current_liability,direct_expense,direct_income,indirect_expense,indirect_income,non_current_asset,non_current_liability,reserve_surplus,loan_account,loan_topup,loan_charge',
            ],
            'prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'next_number' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'type_of_account' => ['sometimes', 'nullable', 'in:auto_numbering,manual_numbering'],
            'reset_every_fiscal_year' => ['sometimes', 'nullable', 'boolean'],
            'add_fiscal_year_in_code' => ['sometimes', 'nullable', 'boolean'],
            'enable_fiscal_year_next_number' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
