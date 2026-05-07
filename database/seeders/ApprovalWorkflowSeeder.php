<?php

namespace Database\Seeders;

use App\Models\ApprovalWorkflow;
use App\Models\Role;
use Illuminate\Database\Seeder;

class ApprovalWorkflowSeeder extends Seeder
{
    public function run(): void
    {
        $roleId = Role::query()
            ->whereIn('name', ['Super Admin', 'Admin', 'super-admin', 'admin'])
            ->value('id');

        $workflows = [
            ['Sales', 'quotation', true], ['Sales', 'sales_order', true], ['Sales', 'proforma_invoice', true],
            ['Sales', 'invoice', true], ['Sales', 'receipt', true], ['Sales', 'sales_return', true],
            ['Purchase', 'purchase_order', true], ['Purchase', 'purchase_bill', true], ['Purchase', 'payment', true],
            ['Purchase', 'expense', true], ['Purchase', 'debit_note', true],
            ['Accounting', 'journal_voucher', true], ['Accounting', 'cash_transfer', true], ['Accounting', 'loan_account', true],
            ['Accounting', 'loan_topup', true], ['Accounting', 'loan_charge', true],
            ['HRM', 'payroll', true], ['HRM', 'payslip', true], ['HRM', 'leave_application', true],
            ['Inventory', 'inventory_adjustment', true], ['Inventory', 'warehouse_transfer', false],
        ];

        foreach ($workflows as [$module, $type, $required]) {
            ApprovalWorkflow::query()->updateOrCreate(
                ['module' => $module, 'document_type' => $type],
                [
                    'approval_required' => $required,
                    'approval_mode' => 'SINGLE',
                    'minimum_amount' => null,
                    'approver_role_id' => $roleId,
                    'approver_user_id' => null,
                    'steps' => null,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ]
            );
        }
    }
}
