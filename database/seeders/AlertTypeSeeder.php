<?php

namespace Database\Seeders;

use App\Models\AlertType;
use Illuminate\Database\Seeder;

class AlertTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $alertTypes = [
            [
                'name' => 'Invoice Due Reminder',
                'medium' => 'email',
                'alert_type' => 'invoice_due_reminder',
                'schedule' => 'daily',
                'sync_time' => '09:00:00',
                'recipient' => 'finance_team',
            ],
            [
                'name' => 'Overdue Invoice Alert',
                'medium' => 'email',
                'alert_type' => 'overdue_invoice_alert',
                'schedule' => 'daily',
                'sync_time' => '08:30:00',
                'recipient' => 'admin',
            ],
            [
                'name' => 'Low Stock Alert',
                'medium' => 'in_app',
                'alert_type' => 'low_stock_alert',
                'schedule' => 'immediate',
                'sync_time' => null,
                'recipient' => 'inventory_team',
            ],
            [
                'name' => 'Payment Received Notification',
                'medium' => 'whatsapp',
                'alert_type' => 'payment_received_notification',
                'schedule' => 'immediate',
                'sync_time' => null,
                'recipient' => 'finance_team',
            ],
            [
                'name' => 'Purchase Bill Due Reminder',
                'medium' => 'email',
                'alert_type' => 'purchase_bill_due_reminder',
                'schedule' => 'daily',
                'sync_time' => '10:00:00',
                'recipient' => 'finance_team',
            ],
            [
                'name' => 'Sales Order Approval Alert',
                'medium' => 'in_app',
                'alert_type' => 'sales_order_approval_alert',
                'schedule' => 'immediate',
                'sync_time' => null,
                'recipient' => 'sales_team',
            ],
            [
                'name' => 'Customer Statement Reminder',
                'medium' => 'email',
                'alert_type' => 'customer_statement_reminder',
                'schedule' => 'monthly',
                'sync_time' => '09:30:00',
                'recipient' => 'customer',
            ],
            [
                'name' => 'Payroll Processing Reminder',
                'medium' => 'email',
                'alert_type' => 'payroll_processing_reminder',
                'schedule' => 'monthly',
                'sync_time' => '11:00:00',
                'recipient' => 'hr_team',
            ],
            [
                'name' => 'Leave Request Notification',
                'medium' => 'in_app',
                'alert_type' => 'leave_request_notification',
                'schedule' => 'immediate',
                'sync_time' => null,
                'recipient' => 'hr_team',
            ],
            [
                'name' => 'Daily Sales Summary',
                'medium' => 'email',
                'alert_type' => 'daily_sales_summary',
                'schedule' => 'daily',
                'sync_time' => '18:00:00',
                'recipient' => 'sales_team',
            ],
            [
                'name' => 'Failed Email Notification',
                'medium' => 'in_app',
                'alert_type' => 'failed_email_notification',
                'schedule' => 'immediate',
                'sync_time' => null,
                'recipient' => 'admin',
            ],
            [
                'name' => 'System Backup Reminder',
                'medium' => 'email',
                'alert_type' => 'system_backup_reminder',
                'schedule' => 'weekly',
                'sync_time' => '23:00:00',
                'recipient' => 'admin',
            ],
        ];

        foreach ($alertTypes as $alertType) {
            AlertType::updateOrCreate(
                ['alert_type' => $alertType['alert_type']],
                [
                    ...$alertType,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
