<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountingConfiguration extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'default_cash_account_id', 'default_bank_account_id', 'accounts_receivable_id',
        'accounts_payable_id', 'sales_account_id', 'purchase_account_id',
        'sales_return_account_id', 'purchase_return_account_id', 'tax_payable_account_id',
        'tax_receivable_account_id', 'discount_allowed_account_id',
        'discount_received_account_id', 'rounding_account_id',
        'payroll_expense_account_id', 'salary_payable_account_id',
        'inventory_account_id', 'loan_processing_fee_expense_account_id',
        'loan_charge_expense_account_id', 'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'is_system_generated' => 'boolean', 'user_add_id' => 'integer'];
    }
}
