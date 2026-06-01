<?php

namespace App\Services\BusinessRules;

use App\Models\AppSetting;
use App\Models\GeneralSetting;
use App\Models\PurchaseConfiguration;
use App\Models\SalesConfiguration;
use Illuminate\Support\Facades\Schema;

class BusinessRuleSettingResolver
{
    private const VALID_RULE_VALUES = ['allow', 'warn', 'block'];

    public function get(string $module, string $settingKey): string
    {
        $module = $this->normalizeModule($module);

        $moduleValue = $this->moduleConfigurationValue($module, $settingKey);
        if ($this->isValid($settingKey, $moduleValue)) {
            return $moduleValue;
        }

        $appValue = AppSetting::query()
            ->when(Schema::hasColumn('app_settings', 'active'), fn ($query) => $query->where('active', true))
            ->oldest()
            ->value($settingKey);

        if ($this->isValid($settingKey, $appValue)) {
            return $appValue;
        }

        $generalValue = $this->generalSettingValue($settingKey);
        if ($this->isValid($settingKey, $generalValue)) {
            return $generalValue;
        }

        return $settingKey === 'suggest_selling' ? 'recent' : 'warn';
    }

    private function moduleConfigurationValue(string $module, string $settingKey): mixed
    {
        if ($this->isSalesModule($module) && class_exists(SalesConfiguration::class) && Schema::hasColumn('sales_configurations', $settingKey)) {
            return SalesConfiguration::query()->oldest()->value($settingKey);
        }

        if ($this->isPurchaseModule($module) && class_exists(PurchaseConfiguration::class) && Schema::hasColumn('purchase_configurations', $settingKey)) {
            return PurchaseConfiguration::query()->oldest()->value($settingKey);
        }

        return null;
    }

    private function generalSettingValue(string $settingKey): mixed
    {
        if (!class_exists(GeneralSetting::class)) {
            return null;
        }

        if (Schema::hasColumn('general_settings', $settingKey)) {
            return GeneralSetting::query()->oldest()->value($settingKey);
        }

        if (Schema::hasColumn('general_settings', 'key') && Schema::hasColumn('general_settings', 'value')) {
            return GeneralSetting::query()->where('key', $settingKey)->value('value');
        }

        if (Schema::hasColumn('general_settings', 'setting_key') && Schema::hasColumn('general_settings', 'setting_value')) {
            return GeneralSetting::query()->where('setting_key', $settingKey)->value('setting_value');
        }

        return null;
    }

    private function isValid(string $settingKey, mixed $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }

        return $settingKey === 'suggest_selling'
            ? in_array($value, ['recent', 'last_sale', 'standard_price', 'average_cost_markup'], true)
            : in_array($value, self::VALID_RULE_VALUES, true);
    }

    private function normalizeModule(string $module): string
    {
        return strtolower(trim($module));
    }

    private function isSalesModule(string $module): bool
    {
        return in_array($module, [
            'quotation',
            'sales_order',
            'invoice',
            'sales_invoice',
            'credit_note',
            'sales_return',
            'customer_payment',
        ], true);
    }

    private function isPurchaseModule(string $module): bool
    {
        return in_array($module, [
            'purchase_order',
            'purchase_bill',
            'debit_note',
            'supplier_payment',
            'expense',
        ], true);
    }
}
