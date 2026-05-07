<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingConfiguration;
use App\Models\ApprovalWorkflow;
use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\DocumentNumbering;
use App\Models\EmailConfig;
use App\Models\EmailTemplate;
use App\Models\FiscalYear;
use App\Models\HrmConfiguration;
use App\Models\InventoryConfiguration;
use App\Models\PurchaseConfiguration;
use App\Models\Role;
use App\Models\SalesConfiguration;
use App\Models\TaxRate;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SettingsConfigurationController extends Controller
{
    private array $map = [
        'accounting' => AccountingConfiguration::class,
        'hrm' => HrmConfiguration::class,
        'inventory' => InventoryConfiguration::class,
        'sales' => SalesConfiguration::class,
        'purchase' => PurchaseConfiguration::class,
    ];

    public function dashboard()
    {
        return response()->json([
            'company' => AppSetting::query()->with(['defaultCurrency', 'fiscalYear'])->where('active', true)->oldest()->first(),
            'counts' => [
                'branches' => Branch::query()->count(),
                'currencies' => Currency::query()->count(),
                'fiscal_years' => FiscalYear::query()->count(),
                'tax_rates' => TaxRate::query()->count(),
                'document_numberings' => DocumentNumbering::query()->count(),
                'approval_workflows' => ApprovalWorkflow::query()->count(),
                'email_configs' => EmailConfig::query()->count(),
                'email_templates' => EmailTemplate::query()->count(),
                'roles' => Role::query()->count(),
                'warehouses' => Warehouse::query()->count(),
            ],
            'current_fiscal_year' => FiscalYear::query()->where('is_current', true)->first(),
            'base_currency' => Currency::query()->where('is_base', true)->first(),
            'configs' => [
                'accounting' => AccountingConfiguration::query()->where('active', true)->exists(),
                'hrm' => HrmConfiguration::query()->where('active', true)->exists(),
                'inventory' => InventoryConfiguration::query()->where('active', true)->exists(),
                'sales' => SalesConfiguration::query()->where('active', true)->exists(),
                'purchase' => PurchaseConfiguration::query()->where('active', true)->exists(),
            ],
        ]);
    }

    public function show(string $area)
    {
        $class = $this->modelClass($area);
        return response()->json($class::query()->where('active', true)->oldest()->first());
    }

    public function update(Request $request, string $area)
    {
        $class = $this->modelClass($area);
        $record = $class::query()->where('active', true)->oldest()->first() ?? new $class(['active' => true]);
        $record->fill($this->validated($request, $area, $record));
        $record->save();

        return response()->json($record->fresh());
    }

    private function modelClass(string $area): string
    {
        abort_unless(isset($this->map[$area]), 404);
        return $this->map[$area];
    }

    private function validated(Request $request, string $area, Model $record): array
    {
        $account = ['nullable', 'uuid', 'exists:chart_of_accounts,id'];
        $rules = match ($area) {
            'accounting' => [
                'default_cash_account_id' => $account, 'default_bank_account_id' => $account,
                'accounts_receivable_id' => $account, 'accounts_payable_id' => $account,
                'sales_account_id' => $account, 'purchase_account_id' => $account,
                'sales_return_account_id' => $account, 'purchase_return_account_id' => $account,
                'tax_payable_account_id' => $account, 'tax_receivable_account_id' => $account,
                'discount_allowed_account_id' => $account, 'discount_received_account_id' => $account,
                'rounding_account_id' => $account, 'payroll_expense_account_id' => $account,
                'salary_payable_account_id' => $account, 'inventory_account_id' => $account,
                'active' => ['nullable', 'boolean'],
            ],
            'hrm' => [
                'default_working_hours_per_day' => ['required', 'numeric', 'min:1', 'max:24'],
                'default_working_days_per_week' => ['required', 'integer', 'min:1', 'max:7'],
                'attendance_grace_period_minutes' => ['required', 'integer', 'min:0', 'max:240'],
                'half_day_threshold_hours' => ['required', 'numeric', 'min:1', 'max:24'],
                'overtime_enabled' => ['nullable', 'boolean'],
                'overtime_rate_multiplier' => ['nullable', 'numeric', 'min:1'],
                'attendance_correction_enabled' => ['nullable', 'boolean'],
                'leave_year_start_month' => ['required', 'integer', 'min:1', 'max:12'],
                'payroll_day' => ['required', 'integer', 'min:1', 'max:31'],
                'probation_period_days' => ['required', 'integer', 'min:0'],
                'weekend_days' => ['nullable', 'array'],
                'require_leave_approval' => ['nullable', 'boolean'],
                'require_attendance_approval' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
            ],
            'inventory' => [
                'default_warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
                'stock_valuation_method' => ['required', 'in:FIFO,LIFO,WEIGHTED_AVERAGE'],
                'negative_stock_allowed' => ['nullable', 'boolean'],
                'low_stock_alert_enabled' => ['nullable', 'boolean'],
                'default_low_stock_threshold' => ['required', 'integer', 'min:0'],
                'product_code_prefix' => ['required', 'string', 'max:20'],
                'auto_generate_product_code' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
            ],
            'sales' => [
                'default_customer_account_id' => $account,
                'default_sales_tax_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'quotation_validity_days' => ['required', 'integer', 'min:0'],
                'invoice_due_days' => ['required', 'integer', 'min:0'],
                'require_sales_order_approval' => ['nullable', 'boolean'],
                'allow_negative_receivable' => ['nullable', 'boolean'],
                'aging_buckets' => ['nullable', 'array'],
                'overdue_reminders_enabled' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
            ],
            'purchase' => [
                'default_supplier_account_id' => $account,
                'default_purchase_tax_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'bill_due_days' => ['required', 'integer', 'min:0'],
                'require_purchase_order_approval' => ['nullable', 'boolean'],
                'require_bill_approval' => ['nullable', 'boolean'],
                'aging_buckets' => ['nullable', 'array'],
                'overdue_reminders_enabled' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
            ],
        };

        return $request->validate($rules);
    }
}
