<?php

namespace App\Services\Reports;

use App\Models\Branch;
use App\Models\FiscalYear;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportFilterService
{
    public function normalize(Request $request): array
    {
        $branchId = $request->query('branch_id');
        $currentBranchId = $this->currentBranchId($request);
        $canViewAllBranches = $this->canViewAllBranches($request);
        $today = Carbon::now();
        $fiscalYear = FiscalYear::query()->where('is_current', true)->first();
        $defaultFrom = $fiscalYear?->start_date?->toDateString() ?? $today->copy()->startOfMonth()->toDateString();
        $defaultTo = $fiscalYear
            ? min($today->toDateString(), $fiscalYear->end_date?->toDateString() ?? $today->toDateString())
            : $today->toDateString();

        if (!$canViewAllBranches || $branchId === null || $branchId === '') {
            $branchId = $currentBranchId;
        }

        if ($canViewAllBranches && in_array($branchId, ['all', '*'], true)) {
            $branchId = 'all';
        }

        return [
            'date_from' => $request->query('date_from', $defaultFrom),
            'date_to' => $request->query('date_to', $defaultTo),
            'as_of_date' => $request->query('as_of_date', $defaultTo),
            'ageing_as_of_date' => $request->query('ageing_as_of_date', $defaultTo),
            'branch_id' => $branchId,
            'currency_id' => $request->query('currency_id'),
            'status' => $request->query('status'),
            'approved' => $request->query('approved'),
            'contact_id' => $request->query('contact_id'),
            'supplier_id' => $request->query('supplier_id'),
            'customer_id' => $request->query('customer_id'),
            'product_id' => $request->query('product_id'),
            'category_id' => $request->query('category_id'),
            'warehouse_id' => $request->query('warehouse_id'),
            'account_id' => $request->query('account_id'),
            'chart_of_account_id' => $request->query('chart_of_account_id'),
            'department_id' => $request->query('department_id'),
            'designation_id' => $request->query('designation_id'),
            'employment_status_id' => $request->query('employment_status_id'),
            'user_id' => $request->query('user_id'),
            'employee_id' => $request->query('employee_id'),
            'group_by' => $request->query('group_by', 'day'),
            'period' => $request->query('period'),
            'ageing_bucket' => $request->query('ageing_bucket'),
            'include_zero_balance' => $request->boolean('include_zero_balance'),
            'include_zero_stock' => $request->boolean('include_zero_stock'),
            'include_inactive' => $request->boolean('include_inactive'),
            'include_opening' => $request->boolean('include_opening', true),
            'include_draft' => $request->boolean('include_draft'),
            'search' => $request->query('search'),
            'voucher_no' => $request->query('voucher_no'),
            'debit_credit' => $request->query('debit_credit'),
            'account_type' => $request->query('account_type'),
            'active' => $request->query('active'),
            'is_system_generated' => $request->query('is_system_generated'),
            'module' => $request->query('module'),
            'action' => $request->query('action'),
            'event' => $request->query('event'),
            'exception_type' => $request->query('exception_type'),
            'year' => $request->query('year', Carbon::parse($defaultTo)->year),
            'current_branch_id' => $currentBranchId,
            'can_view_all_branches' => $canViewAllBranches,
        ];
    }

    public function currentBranchId(Request $request): ?string
    {
        $user = $request->user();

        if (!empty($user?->current_branch_id)) {
            return (string) $user->current_branch_id;
        }

        if (!empty($user?->branch_id)) {
            return (string) $user->branch_id;
        }

        return Branch::query()->orderByDesc('is_head_office')->orderBy('name')->value('id');
    }

    public function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        try {
            return $user->can('branch.view_all');
        } catch (\Throwable) {
            return false;
        }
    }
}
