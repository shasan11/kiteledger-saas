<?php

namespace Database\Seeders;

use App\Models\MasterData;
use Illuminate\Database\Seeder;

class MasterDataTypesSeeder extends Seeder
{
    public function run(): void
    {
        $masterData = [
            // Lead sources
            ['type' => 'lead_source', 'name' => 'Website', 'key' => 'website'],
            ['type' => 'lead_source', 'name' => 'Referral', 'key' => 'referral'],
            ['type' => 'lead_source', 'name' => 'Facebook', 'key' => 'facebook'],
            ['type' => 'lead_source', 'name' => 'Instagram', 'key' => 'instagram'],
            ['type' => 'lead_source', 'name' => 'LinkedIn', 'key' => 'linkedin'],
            ['type' => 'lead_source', 'name' => 'Cold Call', 'key' => 'cold_call'],
            ['type' => 'lead_source', 'name' => 'Walk In', 'key' => 'walk_in'],
            ['type' => 'lead_source', 'name' => 'Existing Customer', 'key' => 'existing_customer'],
            ['type' => 'lead_source', 'name' => 'Advertisement', 'key' => 'advertisement'],
            ['type' => 'lead_source', 'name' => 'Other', 'key' => 'other'],

            // Deal stages
            ['type' => 'deal_stage', 'name' => 'New', 'key' => 'new'],
            ['type' => 'deal_stage', 'name' => 'Contacted', 'key' => 'contacted'],
            ['type' => 'deal_stage', 'name' => 'Qualified', 'key' => 'qualified'],
            ['type' => 'deal_stage', 'name' => 'Proposal Sent', 'key' => 'proposal_sent'],
            ['type' => 'deal_stage', 'name' => 'Negotiation', 'key' => 'negotiation'],
            ['type' => 'deal_stage', 'name' => 'Won', 'key' => 'won'],
            ['type' => 'deal_stage', 'name' => 'Lost', 'key' => 'lost'],

            // Task types
            ['type' => 'task_type', 'name' => 'Call', 'key' => 'call'],
            ['type' => 'task_type', 'name' => 'Email', 'key' => 'email'],
            ['type' => 'task_type', 'name' => 'Meeting', 'key' => 'meeting'],
            ['type' => 'task_type', 'name' => 'Follow Up', 'key' => 'follow_up'],
            ['type' => 'task_type', 'name' => 'Demo', 'key' => 'demo'],
            ['type' => 'task_type', 'name' => 'Reminder', 'key' => 'reminder'],
            ['type' => 'task_type', 'name' => 'Documentation', 'key' => 'documentation'],
            ['type' => 'task_type', 'name' => 'Other', 'key' => 'other'],

            // Credit terms
            ['type' => 'credit_term', 'name' => 'Due on Receipt', 'key' => 'due_on_receipt'],
            ['type' => 'credit_term', 'name' => 'Net 7', 'key' => 'net_7'],
            ['type' => 'credit_term', 'name' => 'Net 15', 'key' => 'net_15'],
            ['type' => 'credit_term', 'name' => 'Net 30', 'key' => 'net_30'],
            ['type' => 'credit_term', 'name' => 'Net 45', 'key' => 'net_45'],
            ['type' => 'credit_term', 'name' => 'Net 60', 'key' => 'net_60'],

            // Cost terms
            ['type' => 'cost_term', 'name' => 'FOB', 'key' => 'fob'],
            ['type' => 'cost_term', 'name' => 'CIF', 'key' => 'cif'],
            ['type' => 'cost_term', 'name' => 'EXW', 'key' => 'exw'],
            ['type' => 'cost_term', 'name' => 'DDP', 'key' => 'ddp'],
            ['type' => 'cost_term', 'name' => 'DAP', 'key' => 'dap'],
            ['type' => 'cost_term', 'name' => 'FCA', 'key' => 'fca'],
            ['type' => 'cost_term', 'name' => 'CPT', 'key' => 'cpt'],
            ['type' => 'cost_term', 'name' => 'Other', 'key' => 'other'],

            // Payment modes
            ['type' => 'payment_mode', 'name' => 'Cash', 'key' => 'cash'],
            ['type' => 'payment_mode', 'name' => 'Bank Transfer', 'key' => 'bank_transfer'],
            ['type' => 'payment_mode', 'name' => 'Cheque', 'key' => 'cheque'],
            ['type' => 'payment_mode', 'name' => 'Card', 'key' => 'card'],
            ['type' => 'payment_mode', 'name' => 'Online Payment', 'key' => 'online_payment'],
            ['type' => 'payment_mode', 'name' => 'Wallet', 'key' => 'wallet'],
            ['type' => 'payment_mode', 'name' => 'Other', 'key' => 'other'],

            // Industries
            ['type' => 'industry', 'name' => 'Retail', 'key' => 'retail'],
            ['type' => 'industry', 'name' => 'Manufacturing', 'key' => 'manufacturing'],
            ['type' => 'industry', 'name' => 'Trading', 'key' => 'trading'],
            ['type' => 'industry', 'name' => 'Service', 'key' => 'service'],
            ['type' => 'industry', 'name' => 'Logistics', 'key' => 'logistics'],
            ['type' => 'industry', 'name' => 'Education', 'key' => 'education'],
            ['type' => 'industry', 'name' => 'Healthcare', 'key' => 'healthcare'],
            ['type' => 'industry', 'name' => 'Construction', 'key' => 'construction'],
            ['type' => 'industry', 'name' => 'Hospitality', 'key' => 'hospitality'],
            ['type' => 'industry', 'name' => 'IT', 'key' => 'it'],
            ['type' => 'industry', 'name' => 'Other', 'key' => 'other'],

            // Activity types
            ['type' => 'activity_type', 'name' => 'Call', 'key' => 'call'],
            ['type' => 'activity_type', 'name' => 'Email', 'key' => 'email'],
            ['type' => 'activity_type', 'name' => 'Meeting', 'key' => 'meeting'],
            ['type' => 'activity_type', 'name' => 'Task', 'key' => 'task'],
            ['type' => 'activity_type', 'name' => 'Note', 'key' => 'note'],
            ['type' => 'activity_type', 'name' => 'WhatsApp', 'key' => 'whatsapp'],
            ['type' => 'activity_type', 'name' => 'SMS', 'key' => 'sms'],
            ['type' => 'activity_type', 'name' => 'Follow Up', 'key' => 'follow_up'],

            // Lost reasons
            ['type' => 'lost_reason', 'name' => 'Price Too High', 'key' => 'price_too_high'],
            ['type' => 'lost_reason', 'name' => 'No Budget', 'key' => 'no_budget'],
            ['type' => 'lost_reason', 'name' => 'Competitor Selected', 'key' => 'competitor_selected'],
            ['type' => 'lost_reason', 'name' => 'No Response', 'key' => 'no_response'],
            ['type' => 'lost_reason', 'name' => 'Not Interested', 'key' => 'not_interested'],
            ['type' => 'lost_reason', 'name' => 'Requirement Changed', 'key' => 'requirement_changed'],
            ['type' => 'lost_reason', 'name' => 'Other', 'key' => 'other'],

            // Custom statuses
            ['type' => 'custom_status', 'name' => 'Pending', 'key' => 'pending'],
            ['type' => 'custom_status', 'name' => 'In Progress', 'key' => 'in_progress'],
            ['type' => 'custom_status', 'name' => 'Completed', 'key' => 'completed'],
            ['type' => 'custom_status', 'name' => 'Cancelled', 'key' => 'cancelled'],
            ['type' => 'custom_status', 'name' => 'On Hold', 'key' => 'on_hold'],

            // TDS types
            ['type' => 'tds_type', 'name' => 'TDS Receivable', 'key' => 'tds_receivable'],
            ['type' => 'tds_type', 'name' => 'TDS Payable', 'key' => 'tds_payable'],
            ['type' => 'tds_type', 'name' => 'Withholding Tax', 'key' => 'withholding_tax'],
            ['type' => 'tds_type', 'name' => 'None', 'key' => 'none'],

            // Campaign sources
            ['type' => 'campaign_source', 'name' => 'Google', 'key' => 'google'],
            ['type' => 'campaign_source', 'name' => 'Facebook', 'key' => 'facebook'],
            ['type' => 'campaign_source', 'name' => 'Instagram', 'key' => 'instagram'],
            ['type' => 'campaign_source', 'name' => 'LinkedIn', 'key' => 'linkedin'],
            ['type' => 'campaign_source', 'name' => 'Email Newsletter', 'key' => 'newsletter'],
            ['type' => 'campaign_source', 'name' => 'Referral Program', 'key' => 'referral'],
            ['type' => 'campaign_source', 'name' => 'Trade Show', 'key' => 'trade_show'],
            ['type' => 'campaign_source', 'name' => 'Direct', 'key' => 'direct'],
            ['type' => 'campaign_source', 'name' => 'Other', 'key' => 'other'],

            // Campaign mediums
            ['type' => 'campaign_medium', 'name' => 'Email', 'key' => 'email'],
            ['type' => 'campaign_medium', 'name' => 'SMS', 'key' => 'sms'],
            ['type' => 'campaign_medium', 'name' => 'Social Media', 'key' => 'social'],
            ['type' => 'campaign_medium', 'name' => 'Paid Ads (CPC)', 'key' => 'cpc'],
            ['type' => 'campaign_medium', 'name' => 'Display', 'key' => 'display'],
            ['type' => 'campaign_medium', 'name' => 'Organic', 'key' => 'organic'],
            ['type' => 'campaign_medium', 'name' => 'Print', 'key' => 'print'],
            ['type' => 'campaign_medium', 'name' => 'Radio / TV', 'key' => 'broadcast'],
            ['type' => 'campaign_medium', 'name' => 'WhatsApp', 'key' => 'whatsapp'],
            ['type' => 'campaign_medium', 'name' => 'Other', 'key' => 'other'],
        ];

        foreach ($masterData as $data) {
            MasterData::updateOrCreate(
                ['type' => $data['type'], 'key' => $data['key']],
                [
                    'group' => $data['type'],
                    'value' => $data['name'],
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
