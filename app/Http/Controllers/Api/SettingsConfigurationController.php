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
use App\Models\SmsConfig;
use App\Models\SmsLog;
use App\Models\SmsTemplate;
use App\Models\TaxRate;
use App\Models\Warehouse;
use App\Services\Settings\DatabaseSettingService;
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

    private array $posDefaults = [
        'show_services_in_pos' => true,
        'allow_zero_stock_sale' => false,
        'allow_negative_stock_sale' => false,
        'default_cash_account_id' => null,
        'default_card_account_id' => null,
        'default_online_account_id' => null,
        'receipt_paper_size' => '80mm',
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
                'sms_configs' => SmsConfig::query()->count(),
                'sms_templates' => SmsTemplate::query()->count(),
                'failed_sms' => SmsLog::query()->where('status', 'failed')->count(),
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
                'sms' => SmsConfig::query()->where(function ($query) {
                    $query->where('is_active', true)->orWhere('active', true);
                })->exists(),
            ],
            'sms' => [
                'active_provider' => SmsConfig::query()->where(function ($query) {
                    $query->where('is_active', true)->orWhere('active', true);
                })->orderByDesc('is_default')->value('provider'),
                'default_provider' => SmsConfig::query()->where('is_default', true)->value('provider'),
                'last_status' => SmsLog::query()->latest()->value('status'),
                'failed_today' => SmsLog::query()->where('status', 'failed')->whereDate('created_at', today())->count(),
            ],
        ]);
    }

    public function show(string $area)
    {
        if ($area === 'pos') {
            return response()->json($this->posSettings());
        }

        $class = $this->modelClass($area);
        return response()->json($class::query()->where('active', true)->oldest()->first());
    }

    public function update(Request $request, string $area)
    {
        if ($area === 'pos') {
            $settings = app(DatabaseSettingService::class);
            foreach ($this->validated($request, $area, new GeneralSettingProxy) as $key => $value) {
                $settings->set($key, $value === null ? '' : $value, 'pos');
            }
            $settings->forgetGroup('pos');

            return response()->json($this->posSettings());
        }

        $class = $this->modelClass($area);
        $record = $class::query()->where('active', true)->oldest()->first() ?? new $class(['active' => true]);
        $record->fill($this->validated($request, $area, $record));
        $record->save();

        return response()->json($record->fresh());
    }

    private function modelClass(string $area): string
    {
        abort_unless($area === 'pos' || isset($this->map[$area]), 404);
        return $this->map[$area];
    }

    private function validated(Request $request, string $area, Model $record): array
    {
        $account = ['nullable', 'uuid', 'exists:accounts,id'];
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
                'loan_processing_fee_expense_account_id' => $account,
                'loan_charge_expense_account_id' => $account,
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
                'suggest_selling' => ['nullable', 'in:recent,last_sale,standard_price,average_cost_markup'],
                'negative_item_balance' => ['nullable', 'in:allow,warn,block'],
                'credit_limit_exceed' => ['nullable', 'in:allow,warn,block'],
                'negative_cash_balance' => ['nullable', 'in:allow,warn,block'],
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
                'negative_item_balance' => ['nullable', 'in:allow,warn,block'],
                'negative_cash_balance' => ['nullable', 'in:allow,warn,block'],
                'aging_buckets' => ['nullable', 'array'],
                'overdue_reminders_enabled' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
            ],
            'pos' => [
                'show_services_in_pos' => ['nullable', 'boolean'],
                'allow_zero_stock_sale' => ['nullable', 'boolean'],
                'allow_negative_stock_sale' => ['nullable', 'boolean'],
                'default_cash_account_id' => $account,
                'default_card_account_id' => $account,
                'default_online_account_id' => $account,
                'receipt_paper_size' => ['nullable', 'in:58mm,80mm,A4'],
            ],
        };

        return $request->validate($rules);
    }

    private function posSettings(): array
    {
        $values = app(DatabaseSettingService::class)->getGroup('pos');

        return collect($this->posDefaults)
            ->mapWithKeys(function ($default, $key) use ($values) {
                $value = array_key_exists($key, $values) && $values[$key] !== '' ? $values[$key] : $default;
                if (is_bool($default)) {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                }

                return [$key => $value];
            })
            ->all();
    }
}

class GeneralSettingProxy extends Model
{
}
