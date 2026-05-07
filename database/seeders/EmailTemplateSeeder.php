<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            ['Sales', 'invoice_sent', 'Invoice {{invoice_no}} from {{company_name}}', 'Dear {{customer_name}}, your invoice {{invoice_no}} for {{total_amount}} is attached.', ['company_name', 'customer_name', 'invoice_no', 'total_amount']],
            ['Sales', 'payment_received', 'Payment received {{payment_no}}', 'Dear {{customer_name}}, we received payment {{payment_no}} for {{amount}}.', ['customer_name', 'payment_no', 'amount']],
            ['Purchase', 'bill_due', 'Bill due reminder {{bill_no}}', 'Bill {{bill_no}} for {{supplier_name}} is due on {{due_date}}.', ['bill_no', 'supplier_name', 'due_date']],
            ['HRM', 'leave_submitted', 'Leave application submitted', '{{employee_name}} submitted leave from {{from_date}} to {{to_date}}.', ['employee_name', 'from_date', 'to_date']],
            ['HRM', 'leave_approved', 'Leave approved', 'Your leave application has been approved.', ['employee_name']],
            ['HRM', 'leave_rejected', 'Leave rejected', 'Your leave application has been rejected.', ['employee_name']],
            ['HRM', 'payslip_generated', 'Payslip generated for {{period}}', 'Your payslip for {{period}} is available.', ['employee_name', 'period']],
            ['System', 'user_invite', 'You are invited to {{company_name}}', 'Hello {{name}}, your user account is ready.', ['company_name', 'name']],
            ['System', 'password_reset', 'Password reset request', 'Use the password reset link to update your credentials.', ['name', 'reset_url']],
            ['HRM', 'payroll_approved', 'Payroll approved for {{period}}', 'Payroll run for {{period}} has been approved.', ['period']],
            ['HRM', 'document_expiry_reminder', 'Employee document expiry reminder', '{{document_name}} for {{employee_name}} expires on {{expiry_date}}.', ['employee_name', 'document_name', 'expiry_date']],
        ];

        foreach ($templates as [$module, $key, $subject, $body, $variables]) {
            EmailTemplate::query()->updateOrCreate(
                ['template_key' => $key],
                [
                    'module' => $module,
                    'subject' => $subject,
                    'body' => $body,
                    'variables' => $variables,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ]
            );
        }
    }
}
