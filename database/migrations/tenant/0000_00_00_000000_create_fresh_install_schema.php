<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('accounting_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('default_cash_account_id')->nullable();
            $table->uuid('default_bank_account_id')->nullable();
            $table->uuid('accounts_receivable_id')->nullable();
            $table->uuid('accounts_payable_id')->nullable();
            $table->uuid('sales_account_id')->nullable();
            $table->uuid('purchase_account_id')->nullable();
            $table->uuid('sales_return_account_id')->nullable();
            $table->uuid('purchase_return_account_id')->nullable();
            $table->uuid('tax_payable_account_id')->nullable();
            $table->uuid('tax_receivable_account_id')->nullable();
            $table->uuid('discount_allowed_account_id')->nullable();
            $table->uuid('discount_received_account_id')->nullable();
            $table->uuid('rounding_account_id')->nullable();
            $table->uuid('payroll_expense_account_id')->nullable();
            $table->uuid('salary_payable_account_id')->nullable();
            $table->uuid('inventory_account_id')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('loan_processing_fee_expense_account_id')->nullable();
            $table->uuid('loan_charge_expense_account_id')->nullable();
        });

        Schema::create('accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('code', 30)->nullable();
            $table->string('nature')->default('coa');
            $table->uuid('parent_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('swift_code', 50)->nullable();
            $table->decimal('dr_amount', 16, 2)->default('0');
            $table->decimal('cr_amount', 16, 2)->default('0');
            $table->decimal('balance', 16, 2)->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('module', 120)->nullable();
            $table->string('action', 120)->nullable();
            $table->text('description')->nullable();
            $table->string('ip_address', 60)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('module')->nullable();
            $table->string('title')->nullable();
            $table->string('status')->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'branch_id', 'module'], 'ai_conversations_user_id_branch_id_module_index');
        });

        Schema::create('ai_embeddings', function (Blueprint $table): void {
            $table->id();
            $table->string('source_type', 60);
            $table->string('source_id', 64);
            $table->string('branch_id')->nullable();
            $table->text('content');
            $table->char('content_hash', 64);
            $table->longText('vector');
            $table->unsignedSmallInteger('dims');
            $table->string('provider', 40);
            $table->string('model', 100);
            $table->timestamps();
            $table->index(['dims', 'model'], 'ai_emb_dims_model_idx');
            $table->index(['branch_id'], 'ai_emb_branch_idx');
            $table->unique(['source_type', 'source_id'], 'ai_emb_source_unique');
        });

        Schema::create('ai_knowledge_chunks', function (Blueprint $table): void {
            $table->id();
            $table->string('source_type', 80);
            $table->string('source_id', 191);
            $table->string('module', 100)->nullable();
            $table->string('title', 255);
            $table->longText('content');
            $table->string('route', 500)->nullable();
            $table->string('permission', 160)->nullable();
            $table->json('keywords')->nullable();
            $table->json('metadata')->nullable();
            $table->string('branch_id', 64)->nullable();
            $table->string('fiscal_year_id', 64)->nullable();
            $table->char('content_hash', 64);
            $table->timestamps();
            $table->unique(['source_type', 'source_id'], 'ai_knowledge_source_unique');
            $table->index(['source_type', 'module'], 'ai_knowledge_type_module_idx');
            $table->index(['branch_id', 'fiscal_year_id'], 'ai_knowledge_scope_idx');
            $table->index(['updated_at'], 'ai_knowledge_updated_idx');
        });

        Schema::create('ai_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('ai_conversation_id')->nullable();
            $table->string('role');
            $table->longText('content')->nullable();
            $table->json('context')->nullable();
            $table->integer('tokens_input')->nullable();
            $table->integer('tokens_output')->nullable();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->timestamps();
            $table->index(['ai_conversation_id'], 'ai_messages_ai_conversation_id_index');
        });

        Schema::create('ai_pending_actions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('ai_conversation_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('action_type', 120);
            $table->string('module', 120)->nullable();
            $table->string('target_type', 120)->nullable();
            $table->string('target_id')->nullable();
            $table->string('title')->nullable();
            $table->text('summary')->nullable();
            $table->json('payload')->nullable();
            $table->string('risk_level', 40)->default('medium');
            $table->json('risk_reasons')->nullable();
            $table->string('status', 40)->default('pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['module', 'status'], 'ai_pending_actions_module_status_index');
            $table->index(['user_id', 'status', 'created_at'], 'ai_pending_actions_user_id_status_created_at_index');
        });

        Schema::create('ai_usage_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('module')->nullable();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->integer('prompt_tokens')->default('0');
            $table->integer('completion_tokens')->default('0');
            $table->integer('total_tokens')->default('0');
            $table->decimal('estimated_cost', 10, 6)->nullable();
            $table->string('status')->default('success');
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->string('request_hash')->nullable();
            $table->timestamps();
            $table->text('question')->nullable();
            $table->string('intent', 80)->nullable();
            $table->string('selected_tool', 120)->nullable();
            $table->json('filters')->nullable();
            $table->json('date_range')->nullable();
            $table->unsignedInteger('row_count')->nullable();
            $table->unsignedInteger('token_estimate')->nullable();
            $table->index(['status', 'created_at'], 'ai_usage_logs_status_created_at_index');
            $table->index(['user_id', 'module', 'created_at'], 'ai_usage_logs_user_id_module_created_at_index');
        });

        Schema::create('ai_action_audit_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('ai_pending_action_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action_type', 120);
            $table->string('module', 120)->nullable();
            $table->string('target_type', 120)->nullable();
            $table->string('target_id')->nullable();
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->string('status', 40)->default('executed');
            $table->string('ip_address', 60)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            $table->index(['action_type', 'status'], 'ai_audit_action_status_idx');
            $table->index(['user_id', 'created_at'], 'ai_audit_user_created_idx');
            $table->index(['ai_pending_action_id'], 'ai_audit_pending_action_idx');
        });

        Schema::create('ai_tool_calls', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('ai_conversation_id')->nullable();
            $table->uuid('ai_message_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('tool_name', 120);
            $table->json('input')->nullable();
            $table->json('output')->nullable();
            $table->string('status', 40)->default('completed');
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->timestamps();
            $table->index(['tool_name', 'status'], 'ai_tool_calls_name_status_idx');
            $table->index(['user_id', 'created_at'], 'ai_tool_calls_user_created_idx');
            $table->index(['ai_conversation_id'], 'ai_tool_calls_conversation_idx');
        });

        Schema::create('alert_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('medium')->default('in_app');
            $table->string('alert_type', 80)->nullable();
            $table->string('schedule')->default('immediate');
            $table->time('sync_time')->nullable();
            $table->text('recipient')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('title', 200);
            $table->text('description');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('app_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('company_name', 180);
            $table->string('tag_line', 200)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('website', 180)->nullable();
            $table->text('footer')->nullable();
            $table->string('logo', 255)->nullable();
            $table->string('suggest_selling')->default('recent');
            $table->string('negative_cash_balance')->default('warn');
            $table->string('negative_item_balance')->default('warn');
            $table->string('credit_limit_exceed')->default('warn');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('legal_name', 180)->nullable();
            $table->string('registration_number', 80)->nullable();
            $table->string('tax_number', 80)->nullable();
            $table->string('vat_number', 80)->nullable();
            $table->string('address_line_1', 255)->nullable();
            $table->string('address_line_2', 255)->nullable();
            $table->string('city', 80)->nullable();
            $table->string('state', 80)->nullable();
            $table->string('postal_code', 40)->nullable();
            $table->string('country', 80)->nullable();
            $table->uuid('default_currency_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->string('timezone', 80)->default('Asia/Katmandu');
            $table->string('date_format', 30)->default('DD-MM-YYYY');
            $table->string('time_format', 30)->default('HH:mm');
            $table->string('number_format', 40)->nullable();
            $table->string('language', 20)->default('en');
            $table->string('week_start_day', 20)->default('Sunday');
            $table->unsignedTinyInteger('financial_year_start_month')->default('4');
            $table->boolean('use_nepali_calendar')->default(false);
            $table->string('dark_logo')->nullable();
            $table->string('favicon')->nullable();
            $table->string('brand_primary_color', 20)->nullable();
            $table->string('brand_secondary_color', 20)->nullable();
            $table->string('brand_accent_color', 20)->nullable();
            $table->string('brand_sidebar_color', 20)->nullable();
            $table->string('brand_header_color', 20)->nullable();
            $table->string('brand_text_color', 20)->nullable();
        });

        Schema::create('application_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('key', 120);
            $table->longText('value')->nullable();
            $table->string('group', 80)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('approval_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('approvable_type');
            $table->uuid('approvable_id');
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->string('action');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
            $table->index(['approvable_type', 'approvable_id'], 'approval_logs_approvable_type_approvable_id_index');
        });

        Schema::create('approval_workflows', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('module', 80);
            $table->string('document_type', 80);
            $table->boolean('approval_required')->default(false);
            $table->string('approval_mode')->default('SINGLE');
            $table->decimal('minimum_amount', 18, 2)->nullable();
            $table->uuid('approver_role_id')->nullable();
            $table->unsignedBigInteger('approver_user_id')->nullable();
            $table->json('steps')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['module', 'document_type'], 'approval_workflows_module_document_type_unique');
        });

        Schema::create('assigned_tasks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('task_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('attendance_summaries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('payroll_period_id');
            $table->uuid('branch_id')->nullable();
            $table->decimal('total_working_days', 8, 2)->default('0');
            $table->decimal('present_days', 8, 2)->default('0');
            $table->decimal('absent_days', 8, 2)->default('0');
            $table->decimal('paid_leave_days', 8, 2)->default('0');
            $table->decimal('unpaid_leave_days', 8, 2)->default('0');
            $table->decimal('half_days', 8, 2)->default('0');
            $table->unsignedInteger('late_days')->default('0');
            $table->decimal('overtime_hours', 10, 2)->default('0');
            $table->decimal('payable_days', 8, 2)->default('0');
            $table->boolean('locked')->default(false);
            $table->timestamps();
            $table->index(['branch_id', 'payroll_period_id'], 'attendance_summaries_branch_id_payroll_period_id_index');
            $table->unique(['employee_id', 'payroll_period_id'], 'attendance_summaries_employee_id_payroll_period_id_unique');
        });

        Schema::create('attendances', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->dateTime('in_time');
            $table->dateTime('out_time')->nullable();
            $table->string('ip', 60)->nullable();
            $table->string('comment', 255)->nullable();
            $table->unsignedBigInteger('punch_by')->nullable();
            $table->decimal('total_hour', 8, 2)->nullable();
            $table->string('in_time_status', 30)->nullable();
            $table->string('out_time_status', 30)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['out_time_status'], 'attendances_out_time_status_global_search_idx');
            $table->index(['in_time_status'], 'attendances_in_time_status_global_search_idx');
            $table->index(['user_id'], 'attendances_user_id_global_search_idx');
            $table->index(['branch_id'], 'attendances_branch_id_global_search_idx');
        });

        Schema::create('award_histories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('award_id')->nullable();
            $table->dateTime('awarded_date');
            $table->string('comment', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('awards', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('description', 255)->nullable();
            $table->string('image', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['name'], 'awards_name_unique');
        });

        Schema::create('bank_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('type');
            $table->string('display_name', 150);
            $table->string('code', 30);
            $table->uuid('currency_id');
            $table->text('description')->nullable();
            $table->string('bank_name', 150)->nullable();
            $table->string('account_name', 150)->nullable();
            $table->string('account_number', 80)->nullable();
            $table->string('account_type', 50)->nullable();
            $table->string('swift_code', 50)->nullable();
            $table->uuid('account_id')->nullable();
            $table->decimal('opening_balance', 16, 2)->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['account_number'], 'bank_accounts_account_number_global_search_idx');
            $table->index(['display_name'], 'bank_accounts_display_name_global_search_idx');
            $table->index(['code'], 'bank_accounts_code_global_search_idx');
            $table->index(['branch_id'], 'bank_accounts_branch_id_global_search_idx');
        });

        Schema::create('bank_reconciliation_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bank_reconciliation_id');
            $table->string('bank_statement_line_id')->nullable();
            $table->string('journal_voucher_line_id')->nullable();
            $table->string('type', 24);
            $table->decimal('amount', 18, 2)->default('0');
            $table->decimal('difference', 18, 2)->default('0');
            $table->string('match_confidence', 16)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['bank_reconciliation_id', 'type'], 'bank_reconciliation_items_bank_reconciliation_id_type_index');
            $table->index(['journal_voucher_line_id'], 'bank_reconciliation_items_journal_voucher_line_id_index');
            $table->index(['bank_statement_line_id'], 'bank_reconciliation_items_bank_statement_line_id_index');
        });

        Schema::create('bank_reconciliations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bank_account_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->string('reference')->nullable();
            $table->date('statement_date');
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->decimal('opening_bank_balance', 18, 2)->default('0');
            $table->decimal('closing_bank_balance', 18, 2)->default('0');
            $table->decimal('software_balance', 18, 2)->default('0');
            $table->decimal('matched_amount', 18, 2)->default('0');
            $table->decimal('unmatched_bank_amount', 18, 2)->default('0');
            $table->decimal('unmatched_software_amount', 18, 2)->default('0');
            $table->decimal('reconciliation_difference', 18, 2)->default('0');
            $table->string('status', 16)->default('draft');
            $table->timestamp('finalized_at')->nullable();
            $table->unsignedBigInteger('finalized_by_id')->nullable();
            $table->text('remarks')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['bank_account_id', 'status'], 'bank_reconciliations_bank_account_id_status_index');
            $table->index(['bank_account_id', 'statement_date'], 'bank_reconciliations_bank_account_id_statement_date_index');
        });

        Schema::create('bank_statement_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bank_account_id');
            $table->uuid('account_id')->nullable();
            $table->date('statement_date');
            $table->string('description')->nullable();
            $table->string('reference')->nullable();
            $table->decimal('debit', 18, 2)->default('0');
            $table->decimal('credit', 18, 2)->default('0');
            $table->decimal('balance', 18, 2)->nullable();
            $table->string('counterparty')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('imported');
            $table->unsignedBigInteger('imported_by_id')->nullable();
            $table->uuid('posted_journal_voucher_id')->nullable();
            $table->timestamps();
            $table->string('matched_journal_voucher_line_id')->nullable();
            $table->string('bank_reconciliation_id')->nullable();
            $table->string('match_confidence', 16)->nullable();
            $table->string('match_type', 16)->nullable();
            $table->timestamp('matched_at')->nullable();
            $table->unsignedBigInteger('matched_by_id')->nullable();
            $table->string('transaction_hash', 64)->nullable();
            $table->index(['bank_reconciliation_id'], 'bank_statement_lines_bank_reconciliation_id_index');
            $table->index(['matched_journal_voucher_line_id'], 'bank_statement_lines_matched_journal_voucher_line_id_index');
            $table->index(['bank_account_id', 'transaction_hash'], 'bank_statement_lines_bank_account_id_transaction_hash_index');
            $table->index(['reference', 'statement_date'], 'bank_statement_lines_reference_statement_date_index');
            $table->index(['bank_account_id', 'statement_date'], 'bank_statement_lines_bank_account_id_statement_date_index');
        });

        Schema::create('benefit_rules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code', 40);
            $table->decimal('employee_rate', 8, 4)->default('0');
            $table->decimal('employer_rate', 8, 4)->default('0');
            $table->string('calculation_base', 60)->default('gross');
            $table->decimal('max_limit', 16, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->uuid('accounting_account_id')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'benefit_rules_code_unique');
        });

        Schema::create('bill_of_material_by_products', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bill_of_material_id');
            $table->uuid('product_id');
            $table->decimal('cost_percent', 9, 4)->default('0');
            $table->decimal('quantity', 18, 4)->default('0');
            $table->string('unit_code', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['bill_of_material_id', 'product_id'], 'bom_byproduct_bom_product_index');
        });

        Schema::create('bill_of_material_expenses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bill_of_material_id');
            $table->uuid('cost_term_id')->nullable();
            $table->decimal('amount', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['bill_of_material_id'], 'bom_expense_bom_index');
        });

        Schema::create('bill_of_material_raw_materials', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('bill_of_material_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 18, 4)->default('0');
            $table->string('unit_code', 20)->nullable();
            $table->decimal('wastage_percent', 9, 4)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['bill_of_material_id', 'product_id'], 'bom_raw_bom_product_index');
        });

        Schema::create('bills_of_material', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->string('code', 60)->nullable();
            $table->date('date');
            $table->string('reference', 120)->nullable();
            $table->uuid('product_id');
            $table->decimal('output_quantity', 18, 4)->default('1');
            $table->string('output_unit_code', 20)->nullable();
            $table->boolean('manufacture_on_every_sale')->default(false);
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->text('remarks')->nullable();
            $table->unique(['code'], 'bills_of_material_code_unique');
            $table->index(['product_id', 'active'], 'bills_of_material_product_id_active_index');
            $table->index(['branch_id', 'date'], 'bills_of_material_branch_id_date_index');
        });

        Schema::create('branches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 30);
            $table->string('name', 120);
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_head_office')->default(false);
            $table->boolean('is_transaction_enabled')->default(true);
            $table->boolean('is_pos_enabled')->default(true);
            $table->boolean('is_warehouse_enabled')->default(true);
            $table->boolean('is_ai_enabled')->default(true);
            $table->boolean('is_billing_location_enabled')->default(true);
            $table->boolean('abbreviated_tax_enabled')->default(true);
            $table->boolean('track_location')->default(true);
            $table->string('logo', 255)->nullable();
            $table->string('favicon', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('language_id')->nullable();
            $table->text('enabled_languages')->nullable();
            $table->index(['phone'], 'branches_phone_global_search_idx');
            $table->index(['name'], 'branches_name_global_search_idx');
            $table->index(['email'], 'branches_email_global_search_idx');
            $table->unique(['code'], 'branches_code_unique');
        });

        Schema::create('cache', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
            $table->index(['expiration'], 'cache_expiration_index');
        });

        Schema::create('cache_locks', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
            $table->index(['expiration'], 'cache_locks_expiration_index');
        });

        Schema::create('campaign_email_attachments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->uuid('campaign_email_message_id');
            $table->string('original_name', 255);
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('file_type', 80)->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->default('0');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['campaign_id', 'campaign_email_message_id', 'is_active'], 'campaign_email_attachments_message_active_idx');
        });

        Schema::create('campaign_email_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->string('title', 180);
            $table->string('code', 80)->nullable();
            $table->string('subject', 255)->nullable();
            $table->string('preview_text', 255)->nullable();
            $table->string('sender_name', 180)->nullable();
            $table->string('sender_email', 180)->nullable();
            $table->string('reply_to_email', 180)->nullable();
            $table->longText('body')->nullable();
            $table->uuid('template_id')->nullable();
            $table->string('status', 30)->default('draft');
            $table->string('send_mode', 30)->default('draft');
            $table->dateTime('scheduled_at')->nullable();
            $table->string('timezone', 80)->nullable();
            $table->unsignedInteger('delay_minutes')->nullable();
            $table->unsignedInteger('send_order')->default('1');
            $table->boolean('is_active')->default(true);
            $table->boolean('track_opens')->default(true);
            $table->boolean('track_clicks')->default(true);
            $table->string('priority', 30)->default('normal');
            $table->text('notes')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['campaign_id', 'status', 'scheduled_at'], 'campaign_email_messages_campaign_id_status_scheduled_at_index');
            $table->unique(['campaign_id', 'code'], 'campaign_email_messages_campaign_id_code_unique');
        });

        Schema::create('campaign_email_recipients', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->uuid('campaign_email_message_id');
            $table->uuid('contact_id')->nullable();
            $table->uuid('contact_group_id')->nullable();
            $table->string('name', 180)->nullable();
            $table->string('company_name', 180)->nullable();
            $table->string('email', 180);
            $table->string('phone', 80)->nullable();
            $table->string('source', 40)->default('manual');
            $table->boolean('is_valid_email')->default(true);
            $table->boolean('is_unsubscribed')->default(false);
            $table->string('status', 30)->default('ready');
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->string('last_log_status', 30)->nullable();
            $table->timestamps();
            $table->index(['campaign_id', 'status', 'source'], 'campaign_email_recipients_campaign_id_status_source_index');
            $table->unique(['campaign_email_message_id', 'email'], 'campaign_email_recipients_unique_email');
        });

        Schema::create('campaign_send_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->uuid('contact_id')->nullable();
            $table->string('channel', 10);
            $table->string('to_address', 191)->nullable();
            $table->string('status', 20)->default('queued');
            $table->string('provider_message_id', 191)->nullable();
            $table->text('error')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('campaign_email_message_id')->nullable();
            $table->uuid('campaign_sms_message_id')->nullable();
            $table->uuid('campaign_email_recipient_id')->nullable();
            $table->uuid('campaign_sms_recipient_id')->nullable();
            $table->uuid('contact_group_id')->nullable();
            $table->string('type', 10)->nullable();
            $table->string('message_title', 180)->nullable();
            $table->string('recipient_name', 180)->nullable();
            $table->string('company_name', 180)->nullable();
            $table->string('email', 180)->nullable();
            $table->string('phone', 80)->nullable();
            $table->string('provider', 80)->nullable();
            $table->string('external_message_id', 191)->nullable();
            $table->string('error_code', 80)->nullable();
            $table->text('error_message')->nullable();
            $table->json('provider_response')->nullable();
            $table->json('metadata')->nullable();
            $table->dateTime('queued_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->dateTime('opened_at')->nullable();
            $table->dateTime('clicked_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->dateTime('bounced_at')->nullable();
            $table->dateTime('skipped_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->uuid('sms_log_id')->nullable();
            $table->index(['contact_id', 'channel'], 'campaign_send_logs_contact_id_channel_index');
            $table->index(['campaign_id', 'channel', 'status'], 'campaign_send_logs_campaign_id_channel_status_index');
        });

        Schema::create('campaign_sms_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->string('title', 180);
            $table->string('code', 80)->nullable();
            $table->string('sender_id', 60)->nullable();
            $table->text('body')->nullable();
            $table->unsignedInteger('character_count')->default('0');
            $table->unsignedInteger('segment_count')->default('0');
            $table->string('status', 30)->default('draft');
            $table->string('send_mode', 30)->default('draft');
            $table->dateTime('scheduled_at')->nullable();
            $table->string('timezone', 80)->nullable();
            $table->unsignedInteger('delay_minutes')->nullable();
            $table->unsignedInteger('send_order')->default('1');
            $table->boolean('is_active')->default(true);
            $table->string('priority', 30)->default('normal');
            $table->text('notes')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();
            $table->uuid('sms_config_id')->nullable();
            $table->string('provider_override', 40)->nullable();
            $table->index(['campaign_id', 'status', 'scheduled_at'], 'campaign_sms_messages_campaign_id_status_scheduled_at_index');
            $table->unique(['campaign_id', 'code'], 'campaign_sms_messages_campaign_id_code_unique');
        });

        Schema::create('campaign_sms_recipients', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->uuid('campaign_sms_message_id');
            $table->uuid('contact_id')->nullable();
            $table->uuid('contact_group_id')->nullable();
            $table->string('name', 180)->nullable();
            $table->string('company_name', 180)->nullable();
            $table->string('email', 180)->nullable();
            $table->string('phone', 80);
            $table->string('source', 40)->default('manual');
            $table->boolean('is_valid_phone')->default(true);
            $table->boolean('is_unsubscribed')->default(false);
            $table->string('status', 30)->default('ready');
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->string('last_log_status', 30)->nullable();
            $table->timestamps();
            $table->index(['campaign_id', 'status', 'source'], 'campaign_sms_recipients_campaign_id_status_source_index');
            $table->unique(['campaign_sms_message_id', 'phone'], 'campaign_sms_recipients_unique_phone');
        });

        Schema::create('cash_transfer_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('cash_transfer_id');
            $table->uuid('to_account_id');
            $table->decimal('exchange_rate_to_default', 16, 6)->default('1');
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('description', 200)->nullable();
            $table->timestamps();
        });

        Schema::create('cash_transfers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('transfer_no', 40)->nullable();
            $table->date('transfer_date');
            $table->uuid('from_account_id');
            $table->string('reference', 120)->nullable();
            $table->uuid('currency_id');
            $table->decimal('total_amount', 16, 2)->default('0');
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unique(['transfer_no'], 'cash_transfers_transfer_no_unique');
            $table->index(['status'], 'cash_transfers_status_global_search_idx');
            $table->index(['branch_id'], 'cash_transfers_branch_id_global_search_idx');
        });

        Schema::create('chart_of_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('account_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('type')->default('asset');
            $table->string('code', 30)->nullable();
            $table->string('name', 150);
            $table->uuid('parent_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['name'], 'chart_of_accounts_name_global_search_idx');
            $table->index(['branch_id'], 'chart_of_accounts_branch_id_global_search_idx');
            $table->unique(['code'], 'chart_of_accounts_code_unique');
        });

        Schema::create('cheque_format_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country', 100);
            $table->string('format_name', 150);
            $table->string('paper_size', 50)->nullable();
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->string('date_position', 120)->nullable();
            $table->string('payee_name_position', 120)->nullable();
            $table->string('amount_number_position', 120)->nullable();
            $table->string('amount_words_position', 120)->nullable();
            $table->string('signature_position', 120)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->json('layout_json')->nullable();
            $table->longText('signature_image')->nullable();
            $table->unsignedInteger('signature_width')->nullable();
            $table->unsignedInteger('signature_height')->nullable();
            $table->index(['country', 'active'], 'cheque_format_configurations_country_active_index');
        });

        Schema::create('cheque_registers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('cheque_no', 80);
            $table->date('cheque_date');
            $table->date('issued_date');
            $table->date('received_date')->nullable();
            $table->string('payee_name', 150)->nullable();
            $table->date('cleared_date')->nullable();
            $table->string('direction')->default('issued');
            $table->uuid('account_id');
            $table->uuid('related_account_id')->nullable();
            $table->uuid('receiver_related_account_id')->nullable();
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->index(['status'], 'cheque_registers_status_global_search_idx');
            $table->index(['cheque_no'], 'cheque_registers_cheque_no_global_search_idx');
            $table->index(['branch_id'], 'cheque_registers_branch_id_global_search_idx');
        });

        Schema::create('contact_groups', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->uuid('parent_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('contacts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('contact_group_id')->nullable();
            $table->uuid('account_id')->nullable();
            $table->string('contact_type')->default('customer');
            $table->string('tax_registration_no', 80)->nullable();
            $table->string('tax_registration_type')->nullable();
            $table->string('name', 180);
            $table->string('code', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('pan', 80)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->boolean('accept_purchase')->default(false);
            $table->uuid('credit_term_id')->nullable();
            $table->decimal('credit_limit', 16, 2)->nullable()->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('crm_account_id')->nullable();
            $table->uuid('payable_account_id')->nullable();
            $table->string('image')->nullable();
            $table->index(['tax_registration_no'], 'contacts_tax_registration_no_global_search_idx');
            $table->index(['phone'], 'contacts_phone_global_search_idx');
            $table->index(['pan'], 'contacts_pan_global_search_idx');
            $table->index(['name'], 'contacts_name_global_search_idx');
            $table->index(['email'], 'contacts_email_global_search_idx');
            $table->index(['crm_account_id'], 'contacts_crm_account_id_index');
            $table->index(['code'], 'contacts_code_global_search_idx');
        });

        Schema::create('credit_terms', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->unsignedSmallInteger('days')->default('0');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('account_no', 40)->nullable();
            $table->string('name', 180);
            $table->string('legal_name', 180)->nullable();
            $table->string('industry', 120)->nullable();
            $table->string('website', 180)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            $table->uuid('parent_account_id')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->string('status')->default('prospect');
            $table->string('segment', 80)->nullable();
            $table->string('source', 80)->nullable();
            $table->decimal('annual_revenue', 18, 2)->nullable();
            $table->unsignedInteger('employee_count')->nullable();
            $table->decimal('credit_limit', 18, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->unique(['account_no'], 'crm_accounts_account_no_unique');
            $table->index(['name', 'email'], 'crm_accounts_name_email_index');
            $table->index(['owner_id', 'status'], 'crm_accounts_owner_id_status_index');
            $table->index(['branch_id', 'status'], 'crm_accounts_branch_id_status_index');
        });

        Schema::create('crm_activities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('lead_id')->nullable();
            $table->uuid('deal_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->string('activity_type')->default('task');
            $table->string('subject', 180);
            $table->text('description')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->string('status')->default('pending');
            $table->string('priority')->default('medium');
            $table->string('outcome', 255)->nullable();
            $table->dateTime('next_follow_up_at')->nullable();
            $table->dateTime('reminder_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('crm_account_id')->nullable();
            $table->dateTime('escalated_at')->nullable();
            $table->integer('escalated_to')->nullable();
            $table->string('escalation_reason', 255)->nullable();
            $table->index(['assigned_to_id', 'due_at', 'status'], 'crm_activities_assigned_to_id_due_at_status_index');
            $table->index(['crm_account_id', 'status'], 'crm_activities_crm_account_id_status_index');
        });

        Schema::create('crm_activity_comments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('crm_activity_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('comment');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_activity_escalations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->unsignedBigInteger('escalated_to')->nullable();
            $table->unsignedBigInteger('escalated_by')->nullable();
            $table->dateTime('escalated_at');
            $table->string('reason', 255);
            $table->string('status')->default('open');
            $table->timestamps();
            $table->index(['status', 'escalated_at'], 'crm_activity_escalations_status_escalated_at_index');
        });

        Schema::create('crm_attributions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id')->nullable();
            $table->uuid('lead_id')->nullable();
            $table->uuid('deal_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->string('source', 80)->nullable();
            $table->string('medium', 80)->nullable();
            $table->decimal('value', 18, 2)->nullable();
            $table->decimal('revenue', 18, 2)->nullable();
            $table->decimal('cost', 18, 2)->nullable();
            $table->timestamps();
            $table->index(['lead_id', 'deal_id'], 'crm_attributions_lead_id_deal_id_index');
            $table->index(['campaign_id', 'source'], 'crm_attributions_campaign_id_source_index');
        });

        Schema::create('crm_campaigns', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 180);
            $table->string('code', 60)->nullable();
            $table->string('source', 80)->nullable();
            $table->string('medium', 80)->nullable();
            $table->decimal('budget', 18, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();
            $table->text('description')->nullable();
            $table->unsignedInteger('target_customers')->nullable();
            $table->unsignedInteger('email_only_quantity')->nullable();
            $table->unsignedInteger('sms_only_quantity')->nullable();
            $table->uuid('contact_group_id')->nullable();
            $table->string('email_subject', 255)->nullable();
            $table->string('email_preview_text', 255)->nullable();
            $table->longText('email_body')->nullable();
            $table->text('sms_body')->nullable();
            $table->json('rules')->nullable();
            $table->string('type', 30)->default('email_sms');
            $table->string('default_sender_name', 180)->nullable();
            $table->string('default_sender_email', 180)->nullable();
            $table->string('default_reply_to_email', 180)->nullable();
            $table->string('default_sms_sender_id', 60)->nullable();
            $table->string('priority', 30)->default('normal');
            $table->json('tags')->nullable();
            $table->text('internal_remarks')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->index(['source', 'medium'], 'crm_campaigns_source_medium_index');
            $table->unique(['code'], 'crm_campaigns_code_unique');
            $table->index(['branch_id', 'status'], 'crm_campaigns_branch_id_status_index');
        });

        Schema::create('crm_communications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('account_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('lead_id')->nullable();
            $table->uuid('deal_id')->nullable();
            $table->string('type')->default('note');
            $table->string('direction')->default('internal');
            $table->string('subject', 180)->nullable();
            $table->text('body')->nullable();
            $table->string('external_message_id', 180)->nullable();
            $table->string('from', 180)->nullable();
            $table->string('to', 500)->nullable();
            $table->string('cc', 500)->nullable();
            $table->string('sentiment')->nullable();
            $table->dateTime('communication_date')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['deal_id', 'communication_date'], 'crm_communications_deal_id_communication_date_index');
            $table->index(['lead_id', 'communication_date'], 'crm_communications_lead_id_communication_date_index');
            $table->index(['contact_id', 'communication_date'], 'crm_communications_contact_id_communication_date_index');
            $table->index(['account_id', 'communication_date'], 'crm_communications_account_id_communication_date_index');
        });

        Schema::create('crm_contact_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('account_id');
            $table->uuid('contact_id');
            $table->uuid('deal_id')->nullable();
            $table->string('role')->default('other');
            $table->boolean('is_primary')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['deal_id', 'role'], 'crm_contact_roles_deal_id_role_index');
            $table->index(['account_id', 'role'], 'crm_contact_roles_account_id_role_index');
        });

        Schema::create('crm_customer_health_scores', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('account_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->unsignedTinyInteger('score')->default('50');
            $table->string('status')->default('neutral');
            $table->text('reason')->nullable();
            $table->string('last_payment_status', 80)->nullable();
            $table->unsignedInteger('open_invoice_count')->default('0');
            $table->decimal('overdue_invoice_amount', 18, 2)->default('0');
            $table->unsignedInteger('open_activity_count')->default('0');
            $table->dateTime('last_interaction_at')->nullable();
            $table->dateTime('calculated_at')->nullable();
            $table->timestamps();
            $table->index(['contact_id', 'status'], 'crm_customer_health_scores_contact_id_status_index');
            $table->index(['account_id', 'status'], 'crm_customer_health_scores_account_id_status_index');
        });

        Schema::create('crm_deal_stage_histories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_id');
            $table->uuid('from_stage_id')->nullable();
            $table->uuid('to_stage_id')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->dateTime('changed_at');
            $table->unsignedInteger('days_in_previous_stage')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->string('event_type')->nullable()->default('stage_change');
            $table->string('to_status')->nullable();
            $table->index(['to_stage_id', 'changed_at'], 'crm_deal_stage_histories_to_stage_id_changed_at_index');
            $table->index(['deal_id', 'changed_at'], 'crm_deal_stage_histories_deal_id_changed_at_index');
        });

        Schema::create('crm_notes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('notable_type');
            $table->uuid('notable_id');
            $table->text('note');
            $table->string('visibility')->default('internal');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['notable_type', 'notable_id'], 'crm_notes_notable_type_notable_id_index');
        });

        Schema::create('crm_sequence_steps', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('sequence_id');
            $table->unsignedInteger('step_order')->default('1');
            $table->string('action_type')->default('task');
            $table->unsignedInteger('delay_days')->default('0');
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->text('template')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['sequence_id', 'step_order'], 'crm_sequence_steps_sequence_id_step_order_index');
        });

        Schema::create('crm_sequences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 180);
            $table->text('description')->nullable();
            $table->string('target_type')->default('lead');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['branch_id', 'target_type', 'active'], 'crm_sequences_branch_id_target_type_active_index');
        });

        Schema::create('currencies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 10);
            $table->string('name', 80);
            $table->string('symbol', 20)->nullable();
            $table->unsignedTinyInteger('decimal_places')->default('2');
            $table->boolean('is_base')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->decimal('exchange_rate', 18, 4)->default('1');
            $table->index(['name'], 'currencies_name_global_search_idx');
            $table->unique(['code'], 'currencies_code_unique');
        });

        Schema::create('custom_field_choices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('custom_field_id');
            $table->string('label', 120);
            $table->string('value', 120);
            $table->string('color', 20)->nullable();
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('custom_field_modules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('custom_field_id');
            $table->string('module');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('custom_field_validations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('custom_field_id');
            $table->string('rule');
            $table->string('value', 255)->nullable();
            $table->string('message', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('custom_field_values', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('custom_field_id');
            $table->string('module');
            $table->uuid('record_id');
            $table->longText('value')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();
            $table->unique(['custom_field_id', 'module', 'record_id'], 'custom_field_values_custom_field_id_module_record_id_unique');
        });

        Schema::create('custom_fields', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('key', 120);
            $table->string('field_type');
            $table->string('placeholder', 180)->nullable();
            $table->string('help_text', 255)->nullable();
            $table->string('default_value', 255)->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['key'], 'custom_fields_key_unique');
        });

        Schema::create('custom_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('purpose', 80)->nullable();
            $table->longText('content')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('template_key')->nullable();
        });

        Schema::create('customer_payment_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('customer_payment_id');
            $table->uuid('invoice_id');
            $table->decimal('allocated_amount', 16, 2)->default('0');
            $table->timestamps();
        });

        Schema::create('customer_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('payment_no', 40)->nullable();
            $table->date('payment_date');
            $table->uuid('contact_id');
            $table->uuid('account_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('payment_method', 20)->nullable();
            $table->uuid('bank_charges_account_id')->nullable();
            $table->decimal('bank_charges', 16, 2)->nullable()->default('0');
            $table->uuid('tds_charges_account_id')->nullable();
            $table->string('tds_type', 20)->nullable();
            $table->decimal('tds_charges', 16, 2)->nullable()->default('0');
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'customer_payments_status_global_search_idx');
            $table->unique(['payment_no'], 'customer_payments_payment_no_unique');
            $table->index(['contact_id'], 'customer_payments_contact_id_global_search_idx');
            $table->index(['branch_id'], 'customer_payments_branch_id_global_search_idx');
        });

        Schema::create('deal_pipelines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('deal_stages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_pipeline_id');
            $table->string('name', 120);
            $table->string('color', 20)->nullable();
            $table->unsignedTinyInteger('probability')->default('0');
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('is_won_stage')->default(false);
            $table->boolean('is_lost_stage')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('deals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('deal_no', 40)->nullable();
            $table->uuid('lead_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('deal_pipeline_id')->nullable();
            $table->uuid('deal_stage_id')->nullable();
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->string('title', 180);
            $table->decimal('amount', 16, 2)->nullable();
            $table->date('expected_close_date')->nullable();
            $table->date('closed_date')->nullable();
            $table->unsignedTinyInteger('probability')->nullable();
            $table->string('source', 80)->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('open');
            $table->string('lost_reason', 255)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('crm_account_id')->nullable();
            $table->boolean('committed')->default(false);
            $table->string('campaign_id')->nullable();
            $table->index(['campaign_id'], 'deals_campaign_id_index');
            $table->index(['expected_close_date', 'status'], 'deals_expected_close_date_status_index');
            $table->index(['deal_stage_id', 'updated_at'], 'deals_deal_stage_id_updated_at_index');
            $table->index(['assigned_to_id', 'status'], 'deals_assigned_to_id_status_index');
            $table->index(['crm_account_id', 'status'], 'deals_crm_account_id_status_index');
            $table->unique(['deal_no'], 'deals_deal_no_unique');
        });

        Schema::create('debit_note_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('debit_note_id');
            $table->uuid('product_id')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->string('product_name', 255)->nullable();
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->string('discount_type')->default('percent');
            $table->decimal('discount_amount', 18, 4)->default('0');
        });

        Schema::create('debit_notes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('debit_note_no', 40)->nullable();
            $table->date('debit_note_date');
            $table->uuid('contact_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'debit_notes_status_global_search_idx');
            $table->unique(['debit_note_no'], 'debit_notes_debit_note_no_unique');
            $table->index(['contact_id'], 'debit_notes_contact_id_global_search_idx');
            $table->index(['branch_id'], 'debit_notes_branch_id_global_search_idx');
        });

        Schema::create('departments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('designation_histories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('designation_id')->nullable();
            $table->dateTime('start_date');
            $table->dateTime('end_date')->nullable();
            $table->string('comment', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('designations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('department_id')->nullable();
            $table->string('code', 40)->nullable();
            $table->string('level', 50)->nullable();
            $table->string('grade', 50)->nullable();
            $table->integer('sort_order')->default('100');
            $table->decimal('default_basic_salary', 10, 2)->nullable();
            $table->string('salary_frequency', 20)->default('monthly');
            $table->uuid('default_salary_structure_id')->nullable();
            $table->boolean('overtime_eligible')->default(false);
            $table->boolean('taxable')->default(true);
            $table->unique(['code'], 'designations_code_unique');
            $table->unique(['name'], 'designations_name_unique');
        });

        Schema::create('document_entity_matches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('document_upload_id');
            $table->uuid('document_extraction_id')->nullable();
            $table->string('entity_type', 60);
            $table->string('extracted_name')->nullable();
            $table->string('matched_model', 120)->nullable();
            $table->uuid('matched_id')->nullable();
            $table->string('match_status')->default('unmatched');
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->json('options')->nullable();
            $table->uuid('created_record_id')->nullable();
            $table->timestamps();
            $table->index(['match_status'], 'document_entity_matches_match_status_index');
            $table->index(['document_upload_id', 'entity_type'], 'document_entity_matches_document_upload_id_entity_type_index');
        });

        Schema::create('document_extractions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('public_id')->unique();
            $table->uuid('document_upload_id');
            $table->string('provider', 60)->nullable();
            $table->string('model', 120)->nullable();
            $table->longText('raw_text')->nullable();
            $table->json('extracted_json')->nullable();
            $table->json('normalized_json')->nullable();
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->string('status')->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status'], 'document_extractions_status_index');
            $table->index(['document_upload_id'], 'document_extractions_document_upload_id_index');
        });

        Schema::create('document_links', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('document_upload_id');
            $table->string('linkable_type', 120);
            $table->uuid('linkable_id');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['document_upload_id'], 'document_links_document_upload_id_index');
            $table->index(['linkable_type', 'linkable_id'], 'document_links_linkable_type_linkable_id_index');
        });

        Schema::create('document_numberings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('document_type');
            $table->string('prefix', 20)->nullable();
            $table->unsignedBigInteger('next_number')->default(1);
            $table->string('type_of_account')->default('auto_numbering');
            $table->boolean('reset_every_fiscal_year')->default(false);
            $table->boolean('add_fiscal_year_in_code')->default(false);
            $table->boolean('enable_fiscal_year_next_number')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['prefix'], 'document_numberings_prefix_global_search_idx');
            $table->index(['document_type'], 'document_numberings_document_type_global_search_idx');
        });

        Schema::create('document_transaction_proposals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('document_upload_id');
            $table->uuid('document_extraction_id')->nullable();
            $table->string('transaction_type', 60);
            $table->string('status', 32)->default('draft');
            $table->json('payload');
            $table->json('missing_fields')->nullable();
            $table->json('warnings')->nullable();
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->string('created_record_type', 120)->nullable();
            $table->uuid('created_record_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
            $table->index(['transaction_type', 'status'], 'document_transaction_proposals_transaction_type_status_index');
            $table->index(['document_upload_id'], 'document_transaction_proposals_document_upload_id_index');
        });

        Schema::create('document_uploads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('public_id')->unique();
            $table->string('label');
            $table->string('original_file_name');
            $table->string('file_path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('file_hash')->nullable();
            $table->string('document_type')->default('unknown');
            $table->string('status')->default('uploaded');
            $table->uuid('branch_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'status'], 'document_uploads_branch_id_status_index');
            $table->index(['file_hash'], 'document_uploads_file_hash_index');
            $table->index(['document_type'], 'document_uploads_document_type_index');
            $table->index(['status'], 'document_uploads_status_index');
        });

        Schema::create('education', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('degree', 120);
            $table->string('institution', 180);
            $table->string('field_of_study', 120);
            $table->string('result', 60);
            $table->dateTime('study_start_date');
            $table->dateTime('study_end_date')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('email_configs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('email_config_name', 120);
            $table->string('email_host', 150);
            $table->string('email_port', 20);
            $table->string('email_user', 150);
            $table->string('email_pass', 255);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('branch_id')->nullable();
            $table->string('mailer', 40)->default('smtp');
            $table->string('encryption', 20)->nullable();
            $table->string('from_name', 120)->nullable();
            $table->string('from_address', 180)->nullable();
        });

        Schema::create('email_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('module', 80);
            $table->string('template_key', 120);
            $table->string('subject', 180);
            $table->longText('body')->nullable();
            $table->json('variables')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['template_key'], 'email_templates_template_key_unique');
        });

        Schema::create('emails', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('sender_email', 150);
            $table->string('receiver_email', 150);
            $table->string('subject', 255)->nullable();
            $table->longText('body')->nullable();
            $table->string('email_status', 30)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_additions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('component_id');
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->string('calculation_type')->default('fixed');
            $table->boolean('recurring')->default(false);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->uuid('consumed_payslip_id')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'active'], 'employee_additions_branch_id_active_index');
            $table->index(['employee_id', 'active'], 'employee_additions_employee_id_active_index');
        });

        Schema::create('employee_deductions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('component_id');
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->string('calculation_type')->default('fixed');
            $table->boolean('recurring')->default(false);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->uuid('consumed_payslip_id')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'active'], 'employee_deductions_branch_id_active_index');
            $table->index(['employee_id', 'active'], 'employee_deductions_employee_id_active_index');
        });

        Schema::create('employee_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('branch_id')->nullable();
            $table->string('title', 180);
            $table->string('document_type', 80)->nullable();
            $table->string('file_path', 500)->nullable();
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('employment_status_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->uuid('designation_id')->nullable();
            $table->uuid('shift_id')->nullable();
            $table->uuid('leave_policy_id')->nullable();
            $table->uuid('weekly_holiday_id')->nullable();
            $table->string('employee_id', 60)->nullable();
            $table->dateTime('join_date')->nullable();
            $table->dateTime('leave_date')->nullable();
            $table->decimal('salary', 16, 2)->default('0');
            $table->string('blood_group', 10)->nullable();
            $table->string('emergency_contact_name', 120)->nullable();
            $table->string('emergency_contact_phone', 40)->nullable();
            $table->text('address')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_reimbursements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('branch_id')->nullable();
            $table->date('date');
            $table->string('expense_category', 120);
            $table->decimal('amount', 16, 2);
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 16, 6)->default('1');
            $table->decimal('base_currency_amount', 16, 2)->default('0');
            $table->text('description')->nullable();
            $table->string('attachment')->nullable();
            $table->string('status')->default('draft');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('void_reason')->nullable();
            $table->string('payment_reference')->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('payroll_run_id')->nullable();
            $table->uuid('payslip_id')->nullable();
            $table->boolean('include_in_payroll')->default(true);
            $table->timestamps();
            $table->index(['branch_id', 'status'], 'employee_reimbursements_branch_id_status_index');
            $table->index(['employee_id', 'status'], 'employee_reimbursements_employee_id_status_index');
        });

        Schema::create('employment_statuses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('colour_value', 30);
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['name'], 'employment_statuses_name_unique');
        });

        Schema::create('expense_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('expense_id');
            $table->uuid('chart_of_account_id');
            $table->string('description', 200)->nullable();
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('amount', 16, 2)->default('0');
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('expense_no', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->date('expense_date');
            $table->date('due_date')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->uuid('tds_charges_account_id')->nullable();
            $table->string('tds_type', 20)->nullable();
            $table->decimal('tds_charges', 16, 2)->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'expenses_status_global_search_idx');
            $table->unique(['expense_no'], 'expenses_expense_no_unique');
            $table->index(['contact_id'], 'expenses_contact_id_global_search_idx');
            $table->index(['branch_id'], 'expenses_branch_id_global_search_idx');
        });

        Schema::create('failed_jobs', function (Blueprint $table): void {
            $table->id();
            $table->string('uuid');
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
            $table->unique(['uuid'], 'failed_jobs_uuid_unique');
        });

        Schema::create('fiscal_years', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 80);
            $table->string('code', 40)->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status')->default('DRAFT');
            $table->date('lock_date')->nullable();
            $table->boolean('is_current')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'fiscal_years_code_unique');
        });

        Schema::create('general_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('key', 120);
            $table->longText('value')->nullable();
            $table->string('group', 80)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('hrm_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->decimal('default_working_hours_per_day', 5, 2)->default('8');
            $table->unsignedTinyInteger('default_working_days_per_week')->default('6');
            $table->unsignedSmallInteger('attendance_grace_period_minutes')->default('10');
            $table->decimal('half_day_threshold_hours', 5, 2)->default('4');
            $table->boolean('overtime_enabled')->default(false);
            $table->decimal('overtime_rate_multiplier', 6, 2)->default('1.5');
            $table->boolean('attendance_correction_enabled')->default(true);
            $table->unsignedTinyInteger('leave_year_start_month')->default('4');
            $table->unsignedTinyInteger('payroll_day')->default('30');
            $table->unsignedSmallInteger('probation_period_days')->default('90');
            $table->json('weekend_days')->nullable();
            $table->boolean('require_leave_approval')->default(true);
            $table->boolean('require_attendance_approval')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_adjustment_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('inventory_adjustment_id');
            $table->uuid('product_id');
            $table->string('adjustment_type')->default('increase');
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_cost', 16, 2)->default('0');
            $table->string('remarks', 200)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_adjustments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('adjustment_no', 40)->nullable();
            $table->date('adjustment_date');
            $table->uuid('warehouse_id');
            $table->string('reason', 150)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->boolean('stock_posted')->default(false);
            $table->timestamp('stock_posted_at')->nullable();
            $table->string('source_type', 80)->nullable();
            $table->uuid('source_id')->nullable();
            $table->boolean('is_system_generated')->default(false);
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'inventory_adjustments_status_global_search_idx');
            $table->index(['branch_id'], 'inventory_adjustments_branch_id_global_search_idx');
            $table->unique(['adjustment_no'], 'inventory_adjustments_adjustment_no_unique');
            $table->index(['source_type', 'source_id'], 'ia_source_type_id_index');
        });

        Schema::create('inventory_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('default_warehouse_id')->nullable();
            $table->string('stock_valuation_method')->default('FIFO');
            $table->boolean('negative_stock_allowed')->default(false);
            $table->boolean('low_stock_alert_enabled')->default(true);
            $table->unsignedInteger('default_low_stock_threshold')->default('10');
            $table->string('product_code_prefix', 20)->default('PROD');
            $table->boolean('auto_generate_product_code')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_ledgers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('warehouse_id');
            $table->uuid('product_id');
            $table->date('transaction_date');
            $table->string('source_type', 80);
            $table->uuid('source_id');
            $table->string('source_no', 80)->nullable();
            $table->string('movement_type', 80);
            $table->decimal('qty_in', 18, 4)->default('0');
            $table->decimal('qty_out', 18, 4)->default('0');
            $table->decimal('unit_cost', 18, 6)->default('0');
            $table->decimal('value_in', 18, 6)->default('0');
            $table->decimal('value_out', 18, 6)->default('0');
            $table->decimal('balance_qty', 18, 4)->default('0');
            $table->decimal('balance_value', 18, 6)->default('0');
            $table->string('description', 255)->nullable();
            $table->boolean('is_reversal')->default(false);
            $table->uuid('reverses_ledger_id')->nullable();
            $table->timestamps();
            $table->index(['warehouse_id', 'product_id', 'transaction_date'], 'inventory_ledgers_warehouse_id_product_id_transaction_date_index');
            $table->index(['source_type', 'source_id'], 'inventory_ledgers_source_type_source_id_index');
            $table->index(['branch_id', 'transaction_date'], 'inventory_ledgers_branch_id_transaction_date_index');
        });

        Schema::create('invoice_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->decimal('discount_amount', 15, 2)->default('0');
            $table->string('discount_type')->default('percent');
        });

        Schema::create('invoice_payment_links', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->string('public_token');
            $table->timestamp('expires_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamps();
            $table->unique(['public_token'], 'invoice_payment_links_public_token_unique');
            $table->index(['invoice_id'], 'invoice_payment_links_invoice_id_index');
            $table->index(['public_token'], 'invoice_payment_links_public_token_index');
        });

        Schema::create('invoices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('invoice_no', 40)->nullable();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->uuid('contact_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('paid_total', 16, 2)->default('0');
            $table->decimal('balance_due', 16, 2)->default('0');
            $table->string('export_country', 80)->nullable();
            $table->date('export_date')->nullable();
            $table->string('export_document_number', 80)->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->uuid('project_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'invoices_status_global_search_idx');
            $table->unique(['invoice_no'], 'invoices_invoice_no_unique');
            $table->index(['contact_id'], 'invoices_contact_id_global_search_idx');
            $table->index(['branch_id'], 'invoices_branch_id_global_search_idx');
        });

        Schema::create('job_batches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        Schema::create('jobs', function (Blueprint $table): void {
            $table->id();
            $table->string('queue');
            $table->longText('payload');
            $table->unsignedSmallInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
            $table->index(['queue'], 'jobs_queue_index');
        });

        Schema::create('journal_voucher_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('journal_voucher_id');
            $table->uuid('chart_of_account_id');
            $table->string('description', 200)->nullable();
            $table->decimal('debit', 16, 2)->default('0');
            $table->decimal('credit', 16, 2)->default('0');
            $table->timestamps();
            $table->uuid('account_id')->nullable();
            $table->decimal('foreign_debit', 16, 2)->default('0');
            $table->decimal('foreign_credit', 16, 2)->default('0');
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
        });

        Schema::create('journal_vouchers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('voucher_no', 40)->nullable();
            $table->date('voucher_date');
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('narration')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('source_type')->nullable();
            $table->string('source_id')->nullable();
            $table->string('source_no', 40)->nullable();
            $table->string('source_module', 100)->nullable();
            $table->boolean('is_auto_generated')->default(false);
            $table->uuid('reversed_journal_voucher_id')->nullable();
            $table->text('reversal_reason')->nullable();
            $table->dateTime('reversed_at')->nullable();
            $table->boolean('is_system_generated')->default(false);
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->unique(['voucher_no'], 'journal_vouchers_voucher_no_unique');
            $table->index(['status'], 'journal_vouchers_status_global_search_idx');
            $table->index(['source_type', 'source_id'], 'journal_vouchers_source_type_source_id_index');
            $table->index(['source_type'], 'journal_vouchers_source_type_index');
            $table->index(['source_id'], 'journal_vouchers_source_id_index');
            $table->index(['branch_id'], 'journal_vouchers_branch_id_global_search_idx');
        });

        Schema::create('languages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 12);
            $table->string('name', 80);
            $table->string('native_name', 80);
            $table->string('direction')->default('ltr');
            $table->string('date_locale', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_system')->default(false);
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->json('translations')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'languages_code_unique');
            $table->index(['is_active', 'sort_order'], 'languages_is_active_sort_order_index');
        });

        Schema::create('leads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('lead_no', 40)->nullable();
            $table->uuid('contact_id')->nullable();
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->uuid('converted_contact_id')->nullable();
            $table->uuid('converted_deal_id')->nullable();
            $table->string('name', 180);
            $table->string('company_name', 180)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('mobile', 40)->nullable();
            $table->string('website', 180)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 80)->nullable();
            $table->string('state', 80)->nullable();
            $table->string('country', 80)->nullable();
            $table->string('lead_source', 80)->nullable();
            $table->string('industry', 120)->nullable();
            $table->decimal('expected_value', 16, 2)->nullable();
            $table->string('status')->default('new');
            $table->string('priority')->default('medium');
            $table->dateTime('next_follow_up_date')->nullable();
            $table->dateTime('last_contacted_at')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('converted_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('crm_account_id')->nullable();
            $table->string('lost_reason')->nullable();
            $table->string('deal_pipeline_id')->nullable();
            $table->dateTime('next_follow_up_at')->nullable();
            $table->string('campaign_id')->nullable();
            $table->index(['campaign_id'], 'leads_campaign_id_index');
            $table->index(['deal_pipeline_id'], 'leads_deal_pipeline_id_index');
            $table->index(['status', 'created_at'], 'leads_status_created_at_index');
            $table->index(['assigned_to_id', 'next_follow_up_date'], 'leads_assigned_to_id_next_follow_up_date_index');
            $table->index(['crm_account_id', 'status'], 'leads_crm_account_id_status_index');
            $table->unique(['lead_no'], 'leads_lead_no_unique');
        });

        Schema::create('leave_applications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->string('leave_type', 60);
            $table->dateTime('leave_from');
            $table->dateTime('leave_to');
            $table->dateTime('accept_leave_from')->nullable();
            $table->dateTime('accept_leave_to')->nullable();
            $table->unsignedBigInteger('accept_leave_by')->nullable();
            $table->integer('leave_duration')->nullable();
            $table->string('reason', 255)->nullable();
            $table->string('review_comment', 255)->nullable();
            $table->string('attachment', 255)->nullable();
            $table->string('status')->default('PENDING');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('leave_policy_id')->nullable();
            $table->string('leave_type_id')->nullable();
            $table->index(['status'], 'leave_applications_status_global_search_idx');
            $table->index(['leave_type'], 'leave_applications_leave_type_global_search_idx');
            $table->index(['user_id'], 'leave_applications_user_id_global_search_idx');
            $table->index(['branch_id'], 'leave_applications_branch_id_global_search_idx');
        });

        Schema::create('leave_policies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->integer('paid_leave_count')->default('0');
            $table->integer('unpaid_leave_count')->default('0');
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['name'], 'leave_policies_name_unique');
        });

        Schema::create('leave_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 120);
            $table->string('code', 40)->nullable();
            $table->integer('max_days_per_year')->nullable();
            $table->boolean('requires_approval')->default(true);
            $table->boolean('is_paid')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'leave_types_code_unique');
        });

        Schema::create('loan_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('bank_name', 150)->nullable();
            $table->string('loan_number', 80)->nullable();
            $table->text('description')->nullable();
            $table->decimal('opening_balance', 18, 6)->default('0');
            $table->decimal('current_balance', 18, 6)->default('0');
            $table->date('balance_as_of')->nullable();
            $table->uuid('loan_received_in_account_id')->nullable();
            $table->uuid('related_account_id')->nullable();
            $table->decimal('interest_rate_per_annum', 8, 4)->default('0');
            $table->unsignedSmallInteger('duration_in_month')->default('0');
            $table->decimal('processing_fee', 18, 6)->default('0');
            $table->uuid('processing_fee_paid_from_account_id')->nullable();
            $table->string('status')->default('active');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'loan_accounts_status_global_search_idx');
            $table->index(['name'], 'loan_accounts_name_global_search_idx');
            $table->index(['loan_number'], 'loan_accounts_loan_number_global_search_idx');
        });

        Schema::create('loan_charges', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('loan_account_id');
            $table->string('charge_name', 150);
            $table->date('charge_date');
            $table->decimal('amount', 18, 6)->default('0');
            $table->uuid('charges_paid_from_account_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('charge_no', 40)->nullable();
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->string('status')->default('draft');
            $table->unique(['charge_no'], 'loan_charges_charge_no_unique');
        });

        Schema::create('loan_paybacks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('loan_account_id');
            $table->date('payback_date');
            $table->decimal('amount', 18, 6)->default('0');
            $table->uuid('paid_from_account_id');
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->uuid('journal_voucher_id')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_top_ups', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('loan_account_id');
            $table->date('topup_date');
            $table->uuid('loan_received_in_account_id');
            $table->decimal('amount', 18, 6)->default('0');
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('topup_no', 40)->nullable();
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->string('status')->default('draft');
            $table->unique(['topup_no'], 'loan_top_ups_topup_no_unique');
        });

        Schema::create('master_data', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->string('group', 80);
            $table->string('key', 120);
            $table->string('value', 180);
            $table->json('meta')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('milestones', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->string('name', 180);
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->text('description');
            $table->string('status')->default('PENDING');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['status'], 'milestones_status_global_search_idx');
            $table->index(['name'], 'milestones_name_global_search_idx');
            $table->index(['project_id'], 'milestones_project_id_global_search_idx');
        });

        Schema::create('model_has_permissions', function (Blueprint $table): void {
            $table->uuid('permission_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->primary(['permission_id', 'model_id', 'model_type']);
            $table->index(['model_id', 'model_type'], 'model_has_permissions_model_id_model_type_index');
        });

        Schema::create('model_has_roles', function (Blueprint $table): void {
            $table->uuid('role_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->primary(['role_id', 'model_id', 'model_type']);
            $table->index(['model_id', 'model_type'], 'model_has_roles_model_id_model_type_index');
        });

        Schema::create('onboarding_checklists', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('branch_id')->nullable();
            $table->string('type')->default('ONBOARDING');
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->string('status')->default('PENDING');
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('online_payment_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->boolean('enable_online_payment')->default(false);
            $table->boolean('allow_public_invoice_payment')->default(false);
            $table->boolean('allow_partial_invoice_payment')->default(false);
            $table->boolean('allow_invoice_overpayment')->default(false);
            $table->decimal('minimum_partial_payment_amount', 15, 2)->nullable();
            $table->unsignedInteger('payment_link_expiry_days')->nullable();
            $table->string('default_gateway', 40)->nullable();
            $table->boolean('receipt_email_enabled')->default(true);
            $table->boolean('webhook_logging_enabled')->default(true);
            $table->boolean('enable_google_login')->default(false);
            $table->string('google_client_id', 255)->nullable();
            $table->text('google_client_secret_encrypted')->nullable();
            $table->string('google_redirect_uri', 500)->nullable();
            $table->string('google_allowed_domains', 500)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('online_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id')->nullable();
            $table->uuid('customer_payment_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->string('provider', 40);
            $table->string('provider_payment_id', 255)->nullable();
            $table->string('provider_order_id', 255)->nullable();
            $table->string('provider_session_id', 255)->nullable();
            $table->string('public_token', 64)->nullable();
            $table->decimal('amount', 15, 2);
            $table->uuid('currency_id')->nullable();
            $table->string('currency_code', 10)->default('USD');
            $table->decimal('exchange_rate', 20, 6)->default('1');
            $table->string('status')->default('pending');
            $table->string('payment_method', 60)->nullable();
            $table->decimal('gateway_fee', 15, 2)->default('0');
            $table->decimal('net_amount', 15, 2)->nullable();
            $table->string('customer_name', 200)->nullable();
            $table->string('customer_email', 200)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->json('raw_request')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('failed_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['public_token'], 'online_payments_public_token_index');
            $table->index(['status'], 'online_payments_status_index');
            $table->index(['provider', 'provider_order_id'], 'online_payments_provider_provider_order_id_index');
            $table->unique(['provider', 'provider_payment_id'], 'op_provider_payment_unique');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('payment_gateway_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('provider', 40);
            $table->boolean('enabled')->default(false);
            $table->string('mode', 20)->default('test');
            $table->string('display_name', 100)->nullable();
            $table->json('public_config')->nullable();
            $table->text('encrypted_credentials')->nullable();
            $table->json('allowed_currencies')->nullable();
            $table->string('default_currency', 10)->nullable();
            $table->boolean('webhook_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['provider'], 'payment_gateway_settings_provider_unique');
        });

        Schema::create('payment_webhook_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('provider', 40);
            $table->string('event_id', 255)->nullable();
            $table->string('event_type', 100)->nullable();
            $table->json('payload');
            $table->json('headers')->nullable();
            $table->boolean('verified')->default(false);
            $table->boolean('processed')->default(false);
            $table->text('processing_error')->nullable();
            $table->uuid('online_payment_id')->nullable();
            $table->timestamp('received_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->index(['event_id'], 'payment_webhook_logs_event_id_index');
            $table->index(['processed'], 'payment_webhook_logs_processed_index');
            $table->index(['provider', 'event_id'], 'payment_webhook_logs_provider_event_id_index');
        });

        Schema::create('payroll_additions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payroll_id');
            $table->uuid('component_id')->nullable();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->string('calculation_type')->default('fixed');
            $table->string('applicability_type')->default('all_employees');
            $table->json('selected_employee_ids')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['payroll_id'], 'payroll_additions_payroll_id_index');
        });

        Schema::create('payroll_deductions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payroll_id');
            $table->uuid('component_id')->nullable();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->string('calculation_type')->default('fixed');
            $table->string('applicability_type')->default('all_employees');
            $table->json('selected_employee_ids')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['payroll_id'], 'payroll_deductions_payroll_id_index');
        });

        Schema::create('payroll_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payroll_run_id');
            $table->uuid('payslip_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->decimal('amount', 16, 2);
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 16, 6)->default('1');
            $table->decimal('base_currency_amount', 16, 2);
            $table->string('payment_method', 60)->default('bank');
            $table->uuid('bank_account_id')->nullable();
            $table->date('payment_date');
            $table->string('reference_number')->nullable();
            $table->string('status')->default('pending');
            $table->text('remarks')->nullable();
            $table->string('idempotency_key', 100)->nullable();
            $table->timestamps();
            $table->uuid('payroll_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->index(['payroll_run_id', 'status'], 'payroll_payments_payroll_run_id_status_index');
            $table->unique(['idempotency_key'], 'payroll_payments_idempotency_key_unique');
            $table->index(['employee_id', 'status'], 'payroll_payments_employee_id_status_index');
        });

        Schema::create('payroll_periods', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->date('start_date');
            $table->date('end_date');
            $table->uuid('branch_id')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
            $table->dateTime('locked_at')->nullable();
            $table->unsignedBigInteger('locked_by')->nullable();
            $table->index(['status', 'month', 'year'], 'payroll_periods_status_month_year_index');
            $table->unique(['month', 'year', 'branch_id'], 'payroll_periods_month_year_branch_id_unique');
        });

        Schema::create('payroll_settings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('daily_rate_basis')->default('working_days');
            $table->string('rounding_method')->default('nearest');
            $table->unsignedTinyInteger('currency_precision')->default('2');
            $table->decimal('default_overtime_rate', 16, 4)->default('0');
            $table->uuid('salary_expense_account_id')->nullable();
            $table->uuid('salary_payable_account_id')->nullable();
            $table->uuid('tax_payable_account_id')->nullable();
            $table->uuid('benefit_payable_account_id')->nullable();
            $table->uuid('bank_account_id')->nullable();
            $table->boolean('allow_multiple_runs')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->string('standard_working_days_mode', 40)->default('working_days_only');
            $table->unsignedTinyInteger('default_monthly_working_days')->default('30');
            $table->boolean('overtime_enabled')->default(true);
            $table->boolean('late_deduction_enabled')->default(false);
            $table->boolean('unpaid_leave_deduction_enabled')->default(true);
            $table->boolean('auto_post_journal_voucher')->default(false);
            $table->boolean('require_approval_before_payment')->default(true);
            $table->unique(['branch_id'], 'payroll_settings_branch_id_unique');
        });

        Schema::create('payrolls', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payroll_period_id');
            $table->uuid('branch_id')->nullable();
            $table->string('run_number');
            $table->string('status')->default('draft');
            $table->integer('total_employees')->default('0');
            $table->decimal('total_gross', 18, 4)->default('0');
            $table->decimal('total_deductions', 18, 4)->default('0');
            $table->decimal('total_net_payable', 18, 4)->default('0');
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 18, 4)->default('1');
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->dateTime('generated_at')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('paid_by')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->unsignedBigInteger('locked_by')->nullable();
            $table->dateTime('locked_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->unsignedBigInteger('voided_by')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->string('idempotency_key')->nullable();
            $table->timestamps();
            $table->string('payroll_number', 40)->nullable();
            $table->uuid('source_account_id')->nullable();
            $table->decimal('total_earnings', 16, 2)->default('0');
            $table->decimal('total_base_currency_amount', 16, 2)->default('0');
            $table->unsignedBigInteger('processed_by')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->unsignedBigInteger('reopened_by')->nullable();
            $table->timestamp('reopened_at')->nullable();
            $table->uuid('payment_journal_voucher_id')->nullable();
            $table->uuid('reversal_journal_voucher_id')->nullable();
            $table->uuid('payment_reversal_journal_voucher_id')->nullable();
            $table->text('preview_snapshot')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unique(['payroll_number'], 'payrolls_payroll_number_unique');
            $table->index(['status', 'branch_id'], 'payroll_runs_status_branch_id_index');
            $table->unique(['run_number'], 'payroll_runs_run_number_unique');
            $table->unique(['payroll_period_id', 'branch_id'], 'payroll_runs_payroll_period_id_branch_id_unique');
            $table->unique(['idempotency_key'], 'payroll_runs_idempotency_key_unique');
        });

        Schema::create('payslip_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('payslip_id');
            $table->uuid('component_id')->nullable();
            $table->string('type');
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->decimal('base_currency_amount', 16, 2)->default('0');
            $table->string('calculation_type')->default('fixed');
            $table->string('source');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->json('meta')->nullable();
            $table->index(['payslip_id', 'type'], 'payslip_lines_payslip_id_type_index');
        });

        Schema::create('payslips', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->integer('salary_month');
            $table->integer('salary_year');
            $table->decimal('salary', 16, 2);
            $table->integer('paid_leave')->default('0');
            $table->integer('unpaid_leave')->default('0');
            $table->integer('monthly_holiday')->default('0');
            $table->integer('public_holiday')->default('0');
            $table->integer('work_day')->default('0');
            $table->decimal('shift_wise_work_hour', 8, 2)->default('0');
            $table->decimal('monthly_work_hour', 8, 2)->default('0');
            $table->decimal('hourly_salary', 16, 2)->default('0');
            $table->decimal('working_hour', 8, 2)->default('0');
            $table->decimal('salary_payable', 16, 2)->default('0');
            $table->decimal('bonus', 16, 2)->default('0');
            $table->string('bonus_comment', 255)->nullable();
            $table->decimal('deduction', 16, 2)->default('0');
            $table->string('deduction_comment', 255)->nullable();
            $table->decimal('total_payable', 16, 2)->default('0');
            $table->string('payment_status')->default('UNPAID');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('payroll_run_id')->nullable();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('payslip_number', 60)->nullable();
            $table->string('status')->default('draft');
            $table->decimal('gross_earnings', 16, 2)->default('0');
            $table->decimal('total_deductions', 16, 2)->default('0');
            $table->decimal('employer_contributions', 16, 2)->default('0');
            $table->decimal('net_payable', 16, 2)->default('0');
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 16, 6)->default('1');
            $table->decimal('base_currency_amount', 16, 2)->default('0');
            $table->decimal('payable_days', 8, 2)->default('0');
            $table->decimal('total_working_days', 8, 2)->default('0');
            $table->decimal('unpaid_leave_days', 8, 2)->default('0');
            $table->decimal('overtime_hours', 10, 2)->default('0');
            $table->uuid('journal_voucher_id')->nullable();
            $table->string('payment_reference')->nullable();
            $table->text('remarks')->nullable();
            $table->uuid('payroll_id')->nullable();
            $table->json('calculation_snapshot')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->index(['user_id'], 'payslips_user_id_global_search_idx');
            $table->index(['salary_year'], 'payslips_salary_year_global_search_idx');
            $table->index(['salary_month'], 'payslips_salary_month_global_search_idx');
            $table->unique(['payslip_number'], 'payslips_payslip_number_unique');
            $table->index(['payroll_run_id', 'status'], 'payslips_payroll_run_id_status_index');
            $table->unique(['payroll_run_id', 'employee_id'], 'payslips_payroll_run_id_employee_id_unique');
            $table->index(['payment_status'], 'payslips_payment_status_global_search_idx');
            $table->index(['employee_id', 'status'], 'payslips_employee_id_status_index');
            $table->index(['branch_id'], 'payslips_branch_id_global_search_idx');
        });

        Schema::create('permissions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 150);
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('guard_name', 80)->default('web');
        });

        Schema::create('pos_cash_movements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('pos_terminal_id');
            $table->uuid('pos_shift_id');
            $table->string('movement_no', 40)->nullable();
            $table->dateTime('movement_date');
            $table->string('type')->default('cash_in');
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('reason', 180)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('account_id')->nullable();
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('source_type', 80)->nullable();
            $table->uuid('source_id')->nullable();
            $table->string('source_reference', 120)->nullable();
            $table->index(['source_type', 'source_id'], 'pos_cash_movements_source_index');
            $table->unique(['movement_no'], 'pos_cash_movements_movement_no_unique');
            $table->index(['pos_terminal_id', 'movement_date'], 'pos_cash_movements_pos_terminal_id_movement_date_index');
            $table->index(['pos_shift_id', 'approved'], 'pos_cash_movements_pos_shift_id_approved_index');
        });

        Schema::create('pos_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('pos_sale_id');
            $table->dateTime('payment_date');
            $table->string('payment_method')->default('cash');
            $table->uuid('account_id')->nullable();
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('reference', 120)->nullable();
            $table->string('card_last_four', 4)->nullable();
            $table->string('transaction_no', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['payment_method'], 'pos_payments_payment_method_index');
            $table->index(['pos_sale_id'], 'pos_payments_pos_sale_id_index');
        });

        Schema::create('pos_return_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('pos_return_id');
            $table->uuid('pos_sale_line_id');
            $table->uuid('product_id')->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->decimal('line_total', 16, 2)->default('0');
            $table->string('remarks', 200)->nullable();
            $table->timestamps();
            $table->index(['pos_sale_line_id'], 'pos_return_lines_pos_sale_line_id_index');
            $table->index(['pos_return_id'], 'pos_return_lines_pos_return_id_index');
        });

        Schema::create('pos_returns', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('pos_sale_id');
            $table->uuid('sales_return_id')->nullable();
            $table->uuid('pos_shift_id')->nullable();
            $table->string('return_no', 40)->nullable();
            $table->dateTime('return_date');
            $table->decimal('refund_amount', 16, 2)->default('0');
            $table->string('refund_method')->default('cash');
            $table->string('reason', 180)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unique(['return_no'], 'pos_returns_return_no_unique');
            $table->index(['return_date'], 'pos_returns_return_date_index');
            $table->index(['pos_shift_id', 'status'], 'pos_returns_pos_shift_id_status_index');
            $table->index(['pos_sale_id', 'status'], 'pos_returns_pos_sale_id_status_index');
            $table->index(['branch_id'], 'pos_returns_branch_id_global_search_idx');
        });

        Schema::create('pos_sale_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('pos_sale_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name', 180);
            $table->string('product_code', 80)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->decimal('qty', 16, 4)->default('1');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->decimal('discount_amount', 16, 2)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->decimal('line_total', 16, 2)->default('0');
            $table->decimal('returned_qty', 16, 4)->default('0');
            $table->string('remarks', 200)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->boolean('is_complimentary')->default(false);
            $table->string('complimentary_reason', 180)->nullable();
            $table->index(['product_id'], 'pos_sale_lines_product_id_index');
            $table->index(['pos_sale_id'], 'pos_sale_lines_pos_sale_id_index');
        });

        Schema::create('pos_sales', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('pos_terminal_id');
            $table->uuid('pos_shift_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('invoice_id')->nullable();
            $table->uuid('customer_payment_id')->nullable();
            $table->uuid('sales_return_id')->nullable();
            $table->string('sale_no', 40)->nullable();
            $table->dateTime('sale_date');
            $table->string('customer_name', 180)->nullable();
            $table->string('customer_phone', 40)->nullable();
            $table->string('customer_email', 120)->nullable();
            $table->decimal('subtotal', 16, 2)->default('0');
            $table->decimal('discount_total', 16, 2)->default('0');
            $table->decimal('tax_total', 16, 2)->default('0');
            $table->decimal('round_off', 16, 2)->default('0');
            $table->decimal('grand_total', 16, 2)->default('0');
            $table->decimal('paid_total', 16, 2)->default('0');
            $table->decimal('balance_due', 16, 2)->default('0');
            $table->decimal('change_amount', 16, 2)->default('0');
            $table->string('status')->default('draft');
            $table->string('payment_status')->default('unpaid');
            $table->text('notes')->nullable();
            $table->text('receipt_note')->nullable();
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unique(['sale_no'], 'pos_sales_sale_no_unique');
            $table->index(['sale_date'], 'pos_sales_sale_date_index');
            $table->index(['pos_terminal_id', 'status'], 'pos_sales_pos_terminal_id_status_index');
            $table->index(['pos_shift_id', 'status'], 'pos_sales_pos_shift_id_status_index');
            $table->index(['payment_status'], 'pos_sales_payment_status_global_search_idx');
            $table->index(['customer_phone'], 'pos_sales_customer_phone_global_search_idx');
            $table->index(['contact_id', 'status'], 'pos_sales_contact_id_status_index');
            $table->index(['branch_id', 'status'], 'pos_sales_branch_id_status_index');
        });

        Schema::create('pos_shifts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('pos_terminal_id');
            $table->unsignedBigInteger('cashier_id');
            $table->string('shift_no', 40)->nullable();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->decimal('opening_cash', 16, 2)->default('0');
            $table->decimal('expected_cash', 16, 2)->default('0');
            $table->decimal('counted_cash', 16, 2)->default('0');
            $table->decimal('cash_difference', 16, 2)->default('0');
            $table->decimal('total_sales', 16, 2)->default('0');
            $table->decimal('total_cash_sales', 16, 2)->default('0');
            $table->decimal('total_card_sales', 16, 2)->default('0');
            $table->decimal('total_online_sales', 16, 2)->default('0');
            $table->decimal('total_refunds', 16, 2)->default('0');
            $table->decimal('total_expenses', 16, 2)->default('0');
            $table->text('notes')->nullable();
            $table->text('closing_notes')->nullable();
            $table->string('status')->default('open');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->unique(['shift_no'], 'pos_shifts_shift_no_unique');
            $table->index(['pos_terminal_id', 'status'], 'pos_shifts_pos_terminal_id_status_index');
            $table->index(['opened_at'], 'pos_shifts_opened_at_index');
            $table->index(['cashier_id', 'status'], 'pos_shifts_cashier_id_status_index');
            $table->index(['branch_id', 'status'], 'pos_shifts_branch_id_status_index');
        });

        Schema::create('pos_terminals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('warehouse_id')->nullable();
            $table->string('name', 150);
            $table->string('code', 40);
            $table->string('location', 150)->nullable();
            $table->string('receipt_printer_name', 120)->nullable();
            $table->uuid('cash_account_id')->nullable();
            $table->uuid('card_account_id')->nullable();
            $table->uuid('online_account_id')->nullable();
            $table->uuid('default_customer_id')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('floor_name', 120)->nullable();
            $table->unsignedInteger('x_position')->default('24');
            $table->unsignedInteger('y_position')->default('24');
            $table->unsignedInteger('sort_order')->default('0');
            $table->string('status', 40)->default('available');
            $table->index(['name'], 'pos_terminals_name_global_search_idx');
            $table->unique(['code'], 'pos_terminals_code_unique');
            $table->index(['is_default', 'active'], 'pos_terminals_is_default_active_index');
            $table->index(['warehouse_id', 'active'], 'pos_terminals_warehouse_id_active_index');
            $table->index(['branch_id', 'active'], 'pos_terminals_branch_id_active_index');
        });

        Schema::create('printing_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('document_type', 80);
            $table->longText('template_html')->nullable();
            $table->longText('template_css')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('template_key')->nullable();
        });

        Schema::create('priorities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 80);
            $table->string('color', 20)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('product_categories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->uuid('parent_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['name'], 'product_categories_name_global_search_idx');
        });

        Schema::create('product_tax_categories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country_code');
            $table->string('code', 80);
            $table->string('name', 180);
            $table->string('tax_category_type');
            $table->string('hsn_sac_code', 30)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('product_units', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 50);
            $table->string('short_name', 20)->nullable();
            $table->text('description')->nullable();
            $table->boolean('accept_fractional')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('product_variant_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('variant_line_id');
            $table->timestamps();
            $table->unique(['product_id', 'variant_line_id'], 'pvi_product_variant_line_unique');
        });

        Schema::create('production_cost_terms', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 120);
            $table->string('code', 40)->nullable();
            $table->uuid('chart_of_account_id')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['branch_id', 'active'], 'production_cost_terms_branch_id_active_index');
            $table->unique(['branch_id', 'name'], 'production_cost_terms_branch_name_unique');
        });

        Schema::create('production_journal_by_products', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_journal_id');
            $table->uuid('product_id');
            $table->decimal('cost_percent', 9, 4)->default('0');
            $table->decimal('quantity', 18, 4);
            $table->string('unit_code', 20)->nullable();
            $table->decimal('allocated_cost', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_journal_id', 'product_id'], 'pj_byproduct_journal_product_index');
        });

        Schema::create('production_journal_expenses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_journal_id');
            $table->uuid('cost_term_id')->nullable();
            $table->decimal('amount', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_journal_id', 'cost_term_id'], 'pj_expense_journal_term_index');
        });

        Schema::create('production_journal_raw_materials', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_journal_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 18, 4);
            $table->string('unit_code', 20)->nullable();
            $table->decimal('rate', 18, 6)->default('0');
            $table->decimal('amount', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_journal_id', 'product_id'], 'pj_raw_journal_product_index');
        });

        Schema::create('production_journals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('code', 60);
            $table->date('date');
            $table->string('reference', 120)->nullable();
            $table->uuid('finished_product_id');
            $table->decimal('output_quantity', 18, 4);
            $table->string('output_unit_code', 20)->nullable();
            $table->uuid('warehouse_id');
            $table->decimal('raw_material_cost', 18, 6)->default('0');
            $table->decimal('production_expense_amount', 18, 6)->default('0');
            $table->decimal('total_cost_of_production', 18, 6)->default('0');
            $table->decimal('by_product_allocated_cost', 18, 6)->default('0');
            $table->decimal('finished_goods_cost', 18, 6)->default('0');
            $table->decimal('cost_per_unit', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('stock_posted')->default(false);
            $table->timestamp('stock_posted_at')->nullable();
            $table->boolean('void')->default(false);
            $table->timestamp('voided_at')->nullable();
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->string('voided_reason', 500)->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['warehouse_id', 'status'], 'production_journals_warehouse_id_status_index');
            $table->index(['finished_product_id', 'status'], 'production_journals_finished_product_id_status_index');
            $table->unique(['code'], 'production_journals_code_unique');
            $table->index(['branch_id', 'date'], 'production_journals_branch_id_date_index');
        });

        Schema::create('production_order_byproducts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_order_id');
            $table->uuid('product_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('product_unit_id')->nullable();
            $table->decimal('quantity', 18, 4);
            $table->decimal('cost_share_percent', 9, 4)->default('0');
            $table->decimal('allocated_cost', 18, 6)->default('0');
            $table->decimal('unit_cost', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_order_id', 'product_id'], 'po_byproduct_order_product_index');
        });

        Schema::create('production_order_expenses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_order_id');
            $table->uuid('expense_account_id')->nullable();
            $table->string('name', 120);
            $table->decimal('amount', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_order_id', 'expense_account_id'], 'po_expense_order_account_index');
        });

        Schema::create('production_order_raw_materials', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('production_order_id');
            $table->uuid('product_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('product_unit_id')->nullable();
            $table->decimal('quantity', 18, 4);
            $table->decimal('unit_cost', 18, 6)->default('0');
            $table->decimal('total_cost', 18, 6)->default('0');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['production_order_id', 'product_id'], 'po_raw_order_product_index');
        });

        Schema::create('production_orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('code', 60)->nullable();
            $table->date('date');
            $table->string('reference', 120)->nullable();
            $table->uuid('bill_of_material_id')->nullable();
            $table->uuid('finished_product_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('product_unit_id')->nullable();
            $table->decimal('output_quantity', 18, 4);
            $table->decimal('total_raw_material_cost', 18, 6)->default('0');
            $table->decimal('total_expense_cost', 18, 6)->default('0');
            $table->decimal('total_byproduct_cost', 18, 6)->default('0');
            $table->decimal('total_finished_goods_cost', 18, 6)->default('0');
            $table->decimal('total_production_cost', 18, 6)->default('0');
            $table->decimal('finished_goods_unit_cost', 18, 6)->default('0');
            $table->string('status', 30)->default('draft');
            $table->boolean('approved')->default(false);
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->timestamp('voided_at')->nullable();
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->string('voided_reason', 500)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->boolean('stock_posted')->default(false);
            $table->timestamp('stock_posted_at')->nullable();
            $table->uuid('journal_voucher_id')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status', 'approved', 'void'], 'production_orders_status_approved_void_index');
            $table->index(['finished_product_id', 'warehouse_id'], 'production_orders_finished_product_id_warehouse_id_index');
            $table->unique(['code'], 'production_orders_code_unique');
            $table->index(['branch_id', 'date'], 'production_orders_branch_id_date_index');
        });

        Schema::create('products', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('parent_id')->nullable();
            $table->uuid('product_category_id')->nullable();
            $table->uuid('product_tax_category_id')->nullable();
            $table->string('name', 180);
            $table->string('code', 60)->nullable();
            $table->string('sku', 80)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->text('description')->nullable();
            $table->uuid('product_unit_id')->nullable();
            $table->uuid('tax_class_id')->nullable();
            $table->string('product_type')->default('simple');
            $table->string('variant_signature')->nullable();
            $table->uuid('sales_account_id')->nullable();
            $table->uuid('purchase_account_id')->nullable();
            $table->uuid('sales_return_account_id')->nullable();
            $table->uuid('purchase_return_account_id')->nullable();
            $table->string('valuation_method')->default('standard');
            $table->decimal('reorder_level', 16, 4)->default(0);
            $table->decimal('purchase_price', 16, 2)->default(0);
            $table->decimal('selling_price', 16, 2)->default(0);
            $table->boolean('track_inventory')->default(true);
            $table->boolean('allow_sale')->default(true);
            $table->boolean('allow_purchase')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('proforma_invoice_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('proforma_invoice_id');
            $table->uuid('product_id')->nullable();
            $table->string('custom_product_name', 180)->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
        });

        Schema::create('proforma_invoices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('proforma_no', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->date('proforma_date');
            $table->uuid('contact_id');
            $table->uuid('currency_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->index(['status'], 'proforma_invoices_status_global_search_idx');
            $table->unique(['proforma_no'], 'proforma_invoices_proforma_no_unique');
            $table->index(['contact_id'], 'proforma_invoices_contact_id_global_search_idx');
            $table->index(['branch_id'], 'proforma_invoices_branch_id_global_search_idx');
        });

        Schema::create('project_team_members', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_team_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('project_teams', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('project_team_name', 120);
            $table->uuid('project_id');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('project_manager_id');
            $table->string('name', 180);
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->text('description')->nullable();
            $table->string('status')->default('PENDING');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('branch_id')->nullable();
            $table->index(['status'], 'projects_status_global_search_idx');
            $table->index(['name'], 'projects_name_global_search_idx');
        });

        Schema::create('public_holidays', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->dateTime('date');
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_bill_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('purchase_bill_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->string('discount_type')->default('percent');
            $table->decimal('discount_amount', 15, 2)->default('0');
        });

        Schema::create('purchase_bills', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('bill_no', 40)->nullable();
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->uuid('contact_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('import_country', 80)->nullable();
            $table->date('import_date')->nullable();
            $table->string('import_document_number', 80)->nullable();
            $table->decimal('paid_total', 16, 2)->default('0');
            $table->decimal('balance_due', 16, 2)->default('0');
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->string('lead_id')->nullable();
            $table->string('deal_id')->nullable();
            $table->string('campaign_id')->nullable();
            $table->uuid('project_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'purchase_bills_status_global_search_idx');
            $table->index(['lead_id'], 'purchase_bills_lead_id_index');
            $table->index(['deal_id'], 'purchase_bills_deal_id_index');
            $table->index(['contact_id'], 'purchase_bills_contact_id_global_search_idx');
            $table->index(['campaign_id'], 'purchase_bills_campaign_id_index');
            $table->index(['branch_id'], 'purchase_bills_branch_id_global_search_idx');
            $table->unique(['bill_no'], 'purchase_bills_bill_no_unique');
        });

        Schema::create('purchase_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('default_supplier_account_id')->nullable();
            $table->uuid('default_purchase_tax_id')->nullable();
            $table->unsignedSmallInteger('bill_due_days')->default('30');
            $table->boolean('require_purchase_order_approval')->default(true);
            $table->boolean('require_bill_approval')->default(true);
            $table->json('aging_buckets')->nullable();
            $table->boolean('overdue_reminders_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('negative_item_balance')->default('warn');
            $table->string('negative_cash_balance')->default('warn');
        });

        Schema::create('purchase_order_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->string('discount_type')->default('percent');
            $table->decimal('discount_amount', 15, 2)->default('0');
        });

        Schema::create('purchase_orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('purchase_order_no', 40)->nullable();
            $table->date('purchase_order_date');
            $table->uuid('contact_id');
            $table->uuid('currency_id')->nullable();
            $table->uuid('credit_term_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'purchase_orders_status_global_search_idx');
            $table->unique(['purchase_order_no'], 'purchase_orders_purchase_order_no_unique');
            $table->index(['contact_id'], 'purchase_orders_contact_id_global_search_idx');
            $table->index(['branch_id'], 'purchase_orders_branch_id_global_search_idx');
        });

        Schema::create('quotation_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('quotation_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name', 180)->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->decimal('discount_amount', 18, 4)->default('0');
            $table->string('discount_type')->default('percent');
        });

        Schema::create('quotations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('contact_id');
            $table->string('quotation_no', 40)->nullable();
            $table->date('quotation_date');
            $table->date('expiry_date')->nullable();
            $table->uuid('credit_term_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('deal_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->index(['status'], 'quotations_status_global_search_idx');
            $table->unique(['quotation_no'], 'quotations_quotation_no_unique');
            $table->index(['deal_id'], 'quotations_deal_id_index');
            $table->index(['contact_id'], 'quotations_contact_id_global_search_idx');
            $table->index(['branch_id'], 'quotations_branch_id_global_search_idx');
        });

        Schema::create('reporting_tag_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('reporting_tag_id');
            $table->string('name', 80);
            $table->string('color', 20)->nullable();
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('value')->nullable();
        });

        Schema::create('reporting_tag_values', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('reporting_tag_id');
            $table->uuid('reporting_tag_line_id')->nullable();
            $table->string('taggable_type');
            $table->string('taggable_id');
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 6)->nullable();
            $table->date('value_date')->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();
            $table->unique(['taggable_type', 'taggable_id', 'reporting_tag_id'], 'reporting_tag_values_owner_tag_unique');
            $table->index(['reporting_tag_id'], 'reporting_tag_values_reporting_tag_id_index');
            $table->index(['taggable_type', 'taggable_id'], 'reporting_tag_values_taggable_type_taggable_id_index');
        });

        Schema::create('reporting_tags', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 80);
            $table->string('color', 20)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('code', 80)->nullable();
            $table->string('type', 40)->default('text');
            $table->unsignedSmallInteger('sort_order')->default('0');
        });

        Schema::create('role_has_permissions', function (Blueprint $table): void {
            $table->uuid('permission_id');
            $table->uuid('role_id');
            $table->primary(['permission_id', 'role_id']);
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('role_id');
            $table->uuid('permission_id');
            $table->timestamps();
            $table->unique(['role_id', 'permission_id'], 'role_permissions_role_id_permission_id_unique');
        });

        Schema::create('roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 150);
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('guard_name', 80)->default('web');
        });

        Schema::create('salary_components', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code', 40);
            $table->string('type');
            $table->string('calculation_type')->default('fixed');
            $table->boolean('taxable')->default(false);
            $table->boolean('affects_net_salary')->default(true);
            $table->uuid('accounting_account_id')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default('0');
            $table->timestamps();
            $table->unique(['code'], 'salary_components_code_unique');
        });

        Schema::create('salary_histories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->decimal('salary', 16, 2);
            $table->dateTime('start_date');
            $table->dateTime('end_date')->nullable();
            $table->string('comment', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('salary_structure_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('salary_structure_id');
            $table->uuid('component_id');
            $table->decimal('amount', 16, 2)->default('0');
            $table->decimal('percentage', 8, 4)->nullable();
            $table->text('formula')->nullable();
            $table->string('calculation_type')->default('fixed');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('salary_structures', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('branch_id')->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->decimal('basic_salary', 16, 2);
            $table->decimal('gross_salary', 16, 2)->default('0');
            $table->uuid('currency_id')->nullable();
            $table->decimal('exchange_rate', 16, 6)->default('1');
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->index(['effective_from', 'effective_to'], 'salary_structures_effective_from_effective_to_index');
            $table->index(['branch_id', 'active'], 'salary_structures_branch_id_active_index');
            $table->index(['employee_id', 'active'], 'salary_structures_employee_id_active_index');
        });

        Schema::create('sales_configurations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('default_customer_account_id')->nullable();
            $table->uuid('default_sales_tax_id')->nullable();
            $table->unsignedSmallInteger('quotation_validity_days')->default('15');
            $table->unsignedSmallInteger('invoice_due_days')->default('30');
            $table->boolean('require_sales_order_approval')->default(true);
            $table->boolean('allow_negative_receivable')->default(false);
            $table->json('aging_buckets')->nullable();
            $table->boolean('overdue_reminders_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('suggest_selling')->default('recent');
            $table->string('negative_item_balance')->default('warn');
            $table->string('credit_limit_exceed')->default('warn');
            $table->string('negative_cash_balance')->default('warn');
        });

        Schema::create('sales_order_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('sales_order_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->decimal('discount_percent', 8, 4)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->decimal('discount_amount', 18, 4)->default('0');
            $table->string('discount_type')->default('percent');
        });

        Schema::create('sales_orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('sales_order_no', 40)->nullable();
            $table->date('sales_order_date');
            $table->uuid('contact_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 16, 2)->default('0');
            $table->decimal('discount_total', 16, 2)->default('0');
            $table->decimal('tax_total', 16, 2)->default('0');
            $table->decimal('grand_total', 16, 2)->default('0');
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'sales_orders_status_global_search_idx');
            $table->unique(['sales_order_no'], 'sales_orders_sales_order_no_unique');
            $table->index(['contact_id'], 'sales_orders_contact_id_global_search_idx');
            $table->index(['branch_id'], 'sales_orders_branch_id_global_search_idx');
        });

        Schema::create('sales_return_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('sales_return_id');
            $table->uuid('product_id')->nullable();
            $table->string('product_name')->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default('0');
            $table->decimal('unit_price', 16, 2)->default('0');
            $table->uuid('tax_rate_id')->nullable();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->decimal('tax_amount', 16, 2)->default('0');
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default('0');
            $table->timestamps();
            $table->decimal('discount_percent', 18, 4)->default('0');
            $table->decimal('discount_amount', 18, 4)->default('0');
            $table->string('discount_type')->default('percent');
        });

        Schema::create('sales_returns', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('sales_return_no', 40)->nullable();
            $table->date('sales_return_date');
            $table->uuid('contact_id');
            $table->uuid('warehouse_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('has_refund')->default(false);
            $table->uuid('refund_account_id')->nullable();
            $table->string('refund_reference', 120)->nullable();
            $table->decimal('refund_amount', 18, 6)->nullable();
            $table->index(['status'], 'sales_returns_status_global_search_idx');
            $table->unique(['sales_return_no'], 'sales_returns_sales_return_no_unique');
            $table->index(['contact_id'], 'sales_returns_contact_id_global_search_idx');
            $table->index(['branch_id'], 'sales_returns_branch_id_global_search_idx');
        });

        Schema::create('sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity');
            $table->index(['last_activity'], 'sessions_last_activity_index');
            $table->index(['user_id'], 'sessions_user_id_index');
        });

        Schema::create('shifts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('work_hour', 8, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['name'], 'shifts_name_unique');
        });

        Schema::create('sms_configs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('name', 120)->default('Default');
            $table->string('provider', 40);
            $table->string('account_sid', 255)->nullable();
            $table->string('auth_token')->nullable();
            $table->string('from_number', 80)->nullable();
            $table->string('api_key')->nullable();
            $table->string('base_url', 500)->nullable();
            $table->string('sender_id', 60)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->string('api_base_url', 500)->nullable();
            $table->text('api_secret')->nullable();
            $table->string('username', 255)->nullable();
            $table->text('password')->nullable();
            $table->string('route', 80)->nullable();
            $table->string('country_code', 12)->nullable();
            $table->string('default_country_code', 12)->nullable();
            $table->string('webhook_url', 500)->nullable();
            $table->string('callback_url', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('test_phone', 80)->nullable();
            $table->text('test_message')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->index(['provider', 'active'], 'sms_configs_provider_active_index');
            $table->index(['is_default'], 'sms_configs_is_default_index');
        });

        Schema::create('sms_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('sms_config_id')->nullable();
            $table->uuid('sms_template_id')->nullable();
            $table->uuid('campaign_id')->nullable();
            $table->uuid('campaign_sms_message_id')->nullable();
            $table->uuid('campaign_sms_recipient_id')->nullable();
            $table->string('module', 80)->nullable();
            $table->string('module_id', 80)->nullable();
            $table->string('recipient_name', 180)->nullable();
            $table->string('phone', 80);
            $table->string('normalized_phone')->nullable();
            $table->string('sender_id', 80)->nullable();
            $table->string('provider', 80)->nullable();
            $table->text('message');
            $table->unsignedInteger('message_length')->default('0');
            $table->unsignedInteger('segment_count')->default('1');
            $table->string('status', 30)->default('pending');
            $table->string('provider_message_id', 191)->nullable();
            $table->json('provider_response')->nullable();
            $table->string('error_code', 80)->nullable();
            $table->text('error_message')->nullable();
            $table->dateTime('queued_at')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->dateTime('bounced_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['normalized_phone'], 'sms_logs_normalized_phone_index');
            $table->index(['campaign_id', 'campaign_sms_message_id'], 'sms_logs_campaign_id_campaign_sms_message_id_index');
            $table->index(['provider', 'status', 'created_at'], 'sms_logs_provider_status_created_at_index');
        });

        Schema::create('sms_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 160);
            $table->string('code', 120);
            $table->string('module', 80)->nullable();
            $table->string('subject', 180)->nullable();
            $table->string('internal_title', 180)->nullable();
            $table->text('body');
            $table->json('variables')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'sms_templates_code_unique');
            $table->index(['module', 'is_active'], 'sms_templates_module_is_active_index');
        });

        Schema::create('supplier_payment_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('supplier_payment_id');
            $table->uuid('purchase_bill_id');
            $table->decimal('allocated_amount', 16, 2)->default('0');
            $table->timestamps();
        });

        Schema::create('supplier_payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('payment_no', 40)->nullable();
            $table->date('payment_date');
            $table->uuid('contact_id');
            $table->uuid('account_id')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->decimal('amount', 16, 2)->default('0');
            $table->string('method', 20)->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('bank_charges_account_id')->nullable();
            $table->decimal('bank_charges', 16, 2)->nullable()->default('0');
            $table->uuid('tds_charges_account_id')->nullable();
            $table->string('tds_type', 20)->nullable();
            $table->decimal('tds_charges', 16, 2)->nullable()->default('0');
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('journal_voucher_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->text('remarks')->nullable();
            $table->index(['status'], 'supplier_payments_status_global_search_idx');
            $table->unique(['payment_no'], 'supplier_payments_payment_no_unique');
            $table->index(['contact_id'], 'supplier_payments_contact_id_global_search_idx');
            $table->index(['branch_id'], 'supplier_payments_branch_id_global_search_idx');
        });

        Schema::create('support_ticket_comments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('support_ticket_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('type', 30)->default('public_reply');
            $table->text('body');
            $table->json('attachments')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();
            $table->index(['support_ticket_id', 'is_internal'], 'support_ticket_comments_support_ticket_id_is_internal_index');
            $table->index(['user_id'], 'support_ticket_comments_user_id_index');
            $table->index(['support_ticket_id'], 'support_ticket_comments_support_ticket_id_index');
        });

        Schema::create('support_tickets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('branch_id')->nullable();
            $table->string('ticket_no', 20);
            $table->string('subject', 255);
            $table->text('description')->nullable();
            $table->string('status')->default('open');
            $table->string('priority')->default('medium');
            $table->string('category', 60)->nullable();
            $table->string('source', 30)->nullable()->default('manual');
            $table->string('contact_id')->nullable();
            $table->string('lead_id')->nullable();
            $table->string('deal_id')->nullable();
            $table->string('campaign_id')->nullable();
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->unsignedBigInteger('resolved_by_id')->nullable();
            $table->unsignedBigInteger('closed_by_id')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->json('tags')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['ticket_no'], 'support_tickets_ticket_no_unique');
            $table->index(['due_at'], 'support_tickets_due_at_index');
            $table->index(['branch_id', 'status'], 'support_tickets_branch_id_status_index');
            $table->index(['status', 'priority'], 'support_tickets_status_priority_index');
            $table->index(['created_by_id'], 'support_tickets_created_by_id_index');
            $table->index(['assigned_to_id'], 'support_tickets_assigned_to_id_index');
            $table->index(['campaign_id'], 'support_tickets_campaign_id_index');
            $table->index(['deal_id'], 'support_tickets_deal_id_index');
            $table->index(['lead_id'], 'support_tickets_lead_id_index');
            $table->index(['contact_id'], 'support_tickets_contact_id_index');
            $table->index(['priority'], 'support_tickets_priority_index');
            $table->index(['status'], 'support_tickets_status_index');
            $table->index(['branch_id'], 'support_tickets_branch_id_index');
        });

        Schema::create('task_statuses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->string('name', 80);
            $table->string('color', 20)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->integer('sort_order')->default('0');
            $table->unique(['project_id', 'name'], 'task_statuses_project_id_name_unique');
        });

        Schema::create('tasks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('milestone_id')->nullable();
            $table->uuid('priority_id')->nullable();
            $table->uuid('task_status_id')->nullable();
            $table->string('name', 180);
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->decimal('completion_time', 8, 2)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->integer('sort_order')->default('0');
            $table->index(['sort_order'], 'tasks_sort_order_index');
            $table->index(['name'], 'tasks_name_global_search_idx');
            $table->index(['project_id'], 'tasks_project_id_global_search_idx');
        });

        Schema::create('tax_classes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->string('country_code');
            $table->string('name', 120);
            $table->string('code', 30);
            $table->string('tax_type');
            $table->string('tax_behavior')->default('standard');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['country_code', 'code'], 'tax_classes_country_code_code_unique');
        });

        Schema::create('tax_exemptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('contact_id')->nullable();
            $table->uuid('product_tax_category_id')->nullable();
            $table->string('country_code');
            $table->string('exemption_no', 80)->nullable();
            $table->string('reason', 180)->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('attachment', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('tax_jurisdictions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country_code');
            $table->string('state_code', 20)->nullable();
            $table->string('county_name', 120)->nullable();
            $table->string('city_name', 120)->nullable();
            $table->string('name', 150);
            $table->string('code', 50)->nullable();
            $table->string('tax_system');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('tax_system_id')->nullable();
        });

        Schema::create('tax_rate_components', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tax_rate_id');
            $table->string('component_name', 80);
            $table->string('component_type');
            $table->decimal('rate_percent', 8, 4)->default('0');
            $table->uuid('account_id')->nullable();
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('chart_of_account_id');
            $table->timestamps();
        });

        Schema::create('tax_rates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tax_class_id');
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->string('country_code');
            $table->string('tax_type');
            $table->string('name', 120);
            $table->string('code', 50)->nullable();
            $table->decimal('rate_percent', 8, 4)->default('0');
            $table->boolean('inclusive')->default(false);
            $table->string('calculation_method')->default('single');
            $table->string('applies_on')->default('both');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('report_code', 80)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
        });

        Schema::create('tax_registrations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->string('registration_type');
            $table->string('registration_no', 80);
            $table->string('legal_name', 180)->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::create('tax_report_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country_code');
            $table->uuid('tax_system_id')->nullable();
            $table->string('report_key', 120);
            $table->string('report_name', 180);
            $table->text('description')->nullable();
            $table->json('columns_json')->nullable();
            $table->json('mapping_json')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->timestamps();
            $table->index(['country_code'], 'tax_report_templates_country_code_index');
            $table->unique(['country_code', 'report_key'], 'tax_report_templates_country_code_report_key_unique');
        });

        Schema::create('tax_rules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tax_jurisdiction_id')->nullable();
            $table->uuid('tax_rate_id');
            $table->uuid('product_tax_category_id')->nullable();
            $table->string('country_code');
            $table->string('transaction_type');
            $table->string('customer_type')->default('any');
            $table->string('supply_type')->default('any');
            $table->string('from_state_code', 20)->nullable();
            $table->string('to_state_code', 20)->nullable();
            $table->boolean('reverse_charge')->default(false);
            $table->unsignedSmallInteger('priority')->default('100');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->json('conditions')->nullable();
            $table->json('actions')->nullable();
        });

        Schema::create('tax_settings', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->boolean('is_tax_registered')->default(false);
            $table->string('registration_type', 30)->nullable();
            $table->string('tax_number', 80)->nullable();
            $table->string('tax_registered_name', 180)->nullable();
            $table->string('country_code', 3)->nullable()->default('NP');
            $table->string('default_currency', 10)->nullable()->default('NPR');
            $table->date('registration_effective_date')->nullable();
            $table->boolean('sales_tax_enabled')->default(false);
            $table->string('sales_tax_name', 80)->nullable()->default('VAT');
            $table->decimal('sales_tax_rate_percent', 8, 4)->nullable()->default('0');
            $table->uuid('default_sales_tax_rate_id')->nullable();
            $table->unsignedBigInteger('sales_tax_account_id')->nullable();
            $table->unsignedBigInteger('sales_tax_payable_account_id')->nullable();
            $table->boolean('purchase_tax_enabled')->default(false);
            $table->string('purchase_tax_name', 80)->nullable()->default('VAT');
            $table->decimal('purchase_tax_rate_percent', 8, 4)->nullable()->default('0');
            $table->uuid('default_purchase_tax_rate_id')->nullable();
            $table->boolean('purchase_tax_recoverable')->default(true);
            $table->unsignedBigInteger('purchase_tax_account_id')->nullable();
            $table->string('product_tax_behavior')->default('all_same');
            $table->boolean('advanced_mode')->default(false);
            $table->string('preset', 30)->nullable()->default('none');
            $table->boolean('wizard_completed')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->string('tax_label', 30)->default('VAT');
            $table->string('custom_tax_label', 60)->nullable();
            $table->string('tax_calculation_type', 20)->default('exclusive');
            $table->string('tax_rounding_method', 20)->default('document');
            $table->boolean('show_tax_on_invoice')->default(true);
            $table->string('sales_tax_calculation_type', 20)->default('global');
            $table->string('purchase_tax_calculation_type', 20)->default('global');
            $table->boolean('allow_sales_tax_override')->default(true);
            $table->boolean('allow_purchase_tax_override')->default(true);
            $table->boolean('show_tax_summary_on_bill')->default(true);
            $table->index(['default_purchase_tax_rate_id'], 'tax_settings_default_purchase_tax_rate_id_index');
            $table->index(['default_sales_tax_rate_id'], 'tax_settings_default_sales_tax_rate_id_index');
            $table->index(['branch_id'], 'tax_settings_branch_id_index');
        });

        Schema::create('tax_slabs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country', 100);
            $table->string('fiscal_year', 40);
            $table->decimal('income_from', 16, 2)->default('0');
            $table->decimal('income_to', 16, 2)->nullable();
            $table->decimal('rate', 8, 4)->default('0');
            $table->decimal('fixed_amount', 16, 2)->default('0');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['country', 'fiscal_year', 'active'], 'tax_slabs_country_fiscal_year_active_index');
        });

        Schema::create('tax_systems', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('country_code');
            $table->string('name', 150);
            $table->string('code', 80);
            $table->string('type', 50)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->unique(['code'], 'tax_systems_code_unique');
            $table->index(['country_code'], 'tax_systems_country_code_index');
        });

        Schema::create('user_app_contexts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('fiscal_year_id')->nullable();
            $table->timestamps();
            $table->unique(['user_id'], 'user_app_contexts_user_id_unique');
            $table->index(['fiscal_year_id'], 'user_app_contexts_fiscal_year_id_index');
            $table->index(['branch_id'], 'user_app_contexts_branch_id_index');
        });

        Schema::create('user_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('event', 120)->nullable();
            $table->string('status', 60)->nullable();
            $table->string('ip_address', 60)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
            $table->uuid('branch_id')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('username', 80);
            $table->string('phone')->nullable();
            $table->string('blood_group', 10)->nullable();
            $table->string('image')->nullable();
            $table->string('street')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip_code', 20)->nullable();
            $table->string('country')->nullable();
            $table->string('employee_id')->nullable();
            $table->date('join_date')->nullable();
            $table->date('leave_date')->nullable();
            $table->uuid('employment_status_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->uuid('role_id')->nullable();
            $table->uuid('shift_id')->nullable();
            $table->uuid('leave_policy_id')->nullable();
            $table->uuid('weekly_holiday_id')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->uuid('payroll_account_id')->nullable();
            $table->string('locale')->nullable();
            $table->unique(['username'], 'users_username_unique');
            $table->index(['name'], 'users_name_global_search_idx');
            $table->unique(['employee_id'], 'users_employee_id_unique');
            $table->unique(['email'], 'users_email_unique');
            $table->index(['branch_id'], 'users_branch_id_global_search_idx');
        });

        Schema::create('variant_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('variant_id');
            $table->string('value', 80);
            $table->unsignedSmallInteger('sort_order')->default('0');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->timestamps();
        });

        Schema::create('variants', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 80);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->integer('sort_order')->default('0');
        });

        Schema::create('warehouse_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->uuid('warehouse_id');
            $table->uuid('product_id');
            $table->decimal('qty_on_hand', 18, 4)->default('0');
            $table->decimal('avg_cost', 18, 6)->nullable()->default('0');
            $table->decimal('total_value', 18, 6)->nullable()->default('0');
            $table->decimal('reorder_level', 18, 4)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['product_id'], 'warehouse_items_product_id_index');
            $table->index(['branch_id', 'warehouse_id'], 'warehouse_items_branch_id_warehouse_id_index');
            $table->unique(['warehouse_id', 'product_id'], 'warehouse_items_warehouse_product_unique');
        });

        Schema::create('warehouse_transfer_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('warehouse_transfer_id');
            $table->uuid('product_id');
            $table->decimal('qty', 16, 4)->default('0');
            $table->string('remarks', 200)->nullable();
            $table->timestamps();
        });

        Schema::create('warehouse_transfers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('transfer_no', 40);
            $table->date('transfer_date');
            $table->uuid('from_warehouse_id');
            $table->uuid('to_warehouse_id');
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->boolean('void')->default(false);
            $table->unsignedBigInteger('voided_by_id')->nullable();
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default('1');
            $table->decimal('total', 18, 6)->default('0');
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->uuid('fiscal_year_id')->nullable();
            $table->boolean('stock_posted')->default(false);
            $table->dateTime('stock_posted_at')->nullable();
            $table->text('remarks')->nullable();
            $table->unique(['transfer_no'], 'warehouse_transfers_transfer_no_unique');
            $table->index(['status'], 'warehouse_transfers_status_global_search_idx');
            $table->index(['branch_id'], 'warehouse_transfers_branch_id_global_search_idx');
        });

        Schema::create('warehouses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('code', 30)->nullable();
            $table->string('name', 150);
            $table->text('address')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
            $table->index(['name'], 'warehouses_name_global_search_idx');
            $table->index(['code'], 'warehouses_code_global_search_idx');
            $table->index(['branch_id'], 'warehouses_branch_id_global_search_idx');
        });

        Schema::create('weekly_holidays', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('start_day', 20);
            $table->string('end_day', 20);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();
        });

        Schema::table('accounting_configurations', function (Blueprint $table): void {
            $table->foreign(['loan_charge_expense_account_id'], 'fk_accounting_configuration_bf4f06ce794e')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['loan_processing_fee_expense_account_id'], 'fk_accounting_configuration_32da6484d188')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['default_cash_account_id'], 'fk_accounting_configuration_312d1adf895c')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['default_bank_account_id'], 'fk_accounting_configuration_0229c9faec99')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['accounts_receivable_id'], 'fk_accounting_configuration_a80fdf103ae1')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['accounts_payable_id'], 'fk_accounting_configuration_0254a1a92fa6')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['sales_account_id'], 'fk_accounting_configuration_73d492f79461')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['purchase_account_id'], 'fk_accounting_configuration_29393fca0683')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['sales_return_account_id'], 'fk_accounting_configuration_23dbf1c1e9c5')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['purchase_return_account_id'], 'fk_accounting_configuration_06803c361f77')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['tax_payable_account_id'], 'fk_accounting_configuration_68dc71cf4d1f')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['tax_receivable_account_id'], 'fk_accounting_configuration_d4401c5b24fd')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['discount_allowed_account_id'], 'fk_accounting_configuration_bf3ef5d121c8')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['discount_received_account_id'], 'fk_accounting_configuration_3d5693db57ff')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['rounding_account_id'], 'fk_accounting_configuration_8122ded9d48b')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['payroll_expense_account_id'], 'fk_accounting_configuration_27d67d68d541')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['salary_payable_account_id'], 'fk_accounting_configuration_3ffdb65e0955')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['inventory_account_id'], 'fk_accounting_configuration_536078701dba')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_accounting_configuration_6dc4ea389258')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('accounts', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_accounts_783429d99825')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_accounts_398ce6a5f309')->references(['id'])->on('currencies');
            $table->foreign(['parent_id'], 'fk_accounts_1c9d4b51a7d1')->references(['id'])->on('accounts');
        });

        Schema::table('activity_logs', function (Blueprint $table): void {
            $table->foreign(['user_id'], 'fk_activity_logs_fbd6dc15ffb7')->references(['id'])->on('users');
        });

        Schema::table('ai_pending_actions', function (Blueprint $table): void {
            $table->foreign(['approved_by'], 'fk_ai_pending_actions_3258d0221d59')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_ai_pending_actions_6993722941ad')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['user_id'], 'fk_ai_pending_actions_17427ad95282')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['ai_conversation_id'], 'fk_ai_pending_actions_67e8166dea1c')->references(['id'])->on('ai_conversations')->nullOnDelete();
        });

        Schema::table('alert_types', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_alert_types_e50c94fb0ab9')->references(['id'])->on('users');
        });

        Schema::table('announcements', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_announcements_6db6ae4d7fe2')->references(['id'])->on('users');
        });

        Schema::table('app_settings', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_app_settings_f9eb14e7cda2')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['default_currency_id'], 'fk_app_settings_2cbe157702d0')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_app_settings_94991bb399bc')->references(['id'])->on('users');
        });

        Schema::table('application_settings', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_application_settings_0a3f5e7047bc')->references(['id'])->on('users');
        });

        Schema::table('approval_logs', function (Blueprint $table): void {
            $table->foreign(['user_id'], 'fk_approval_logs_b1e0893dae0c')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('approval_workflows', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_approval_workflows_c7717d02b70d')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['approver_user_id'], 'fk_approval_workflows_c1e0fda336bd')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['approver_role_id'], 'fk_approval_workflows_b4eec028eb38')->references(['id'])->on('roles')->nullOnDelete();
        });

        Schema::table('assigned_tasks', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_assigned_tasks_e1a1ccfa705b')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_assigned_tasks_f0a32e9bdc0f')->references(['id'])->on('users');
            $table->foreign(['task_id'], 'fk_assigned_tasks_d8ced7c69ac8')->references(['id'])->on('tasks');
        });

        Schema::table('attendance_summaries', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_attendance_summaries_93cc28968c65')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['payroll_period_id'], 'fk_attendance_summaries_1407d48f8307')->references(['id'])->on('payroll_periods')->cascadeOnDelete();
            $table->foreign(['employee_id'], 'fk_attendance_summaries_93a5763eceb8')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('attendances', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_attendances_baca1a982fd5')->references(['id'])->on('users');
            $table->foreign(['punch_by'], 'fk_attendances_b7fee264d9e3')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_attendances_6284d2eb0736')->references(['id'])->on('users');
            $table->foreign(['branch_id'], 'fk_attendances_00a5f8539b21')->references(['id'])->on('branches');
        });

        Schema::table('award_histories', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_award_histories_a11e0fc025e4')->references(['id'])->on('users');
            $table->foreign(['award_id'], 'fk_award_histories_f9e8f480fe09')->references(['id'])->on('awards');
            $table->foreign(['user_id'], 'fk_award_histories_fb96a3ce8146')->references(['id'])->on('users');
        });

        Schema::table('awards', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_awards_09f14da4097e')->references(['id'])->on('users');
        });

        Schema::table('bank_accounts', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_bank_accounts_dfdd92ee139d')->references(['id'])->on('users');
            $table->foreign(['account_id'], 'fk_bank_accounts_d97128f61c8c')->references(['id'])->on('accounts');
            $table->foreign(['currency_id'], 'fk_bank_accounts_f40383723046')->references(['id'])->on('currencies');
            $table->foreign(['branch_id'], 'fk_bank_accounts_10c49bd749b5')->references(['id'])->on('branches');
        });

        Schema::table('bank_reconciliation_items', function (Blueprint $table): void {
            $table->foreign(['bank_reconciliation_id'], 'fk_bank_reconciliation_item_4ef92485d58e')->references(['id'])->on('bank_reconciliations')->cascadeOnDelete();
        });

        Schema::table('bank_reconciliations', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_bank_reconciliations_dd323b8430d8')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['bank_account_id'], 'fk_bank_reconciliations_96c67b4c385b')->references(['id'])->on('bank_accounts')->cascadeOnDelete();
        });

        Schema::table('bank_statement_lines', function (Blueprint $table): void {
            $table->foreign(['account_id'], 'fk_bank_statement_lines_dfd2d59c1379')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['bank_account_id'], 'fk_bank_statement_lines_c44e5eeff464')->references(['id'])->on('bank_accounts')->cascadeOnDelete();
        });

        Schema::table('benefit_rules', function (Blueprint $table): void {
            $table->foreign(['accounting_account_id'], 'fk_benefit_rules_b27c0119bc3f')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::table('bill_of_material_by_products', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_bill_of_material_by_prod_17b3a74487b2')->references(['id'])->on('products');
            $table->foreign(['bill_of_material_id'], 'fk_bill_of_material_by_prod_68e45756b255')->references(['id'])->on('bills_of_material')->cascadeOnDelete();
        });

        Schema::table('bill_of_material_expenses', function (Blueprint $table): void {
            $table->foreign(['bill_of_material_id'], 'fk_bill_of_material_expense_b25880123096')->references(['id'])->on('bills_of_material')->cascadeOnDelete();
        });

        Schema::table('bill_of_material_raw_materials', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_bill_of_material_raw_mat_d92c4f7521ef')->references(['id'])->on('products');
            $table->foreign(['bill_of_material_id'], 'fk_bill_of_material_raw_mat_cf4b8f8b308f')->references(['id'])->on('bills_of_material')->cascadeOnDelete();
        });

        Schema::table('bills_of_material', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_bills_of_material_8b21a4a3ccad')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_bills_of_material_e237f37888e7')->references(['id'])->on('users');
            $table->foreign(['product_id'], 'fk_bills_of_material_bddd5a378069')->references(['id'])->on('products');
            $table->foreign(['branch_id'], 'fk_bills_of_material_c742a20b039f')->references(['id'])->on('branches');
        });

        Schema::table('branches', function (Blueprint $table): void {
            $table->foreign(['language_id'], 'fk_branches_c887e2704ab2')->references(['id'])->on('languages')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_branches_d26f77dd5a47')->references(['id'])->on('users');
        });

        Schema::table('campaign_email_attachments', function (Blueprint $table): void {
            $table->foreign(['uploaded_by'], 'fk_campaign_email_attachmen_7caf994c7405')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['campaign_email_message_id'], 'fk_campaign_email_attachmen_ae0819ea9e6b')->references(['id'])->on('campaign_email_messages')->cascadeOnDelete();
            $table->foreign(['campaign_id'], 'fk_campaign_email_attachmen_712f347ff2cb')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
        });

        Schema::table('campaign_email_messages', function (Blueprint $table): void {
            $table->foreign(['campaign_id'], 'fk_campaign_email_messages_0f68b1daf6ac')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
        });

        Schema::table('campaign_email_recipients', function (Blueprint $table): void {
            $table->foreign(['contact_group_id'], 'fk_campaign_email_recipient_b5bc139e3d1a')->references(['id'])->on('contact_groups')->nullOnDelete();
            $table->foreign(['contact_id'], 'fk_campaign_email_recipient_b7cf3b48da2d')->references(['id'])->on('contacts')->nullOnDelete();
            $table->foreign(['campaign_email_message_id'], 'fk_campaign_email_recipient_633e1021dc22')->references(['id'])->on('campaign_email_messages')->cascadeOnDelete();
            $table->foreign(['campaign_id'], 'fk_campaign_email_recipient_ba146ba9677c')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
        });

        Schema::table('campaign_send_logs', function (Blueprint $table): void {
            $table->foreign(['sms_log_id'], 'fk_campaign_send_logs_e614860491f7')->references(['id'])->on('sms_logs')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_campaign_send_logs_8d29281a1266')->references(['id'])->on('users');
            $table->foreign(['contact_id'], 'fk_campaign_send_logs_07efa5e173c8')->references(['id'])->on('contacts')->nullOnDelete();
            $table->foreign(['campaign_id'], 'fk_campaign_send_logs_ce266d9d606d')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
            $table->foreign(['campaign_email_message_id'], 'fk_campaign_send_logs_a29d15ce2181')->references(['id'])->on('campaign_email_messages')->nullOnDelete();
            $table->foreign(['campaign_sms_message_id'], 'fk_campaign_send_logs_4e742d94a48f')->references(['id'])->on('campaign_sms_messages')->nullOnDelete();
            $table->foreign(['campaign_email_recipient_id'], 'fk_campaign_send_logs_07cde4041cb9')->references(['id'])->on('campaign_email_recipients')->nullOnDelete();
            $table->foreign(['campaign_sms_recipient_id'], 'fk_campaign_send_logs_cd44a41f6a51')->references(['id'])->on('campaign_sms_recipients')->nullOnDelete();
            $table->foreign(['contact_group_id'], 'fk_campaign_send_logs_7eb8569caed8')->references(['id'])->on('contact_groups')->nullOnDelete();
        });

        Schema::table('campaign_sms_messages', function (Blueprint $table): void {
            $table->foreign(['sms_config_id'], 'fk_campaign_sms_messages_a48cc45d3799')->references(['id'])->on('sms_configs')->nullOnDelete();
            $table->foreign(['campaign_id'], 'fk_campaign_sms_messages_7711a55da627')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
        });

        Schema::table('campaign_sms_recipients', function (Blueprint $table): void {
            $table->foreign(['contact_group_id'], 'fk_campaign_sms_recipients_f7b8988583a7')->references(['id'])->on('contact_groups')->nullOnDelete();
            $table->foreign(['contact_id'], 'fk_campaign_sms_recipients_b43625e36304')->references(['id'])->on('contacts')->nullOnDelete();
            $table->foreign(['campaign_sms_message_id'], 'fk_campaign_sms_recipients_c70071d41253')->references(['id'])->on('campaign_sms_messages')->cascadeOnDelete();
            $table->foreign(['campaign_id'], 'fk_campaign_sms_recipients_a4411b0d21e1')->references(['id'])->on('crm_campaigns')->cascadeOnDelete();
        });

        Schema::table('cash_transfer_lines', function (Blueprint $table): void {
            $table->foreign(['to_account_id'], 'fk_cash_transfer_lines_96f7320a0c58')->references(['id'])->on('accounts');
            $table->foreign(['cash_transfer_id'], 'fk_cash_transfer_lines_c1d1fd50d9df')->references(['id'])->on('cash_transfers');
        });

        Schema::table('cash_transfers', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_cash_transfers_a67294b63405')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_cash_transfers_379098472816')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_cash_transfers_4cdc6408400f')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_cash_transfers_102eb6db1d1c')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_cash_transfers_096968d5f104')->references(['id'])->on('currencies');
            $table->foreign(['from_account_id'], 'fk_cash_transfers_87a10baa8909')->references(['id'])->on('accounts');
            $table->foreign(['branch_id'], 'fk_cash_transfers_eb6f1e0dfb30')->references(['id'])->on('branches');
            $table->foreign(['journal_voucher_id'], 'fk_cash_transfers_fd11b5cac83a')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('chart_of_accounts', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_chart_of_accounts_2fd81d443dca')->references(['id'])->on('users');
            $table->foreign(['parent_id'], 'fk_chart_of_accounts_fccf255bcd68')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['currency_id'], 'fk_chart_of_accounts_4af5b5e8c6d1')->references(['id'])->on('currencies');
            $table->foreign(['branch_id'], 'fk_chart_of_accounts_473fce33fb54')->references(['id'])->on('branches');
            $table->foreign(['account_id'], 'fk_chart_of_accounts_ea035e5f1f7d')->references(['id'])->on('accounts');
        });

        Schema::table('cheque_format_configurations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_cheque_format_configurat_d1142181e566')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('cheque_registers', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_cheque_registers_104844086c82')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_cheque_registers_80fb53eb15c0')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_cheque_registers_e7dc445f8713')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_cheque_registers_e2393b502f43')->references(['id'])->on('users');
            $table->foreign(['receiver_related_account_id'], 'fk_cheque_registers_2c2ccca2c0d4')->references(['id'])->on('accounts');
            $table->foreign(['related_account_id'], 'fk_cheque_registers_80c1aa26b05a')->references(['id'])->on('accounts');
            $table->foreign(['account_id'], 'fk_cheque_registers_c8386b9cbf17')->references(['id'])->on('accounts');
            $table->foreign(['branch_id'], 'fk_cheque_registers_0ab7e94e8bbd')->references(['id'])->on('branches');
            $table->foreign(['journal_voucher_id'], 'fk_cheque_registers_f9b3e07b0539')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('contact_groups', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_contact_groups_dc3b18320120')->references(['id'])->on('users');
            $table->foreign(['parent_id'], 'fk_contact_groups_0662dcb02324')->references(['id'])->on('contact_groups');
        });

        Schema::table('contacts', function (Blueprint $table): void {
            $table->foreign(['payable_account_id'], 'fk_contacts_69248c555434')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['contact_group_id'], 'fk_contacts_6a09d81df059')->references(['id'])->on('contact_groups');
            $table->foreign(['account_id'], 'fk_contacts_ddc582f32a8d')->references(['id'])->on('accounts');
            $table->foreign(['credit_term_id'], 'fk_contacts_48159c35cf47')->references(['id'])->on('credit_terms');
            $table->foreign(['user_add_id'], 'fk_contacts_1199191e9297')->references(['id'])->on('users');
        });

        Schema::table('credit_terms', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_credit_terms_9f1a46ce9b98')->references(['id'])->on('users');
        });

        Schema::table('crm_accounts', function (Blueprint $table): void {
            $table->foreign(['owner_id'], 'fk_crm_accounts_8635570ec8ea')->references(['id'])->on('users');
            $table->foreign(['parent_account_id'], 'fk_crm_accounts_eb7e34fbbf5f')->references(['id'])->on('crm_accounts');
            $table->foreign(['branch_id'], 'fk_crm_accounts_838daa72cccb')->references(['id'])->on('branches');
        });

        Schema::table('crm_activities', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_crm_activities_bb563cc40b9a')->references(['id'])->on('users');
            $table->foreign(['assigned_to_id'], 'fk_crm_activities_6b15baf85cb5')->references(['id'])->on('users');
            $table->foreign(['contact_id'], 'fk_crm_activities_a153b1e0cc20')->references(['id'])->on('contacts');
            $table->foreign(['deal_id'], 'fk_crm_activities_b9efa2f18156')->references(['id'])->on('deals');
            $table->foreign(['lead_id'], 'fk_crm_activities_7baa7b249674')->references(['id'])->on('leads');
        });

        Schema::table('crm_activity_comments', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_crm_activity_comments_c615b0fd7f25')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_crm_activity_comments_cb2c4367681e')->references(['id'])->on('users');
            $table->foreign(['crm_activity_id'], 'fk_crm_activity_comments_afc9d54af257')->references(['id'])->on('crm_activities');
        });

        Schema::table('crm_activity_escalations', function (Blueprint $table): void {
            $table->foreign(['escalated_by'], 'fk_crm_activity_escalations_66f97babb833')->references(['id'])->on('users');
            $table->foreign(['escalated_to'], 'fk_crm_activity_escalations_0fbe24ec6961')->references(['id'])->on('users');
            $table->foreign(['activity_id'], 'fk_crm_activity_escalations_490d86eb623a')->references(['id'])->on('crm_activities')->cascadeOnDelete();
        });

        Schema::table('crm_attributions', function (Blueprint $table): void {
            $table->foreign(['contact_id'], 'fk_crm_attributions_e61e84ab4e8c')->references(['id'])->on('contacts')->nullOnDelete();
            $table->foreign(['deal_id'], 'fk_crm_attributions_ae3d832ef3be')->references(['id'])->on('deals')->nullOnDelete();
            $table->foreign(['lead_id'], 'fk_crm_attributions_08d9bad0873e')->references(['id'])->on('leads')->nullOnDelete();
            $table->foreign(['campaign_id'], 'fk_crm_attributions_747fb25528f9')->references(['id'])->on('crm_campaigns')->nullOnDelete();
        });

        Schema::table('crm_campaigns', function (Blueprint $table): void {
            $table->foreign(['updated_by'], 'fk_crm_campaigns_7dc6f0483157')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['created_by'], 'fk_crm_campaigns_6e8d4e4abc78')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_crm_campaigns_6dd6a159f67f')->references(['id'])->on('branches');
            $table->foreign(['contact_group_id'], 'fk_crm_campaigns_4ebd2a1ec9bc')->references(['id'])->on('contact_groups')->nullOnDelete();
        });

        Schema::table('crm_communications', function (Blueprint $table): void {
            $table->foreign(['created_by'], 'fk_crm_communications_1ccb387ccdea')->references(['id'])->on('users');
            $table->foreign(['deal_id'], 'fk_crm_communications_2f5310ab4517')->references(['id'])->on('deals');
            $table->foreign(['lead_id'], 'fk_crm_communications_c78d5b6e2cdd')->references(['id'])->on('leads');
            $table->foreign(['contact_id'], 'fk_crm_communications_39d689c9f2ec')->references(['id'])->on('contacts');
            $table->foreign(['account_id'], 'fk_crm_communications_b5757baffedb')->references(['id'])->on('crm_accounts');
            $table->foreign(['branch_id'], 'fk_crm_communications_6e661da0ab37')->references(['id'])->on('branches');
        });

        Schema::table('crm_contact_roles', function (Blueprint $table): void {
            $table->foreign(['deal_id'], 'fk_crm_contact_roles_b997043f1741')->references(['id'])->on('deals');
            $table->foreign(['contact_id'], 'fk_crm_contact_roles_9bbdc49c80dc')->references(['id'])->on('contacts');
            $table->foreign(['account_id'], 'fk_crm_contact_roles_b2d8ce5cf802')->references(['id'])->on('crm_accounts');
        });

        Schema::table('crm_customer_health_scores', function (Blueprint $table): void {
            $table->foreign(['contact_id'], 'fk_crm_customer_health_scor_0a02e72faab9')->references(['id'])->on('contacts')->cascadeOnDelete();
            $table->foreign(['account_id'], 'fk_crm_customer_health_scor_537cebe8b94d')->references(['id'])->on('crm_accounts')->cascadeOnDelete();
        });

        Schema::table('crm_deal_stage_histories', function (Blueprint $table): void {
            $table->foreign(['changed_by'], 'fk_crm_deal_stage_histories_268275b9d557')->references(['id'])->on('users');
            $table->foreign(['to_stage_id'], 'fk_crm_deal_stage_histories_1b015a9770f6')->references(['id'])->on('deal_stages');
            $table->foreign(['from_stage_id'], 'fk_crm_deal_stage_histories_1c94253c2e5a')->references(['id'])->on('deal_stages');
            $table->foreign(['deal_id'], 'fk_crm_deal_stage_histories_e319fc755a70')->references(['id'])->on('deals')->cascadeOnDelete();
        });

        Schema::table('crm_notes', function (Blueprint $table): void {
            $table->foreign(['created_by'], 'fk_crm_notes_c38cd205ee5a')->references(['id'])->on('users');
        });

        Schema::table('crm_sequence_steps', function (Blueprint $table): void {
            $table->foreign(['sequence_id'], 'fk_crm_sequence_steps_38ee33e9027f')->references(['id'])->on('crm_sequences')->cascadeOnDelete();
        });

        Schema::table('crm_sequences', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_crm_sequences_d24bbe22e0a0')->references(['id'])->on('branches');
        });

        Schema::table('currencies', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_currencies_d4f58bf13086')->references(['id'])->on('users');
        });

        Schema::table('custom_field_choices', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_custom_field_choices_19a0f21728d7')->references(['id'])->on('users');
            $table->foreign(['custom_field_id'], 'fk_custom_field_choices_da13bc315128')->references(['id'])->on('custom_fields');
        });

        Schema::table('custom_field_modules', function (Blueprint $table): void {
            $table->foreign(['custom_field_id'], 'fk_custom_field_modules_fb2c690ce0cd')->references(['id'])->on('custom_fields');
        });

        Schema::table('custom_field_validations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_custom_field_validations_0ed68a0a9f91')->references(['id'])->on('users');
            $table->foreign(['custom_field_id'], 'fk_custom_field_validations_ec426d1e31b0')->references(['id'])->on('custom_fields');
        });

        Schema::table('custom_field_values', function (Blueprint $table): void {
            $table->foreign(['custom_field_id'], 'fk_custom_field_values_f3e96ce9bf4a')->references(['id'])->on('custom_fields');
        });

        Schema::table('custom_fields', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_custom_fields_ca808ae5cec4')->references(['id'])->on('users');
        });

        Schema::table('custom_templates', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_custom_templates_a34570f0c241')->references(['id'])->on('users');
        });

        Schema::table('customer_payment_lines', function (Blueprint $table): void {
            $table->foreign(['invoice_id'], 'fk_customer_payment_lines_f3f464dc1a56')->references(['id'])->on('invoices');
            $table->foreign(['customer_payment_id'], 'fk_customer_payment_lines_feb985e81012')->references(['id'])->on('customer_payments');
        });

        Schema::table('customer_payments', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_customer_payments_8d253c147455')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_customer_payments_25da6a3954b4')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_customer_payments_85cf87c68312')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_customer_payments_14d6e03c8009')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_customer_payments_1becfcc77755')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_customer_payments_69acd358859f')->references(['id'])->on('currencies');
            $table->foreign(['account_id'], 'fk_customer_payments_4435ce35da23')->references(['id'])->on('accounts');
            $table->foreign(['contact_id'], 'fk_customer_payments_391cc5608b2d')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_customer_payments_df50c9d36c50')->references(['id'])->on('branches');
            $table->foreign(['bank_charges_account_id'], 'fk_customer_payments_b870d1cf2f61')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['tds_charges_account_id'], 'fk_customer_payments_83f8ef437854')->references(['id'])->on('accounts')->nullOnDelete();
        });

        Schema::table('deal_pipelines', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_deal_pipelines_16732baecb47')->references(['id'])->on('users');
        });

        Schema::table('deal_stages', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_deal_stages_1284a9b086c8')->references(['id'])->on('users');
            $table->foreign(['deal_pipeline_id'], 'fk_deal_stages_83b76f57e206')->references(['id'])->on('deal_pipelines');
        });

        Schema::table('deals', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_deals_f74e831c3508')->references(['id'])->on('users');
            $table->foreign(['assigned_to_id'], 'fk_deals_c8f915dba963')->references(['id'])->on('users');
            $table->foreign(['deal_stage_id'], 'fk_deals_ce2bd1f49dbe')->references(['id'])->on('deal_stages');
            $table->foreign(['deal_pipeline_id'], 'fk_deals_1265a0a32199')->references(['id'])->on('deal_pipelines');
            $table->foreign(['contact_id'], 'fk_deals_54e4a2c19fb6')->references(['id'])->on('contacts');
            $table->foreign(['lead_id'], 'fk_deals_3133c4386fb3')->references(['id'])->on('leads');
        });

        Schema::table('debit_note_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_debit_note_lines_2e2bb3137d85')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_debit_note_lines_726c08690a2c')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_debit_note_lines_2990c6c33711')->references(['id'])->on('products');
            $table->foreign(['debit_note_id'], 'fk_debit_note_lines_d2b6cfe23182')->references(['id'])->on('debit_notes');
        });

        Schema::table('debit_notes', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_debit_notes_a096631e4761')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_debit_notes_9dac8636a7a9')->references(['id'])->on('branches');
            $table->foreign(['contact_id'], 'fk_debit_notes_e721038d3745')->references(['id'])->on('contacts');
            $table->foreign(['warehouse_id'], 'fk_debit_notes_46786403d588')->references(['id'])->on('warehouses');
            $table->foreign(['currency_id'], 'fk_debit_notes_6202f909a493')->references(['id'])->on('currencies');
            $table->foreign(['approved_by_id'], 'fk_debit_notes_a6a2724c1835')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_debit_notes_ec2dcd19c03e')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_debit_notes_5622080865ac')->references(['id'])->on('users');
            $table->foreign(['journal_voucher_id'], 'fk_debit_notes_7ef1d40abe80')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('departments', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_departments_53ecc49eba91')->references(['id'])->on('users');
        });

        Schema::table('designation_histories', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_designation_histories_3308cab7a5a7')->references(['id'])->on('users');
            $table->foreign(['designation_id'], 'fk_designation_histories_11eb9fa868a7')->references(['id'])->on('designations');
            $table->foreign(['user_id'], 'fk_designation_histories_623cdbb35878')->references(['id'])->on('users');
        });

        Schema::table('designations', function (Blueprint $table): void {
            $table->foreign(['department_id'], 'fk_designations_6878aef97283')->references(['id'])->on('departments')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_designations_23808938b629')->references(['id'])->on('users');
        });

        Schema::table('document_entity_matches', function (Blueprint $table): void {
            $table->foreign(['document_extraction_id'], 'fk_document_entity_matches_6c3736f9caae')->references(['id'])->on('document_extractions')->nullOnDelete();
            $table->foreign(['document_upload_id'], 'fk_document_entity_matches_be8ede2bf99c')->references(['id'])->on('document_uploads')->cascadeOnDelete();
        });

        Schema::table('document_extractions', function (Blueprint $table): void {
            $table->foreign(['document_upload_id'], 'fk_document_extractions_883bd5c47771')->references(['id'])->on('document_uploads')->cascadeOnDelete();
        });

        Schema::table('document_links', function (Blueprint $table): void {
            $table->foreign(['document_upload_id'], 'fk_document_links_981b9323bf5d')->references(['id'])->on('document_uploads')->cascadeOnDelete();
        });

        Schema::table('document_numberings', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_document_numberings_e83e1a7e5489')->references(['id'])->on('users');
        });

        Schema::table('document_transaction_proposals', function (Blueprint $table): void {
            $table->foreign(['document_extraction_id'], 'fk_document_transaction_pro_c0bab151d219')->references(['id'])->on('document_extractions')->nullOnDelete();
            $table->foreign(['document_upload_id'], 'fk_document_transaction_pro_abfcc23e52c5')->references(['id'])->on('document_uploads')->cascadeOnDelete();
        });

        Schema::table('education', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_education_ff64eea1fc3f')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_education_875a1021e17c')->references(['id'])->on('users');
        });

        Schema::table('email_configs', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_email_configs_a0623035cfbf')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_email_configs_fb29907112b8')->references(['id'])->on('users');
        });

        Schema::table('email_templates', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_email_templates_fb40c94bcbe0')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('emails', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_emails_0cb392020bf7')->references(['id'])->on('users');
        });

        Schema::table('employee_additions', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_employee_additions_d09cb05cefd6')->references(['id'])->on('salary_components')->restrictOnDelete();
            $table->foreign(['branch_id'], 'fk_employee_additions_86073f4039e5')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_employee_additions_9b283ee852bf')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('employee_deductions', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_employee_deductions_afdcd32f346b')->references(['id'])->on('salary_components')->restrictOnDelete();
            $table->foreign(['branch_id'], 'fk_employee_deductions_354ea68b4021')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_employee_deductions_ce72710339f4')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('employee_documents', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_employee_documents_85f48e6f15e3')->references(['id'])->on('users');
            $table->foreign(['branch_id'], 'fk_employee_documents_34ff5399fb05')->references(['id'])->on('branches');
            $table->foreign(['user_id'], 'fk_employee_documents_436f7e25b1d7')->references(['id'])->on('users');
        });

        Schema::table('employee_profiles', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_employee_profiles_237ae122bac3')->references(['id'])->on('users');
            $table->foreign(['weekly_holiday_id'], 'fk_employee_profiles_75a73d4f3031')->references(['id'])->on('weekly_holidays');
            $table->foreign(['leave_policy_id'], 'fk_employee_profiles_8bce7e820c22')->references(['id'])->on('leave_policies');
            $table->foreign(['shift_id'], 'fk_employee_profiles_5c9d40c9d158')->references(['id'])->on('shifts');
            $table->foreign(['designation_id'], 'fk_employee_profiles_8668cedb981a')->references(['id'])->on('designations');
            $table->foreign(['department_id'], 'fk_employee_profiles_0826ce7cad5b')->references(['id'])->on('departments');
            $table->foreign(['employment_status_id'], 'fk_employee_profiles_b04688605367')->references(['id'])->on('employment_statuses');
            $table->foreign(['branch_id'], 'fk_employee_profiles_4e17212eecdc')->references(['id'])->on('branches');
            $table->foreign(['user_id'], 'fk_employee_profiles_7a09e987caf3')->references(['id'])->on('users');
        });

        Schema::table('employee_reimbursements', function (Blueprint $table): void {
            $table->foreign(['payslip_id'], 'fk_employee_reimbursements_f1e2c035b487')->references(['id'])->on('payslips')->nullOnDelete();
            $table->foreign(['payroll_run_id'], 'fk_employee_reimbursements_2fe36194a8ab')->references(['id'])->on('payrolls')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_employee_reimbursements_19c15ad5fd88')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['approved_by'], 'fk_employee_reimbursements_b54d9337ca8a')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_employee_reimbursements_2379ad594d13')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_employee_reimbursements_24e067133bc6')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_employee_reimbursements_f28aefb5b77e')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('employment_statuses', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_employment_statuses_359b9886f592')->references(['id'])->on('users');
        });

        Schema::table('expense_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_expense_lines_45239c8f8388')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_expense_lines_45cf1cf9e79f')->references(['id'])->on('tax_rates');
            $table->foreign(['chart_of_account_id'], 'fk_expense_lines_de05f07dd963')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['expense_id'], 'fk_expense_lines_70ef92d695d7')->references(['id'])->on('expenses');
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_expenses_7df6cbe30778')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_expenses_536fc61206e1')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_expenses_063896896d55')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_expenses_7679bd34ed97')->references(['id'])->on('users');
            $table->foreign(['tds_charges_account_id'], 'fk_expenses_50599dc5b3ae')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['currency_id'], 'fk_expenses_cc4088f35644')->references(['id'])->on('currencies');
            $table->foreign(['contact_id'], 'fk_expenses_ba78c28312f3')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_expenses_17a71bdd933d')->references(['id'])->on('branches');
            $table->foreign(['journal_voucher_id'], 'fk_expenses_7a0fa119ff83')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('fiscal_years', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_fiscal_years_72b68d913c25')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('general_settings', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_general_settings_4f35c661b6fa')->references(['id'])->on('users');
        });

        Schema::table('hrm_configurations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_hrm_configurations_ae8ca5750836')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('inventory_adjustment_lines', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_inventory_adjustment_lin_31e96b7c28fe')->references(['id'])->on('products');
            $table->foreign(['inventory_adjustment_id'], 'fk_inventory_adjustment_lin_62d7822467b1')->references(['id'])->on('inventory_adjustments');
        });

        Schema::table('inventory_adjustments', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_inventory_adjustments_71749f44a42d')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_inventory_adjustments_e95da397abd2')->references(['id'])->on('branches');
            $table->foreign(['warehouse_id'], 'fk_inventory_adjustments_3eca896af1b9')->references(['id'])->on('warehouses');
            $table->foreign(['approved_by_id'], 'fk_inventory_adjustments_87dc95e8c97a')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_inventory_adjustments_088e8ee539ed')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_inventory_adjustments_e3c89311585e')->references(['id'])->on('users');
            $table->foreign(['journal_voucher_id'], 'fk_inventory_adjustments_85fa608dbd56')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('inventory_configurations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_inventory_configurations_00040d7804ec')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['default_warehouse_id'], 'fk_inventory_configurations_593f6cd1d911')->references(['id'])->on('warehouses')->nullOnDelete();
        });

        Schema::table('inventory_ledgers', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_inventory_ledgers_99b2f0cacb96')->references(['id'])->on('branches');
            $table->foreign(['warehouse_id'], 'fk_inventory_ledgers_01b860730ab9')->references(['id'])->on('warehouses');
            $table->foreign(['product_id'], 'fk_inventory_ledgers_5009aebb5bcd')->references(['id'])->on('products');
        });

        Schema::table('invoice_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_invoice_lines_ad349515d453')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_invoice_lines_bce008b34b5e')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_invoice_lines_b531a9a48238')->references(['id'])->on('products');
            $table->foreign(['invoice_id'], 'fk_invoice_lines_0eac2d0f6a9f')->references(['id'])->on('invoices');
        });

        Schema::table('invoice_payment_links', function (Blueprint $table): void {
            $table->foreign(['invoice_id'], 'fk_invoice_payment_links_f24681abe44c')->references(['id'])->on('invoices')->cascadeOnDelete();
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->foreign(['project_id'], 'fk_invoices_19ad9f1ddb1f')->references(['id'])->on('projects')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_invoices_5c75067ced9a')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_invoices_930870263edc')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_invoices_d6490fe698ba')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_invoices_d57ac61a243b')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_invoices_40fa34e74adb')->references(['id'])->on('currencies');
            $table->foreign(['warehouse_id'], 'fk_invoices_9d7c29eb0ddb')->references(['id'])->on('warehouses');
            $table->foreign(['contact_id'], 'fk_invoices_2e9ebf9cac41')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_invoices_877cdc340e05')->references(['id'])->on('branches');
            $table->foreign(['fiscal_year_id'], 'fk_invoices_c124042df52f')->references(['id'])->on('fiscal_years')->nullOnDelete();
        });

        Schema::table('journal_voucher_lines', function (Blueprint $table): void {
            $table->foreign(['currency_id'], 'fk_journal_voucher_lines_5aa08a2ca173')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['chart_of_account_id'], 'fk_journal_voucher_lines_5d89ac77c64c')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['journal_voucher_id'], 'fk_journal_voucher_lines_640c4394cde8')->references(['id'])->on('journal_vouchers');
            $table->foreign(['account_id'], 'fk_journal_voucher_lines_05fad9bc6222')->references(['id'])->on('accounts')->nullOnDelete();
        });

        Schema::table('journal_vouchers', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_journal_vouchers_5a01a1e932b0')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_journal_vouchers_c6d733585c63')->references(['id'])->on('branches');
            $table->foreign(['currency_id'], 'fk_journal_vouchers_ce79396b5367')->references(['id'])->on('currencies');
            $table->foreign(['approved_by_id'], 'fk_journal_vouchers_dcb39b0806ae')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_journal_vouchers_6603b15bdbba')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_journal_vouchers_2ba034c68a73')->references(['id'])->on('users');
        });

        Schema::table('leads', function (Blueprint $table): void {
            $table->foreign(['contact_id'], 'fk_leads_a00251918b56')->references(['id'])->on('contacts');
            $table->foreign(['assigned_to_id'], 'fk_leads_97403b5084e7')->references(['id'])->on('users');
            $table->foreign(['converted_contact_id'], 'fk_leads_56e2c828fbb4')->references(['id'])->on('contacts');
            $table->foreign(['converted_deal_id'], 'fk_leads_14b97bd6badb')->references(['id'])->on('deals');
            $table->foreign(['user_add_id'], 'fk_leads_7b3635f32b63')->references(['id'])->on('users');
        });

        Schema::table('leave_applications', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_leave_applications_903f78df1a00')->references(['id'])->on('users');
            $table->foreign(['accept_leave_by'], 'fk_leave_applications_0dd57b37409e')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_leave_applications_934310fb6aa6')->references(['id'])->on('users');
            $table->foreign(['branch_id'], 'fk_leave_applications_a70c3c38e8c9')->references(['id'])->on('branches');
        });

        Schema::table('leave_policies', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_leave_policies_e74ba2c9df01')->references(['id'])->on('users');
        });

        Schema::table('leave_types', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_leave_types_28ea21965382')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_leave_types_01381982b1b1')->references(['id'])->on('branches')->nullOnDelete();
        });

        Schema::table('loan_accounts', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_loan_accounts_210e8166a1b5')->references(['id'])->on('users');
            $table->foreign(['processing_fee_paid_from_account_id'], 'fk_loan_accounts_0d14ffd53589')->references(['id'])->on('accounts');
            $table->foreign(['related_account_id'], 'fk_loan_accounts_05b652870e8f')->references(['id'])->on('accounts');
            $table->foreign(['loan_received_in_account_id'], 'fk_loan_accounts_f6f00b3f9065')->references(['id'])->on('accounts');
        });

        Schema::table('loan_charges', function (Blueprint $table): void {
            $table->foreign(['journal_voucher_id'], 'fk_loan_charges_222b5a102fc0')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['voided_by_id'], 'fk_loan_charges_97a950cafcf6')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_loan_charges_9946eee58b9a')->references(['id'])->on('users');
            $table->foreign(['loan_account_id'], 'fk_loan_charges_e5c9069d88ac')->references(['id'])->on('loan_accounts');
            $table->foreign(['charges_paid_from_account_id'], 'fk_loan_charges_ad4d959b91be')->references(['id'])->on('accounts');
            $table->foreign(['user_add_id'], 'fk_loan_charges_ee5c77e5a217')->references(['id'])->on('users');
        });

        Schema::table('loan_paybacks', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_loan_paybacks_4a33e4f7ea71')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_loan_paybacks_0a90cc3e4a3a')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['paid_from_account_id'], 'fk_loan_paybacks_c5e3406f6114')->references(['id'])->on('accounts');
            $table->foreign(['loan_account_id'], 'fk_loan_paybacks_b223239b89c7')->references(['id'])->on('loan_accounts')->cascadeOnDelete();
        });

        Schema::table('loan_top_ups', function (Blueprint $table): void {
            $table->foreign(['journal_voucher_id'], 'fk_loan_top_ups_c2580ccc03c1')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['voided_by_id'], 'fk_loan_top_ups_6b5392aa2dba')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_loan_top_ups_ad53f3dd6d1b')->references(['id'])->on('users');
            $table->foreign(['loan_account_id'], 'fk_loan_top_ups_211937336c2d')->references(['id'])->on('loan_accounts');
            $table->foreign(['loan_received_in_account_id'], 'fk_loan_top_ups_8235ddbf3ee0')->references(['id'])->on('accounts');
            $table->foreign(['user_add_id'], 'fk_loan_top_ups_477fb639e640')->references(['id'])->on('users');
        });

        Schema::table('master_data', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_master_data_3475fd3d81bd')->references(['id'])->on('users');
        });

        Schema::table('milestones', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_milestones_0f77d9255f5e')->references(['id'])->on('users');
            $table->foreign(['project_id'], 'fk_milestones_d202a294e495')->references(['id'])->on('projects');
        });

        Schema::table('model_has_permissions', function (Blueprint $table): void {
            $table->foreign(['permission_id'], 'fk_model_has_permissions_5abfdccbeb0f')->references(['id'])->on('permissions')->cascadeOnDelete();
        });

        Schema::table('model_has_roles', function (Blueprint $table): void {
            $table->foreign(['role_id'], 'fk_model_has_roles_feb025d22a7b')->references(['id'])->on('roles')->cascadeOnDelete();
        });

        Schema::table('onboarding_checklists', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_onboarding_checklists_05676c9a4f94')->references(['id'])->on('users');
            $table->foreign(['assigned_to'], 'fk_onboarding_checklists_b3f44d8ef5c5')->references(['id'])->on('users');
            $table->foreign(['branch_id'], 'fk_onboarding_checklists_87ec042afa18')->references(['id'])->on('branches');
            $table->foreign(['user_id'], 'fk_onboarding_checklists_79f234b5cd37')->references(['id'])->on('users');
        });

        Schema::table('online_payments', function (Blueprint $table): void {
            $table->foreign(['currency_id'], 'fk_online_payments_1a70ae2fb924')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['contact_id'], 'fk_online_payments_a64f10815f7d')->references(['id'])->on('contacts')->nullOnDelete();
            $table->foreign(['customer_payment_id'], 'fk_online_payments_858ee180e885')->references(['id'])->on('customer_payments')->nullOnDelete();
            $table->foreign(['invoice_id'], 'fk_online_payments_adba7248085b')->references(['id'])->on('invoices')->nullOnDelete();
        });

        Schema::table('payment_webhook_logs', function (Blueprint $table): void {
            $table->foreign(['online_payment_id'], 'fk_payment_webhook_logs_629b61d3b55e')->references(['id'])->on('online_payments')->nullOnDelete();
        });

        Schema::table('payroll_additions', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_payroll_additions_7bf6631a83e7')->references(['id'])->on('salary_components')->nullOnDelete();
            $table->foreign(['payroll_id'], 'fk_payroll_additions_cd62a19f6c69')->references(['id'])->on('payrolls')->cascadeOnDelete();
        });

        Schema::table('payroll_deductions', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_payroll_deductions_8358ba30588c')->references(['id'])->on('salary_components')->nullOnDelete();
            $table->foreign(['payroll_id'], 'fk_payroll_deductions_0b0922681903')->references(['id'])->on('payrolls')->cascadeOnDelete();
        });

        Schema::table('payroll_payments', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_payroll_payments_47abd6c82dd4')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['bank_account_id'], 'fk_payroll_payments_8ebf0c18ef41')->references(['id'])->on('bank_accounts')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_payroll_payments_c89e111401b6')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_payroll_payments_b17713bde9a0')->references(['id'])->on('users')->cascadeOnDelete();
            $table->foreign(['payslip_id'], 'fk_payroll_payments_dd6e6e778fa5')->references(['id'])->on('payslips')->cascadeOnDelete();
            $table->foreign(['payroll_run_id'], 'fk_payroll_payments_84572d1aa4eb')->references(['id'])->on('payrolls')->cascadeOnDelete();
            $table->foreign(['payroll_id'], 'fk_payroll_payments_9d2a492ab1c5')->references(['id'])->on('payrolls')->nullOnDelete();
        });

        Schema::table('payroll_periods', function (Blueprint $table): void {
            $table->foreign(['locked_by'], 'fk_payroll_periods_efe3b0dc9096')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_payroll_periods_ee14c980c792')->references(['id'])->on('branches')->cascadeOnDelete();
        });

        Schema::table('payroll_settings', function (Blueprint $table): void {
            $table->foreign(['bank_account_id'], 'fk_payroll_settings_58a00e2bfcd3')->references(['id'])->on('bank_accounts')->nullOnDelete();
            $table->foreign(['benefit_payable_account_id'], 'fk_payroll_settings_081e8ac556e7')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['tax_payable_account_id'], 'fk_payroll_settings_ce1716a9b232')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['salary_payable_account_id'], 'fk_payroll_settings_28c1f2070bd3')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['salary_expense_account_id'], 'fk_payroll_settings_51d3cb675a6d')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_payroll_settings_eba881e16c7c')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_payroll_settings_e027efdc7389')->references(['id'])->on('branches')->cascadeOnDelete();
        });

        Schema::table('payrolls', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_payrolls_85b0b2678778')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['reopened_by'], 'fk_payrolls_fbc57cd93b96')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['processed_by'], 'fk_payrolls_e7908d919236')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['source_account_id'], 'fk_payrolls_98cc9b3d8139')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['payroll_period_id'], 'fk_payrolls_10f7ebc8b766')->references(['id'])->on('payroll_periods')->restrictOnDelete();
            $table->foreign(['branch_id'], 'fk_payrolls_fb62b25636ee')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_payrolls_1bd5cbf2f446')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['generated_by'], 'fk_payrolls_caa22463c3d4')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['approved_by'], 'fk_payrolls_5d950634d762')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['paid_by'], 'fk_payrolls_fec4e9382fc6')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['locked_by'], 'fk_payrolls_59101de94fae')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['voided_by'], 'fk_payrolls_e7ae4e61383e')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_payrolls_fa4f37c16390')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['payment_journal_voucher_id'], 'fk_payrolls_b20dead29b46')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['reversal_journal_voucher_id'], 'fk_payrolls_1f9b9a0a3bcb')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['payment_reversal_journal_voucher_id'], 'fk_payrolls_bdf32bebfa82')->references(['id'])->on('journal_vouchers')->nullOnDelete();
        });

        Schema::table('payslip_lines', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_payslip_lines_da44049db456')->references(['id'])->on('salary_components')->nullOnDelete();
            $table->foreign(['payslip_id'], 'fk_payslip_lines_f710c49f8e3b')->references(['id'])->on('payslips')->cascadeOnDelete();
        });

        Schema::table('payslips', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_payslips_1b83be66077a')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_payslips_55c4ed65c6e7')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_payslips_6f93d6058a13')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_payslips_25c79fe55ddd')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['payroll_run_id'], 'fk_payslips_4597a9b309e9')->references(['id'])->on('payrolls')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_payslips_0504070d3703')->references(['id'])->on('branches');
            $table->foreign(['user_id'], 'fk_payslips_1b708c863e3d')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_payslips_7c3d1e6501b8')->references(['id'])->on('users');
            $table->foreign(['payroll_id'], 'fk_payslips_66db4622b5d4')->references(['id'])->on('payrolls')->nullOnDelete();
        });

        Schema::table('permissions', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_permissions_5a3a1ea20a11')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_permissions_05750364627c')->references(['id'])->on('branches')->nullOnDelete();
        });

        Schema::table('pos_cash_movements', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_pos_cash_movements_45155bd7a2b2')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_pos_cash_movements_e1e2978c3cab')->references(['id'])->on('users');
            $table->foreign(['account_id'], 'fk_pos_cash_movements_81272b9b5996')->references(['id'])->on('accounts');
            $table->foreign(['pos_shift_id'], 'fk_pos_cash_movements_40d9dfac3e7b')->references(['id'])->on('pos_shifts');
            $table->foreign(['pos_terminal_id'], 'fk_pos_cash_movements_f47365839646')->references(['id'])->on('pos_terminals');
            $table->foreign(['branch_id'], 'fk_pos_cash_movements_8abc26b83018')->references(['id'])->on('branches');
        });

        Schema::table('pos_payments', function (Blueprint $table): void {
            $table->foreign(['account_id'], 'fk_pos_payments_747903f38e04')->references(['id'])->on('accounts');
            $table->foreign(['pos_sale_id'], 'fk_pos_payments_7347ffb4fe9a')->references(['id'])->on('pos_sales');
        });

        Schema::table('pos_return_lines', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_pos_return_lines_d3d260ed886b')->references(['id'])->on('products');
            $table->foreign(['pos_sale_line_id'], 'fk_pos_return_lines_f670b24714de')->references(['id'])->on('pos_sale_lines');
            $table->foreign(['pos_return_id'], 'fk_pos_return_lines_014acca2ef4f')->references(['id'])->on('pos_returns');
        });

        Schema::table('pos_returns', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_pos_returns_44ad7b1e4543')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_pos_returns_f8e1eb2362c4')->references(['id'])->on('branches');
            $table->foreign(['pos_sale_id'], 'fk_pos_returns_8fd496535020')->references(['id'])->on('pos_sales');
            $table->foreign(['sales_return_id'], 'fk_pos_returns_e3fdb7e2abc5')->references(['id'])->on('sales_returns');
            $table->foreign(['pos_shift_id'], 'fk_pos_returns_b188271cbfc1')->references(['id'])->on('pos_shifts');
            $table->foreign(['approved_by_id'], 'fk_pos_returns_dd5291b0e863')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_pos_returns_799cdd18cdf6')->references(['id'])->on('users');
        });

        Schema::table('pos_sale_lines', function (Blueprint $table): void {
            $table->foreign(['tax_rate_id'], 'fk_pos_sale_lines_f099b4edf856')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_pos_sale_lines_606e99c613bb')->references(['id'])->on('products');
            $table->foreign(['pos_sale_id'], 'fk_pos_sale_lines_3d5208a97c74')->references(['id'])->on('pos_sales');
        });

        Schema::table('pos_sales', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_pos_sales_ae1c71961ddd')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_pos_sales_6d35c5c7f590')->references(['id'])->on('branches');
            $table->foreign(['pos_terminal_id'], 'fk_pos_sales_9b0cbf08fb4f')->references(['id'])->on('pos_terminals');
            $table->foreign(['pos_shift_id'], 'fk_pos_sales_71aa1497f077')->references(['id'])->on('pos_shifts');
            $table->foreign(['warehouse_id'], 'fk_pos_sales_7d9a16ee4526')->references(['id'])->on('warehouses');
            $table->foreign(['contact_id'], 'fk_pos_sales_3070010b5393')->references(['id'])->on('contacts');
            $table->foreign(['invoice_id'], 'fk_pos_sales_ad011aa3ec25')->references(['id'])->on('invoices');
            $table->foreign(['customer_payment_id'], 'fk_pos_sales_3f0031430f03')->references(['id'])->on('customer_payments');
            $table->foreign(['sales_return_id'], 'fk_pos_sales_74842e4b2968')->references(['id'])->on('sales_returns');
            $table->foreign(['approved_by_id'], 'fk_pos_sales_4d9e9bce5f9b')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_pos_sales_418c5e299c50')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_pos_sales_a353c4fb6a2c')->references(['id'])->on('users');
        });

        Schema::table('pos_shifts', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_pos_shifts_89b40c52e4b8')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_pos_shifts_df10bdc58502')->references(['id'])->on('branches');
            $table->foreign(['pos_terminal_id'], 'fk_pos_shifts_17da237facca')->references(['id'])->on('pos_terminals');
            $table->foreign(['cashier_id'], 'fk_pos_shifts_db23288030d7')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_pos_shifts_5ffc8d7a8578')->references(['id'])->on('users');
        });

        Schema::table('pos_terminals', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_pos_terminals_9fbf0aa14b3a')->references(['id'])->on('users');
            $table->foreign(['default_customer_id'], 'fk_pos_terminals_5c75e3e13ce5')->references(['id'])->on('contacts');
            $table->foreign(['online_account_id'], 'fk_pos_terminals_b5bc7f07f8f0')->references(['id'])->on('accounts');
            $table->foreign(['card_account_id'], 'fk_pos_terminals_cb9cd5ea4869')->references(['id'])->on('accounts');
            $table->foreign(['cash_account_id'], 'fk_pos_terminals_7cb39dc8ba68')->references(['id'])->on('accounts');
            $table->foreign(['warehouse_id'], 'fk_pos_terminals_d51221cd4d29')->references(['id'])->on('warehouses');
            $table->foreign(['branch_id'], 'fk_pos_terminals_05e862f08e94')->references(['id'])->on('branches');
        });

        Schema::table('printing_templates', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_printing_templates_8911419b6d3e')->references(['id'])->on('users');
        });

        Schema::table('priorities', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_priorities_5974c269ecab')->references(['id'])->on('users');
        });

        Schema::table('product_categories', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_product_categories_37158bedad54')->references(['id'])->on('users');
            $table->foreign(['parent_id'], 'fk_product_categories_b4a32278cb29')->references(['id'])->on('product_categories');
        });

        Schema::table('product_tax_categories', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_product_tax_categories_cc8ee2384530')->references(['id'])->on('users');
        });

        Schema::table('product_units', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_product_units_ee7e605d1902')->references(['id'])->on('users');
        });

        Schema::table('product_variant_items', function (Blueprint $table): void {
            $table->foreign(['variant_line_id'], 'fk_product_variant_items_6d8494919d7c')->references(['id'])->on('variant_lines');
            $table->foreign(['product_id'], 'fk_product_variant_items_902cbe377097')->references(['id'])->on('products');
        });

        Schema::table('production_cost_terms', function (Blueprint $table): void {
            $table->foreign(['chart_of_account_id'], 'fk_production_cost_terms_8d537ea2c5fe')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['branch_id'], 'fk_production_cost_terms_7e4017b01085')->references(['id'])->on('branches');
        });

        Schema::table('production_journal_by_products', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_production_journal_by_pr_38564654bed6')->references(['id'])->on('products');
            $table->foreign(['production_journal_id'], 'fk_production_journal_by_pr_2afb0e1d713d')->references(['id'])->on('production_journals')->cascadeOnDelete();
        });

        Schema::table('production_journal_expenses', function (Blueprint $table): void {
            $table->foreign(['cost_term_id'], 'fk_production_journal_expen_3aa8a1ece7e3')->references(['id'])->on('production_cost_terms')->nullOnDelete();
            $table->foreign(['production_journal_id'], 'fk_production_journal_expen_efa6be45034c')->references(['id'])->on('production_journals')->cascadeOnDelete();
        });

        Schema::table('production_journal_raw_materials', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_production_journal_raw_m_df32343a2b8a')->references(['id'])->on('products');
            $table->foreign(['production_journal_id'], 'fk_production_journal_raw_m_5851b28fe2dd')->references(['id'])->on('production_journals')->cascadeOnDelete();
        });

        Schema::table('production_journals', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_production_journals_15ee42723d4e')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_production_journals_1c6b88b8eab8')->references(['id'])->on('branches');
            $table->foreign(['finished_product_id'], 'fk_production_journals_c5addae86e8d')->references(['id'])->on('products');
            $table->foreign(['warehouse_id'], 'fk_production_journals_d48ca04295fc')->references(['id'])->on('warehouses');
            $table->foreign(['approved_by_id'], 'fk_production_journals_df07afebb5d7')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_production_journals_946dbc62e453')->references(['id'])->on('users');
            $table->foreign(['journal_voucher_id'], 'fk_production_journals_49c0bce4c68a')->references(['id'])->on('journal_vouchers');
            $table->foreign(['user_add_id'], 'fk_production_journals_32b251248013')->references(['id'])->on('users');
        });

        Schema::table('production_order_byproducts', function (Blueprint $table): void {
            $table->foreign(['product_unit_id'], 'fk_production_order_byprodu_c84d74a6d39c')->references(['id'])->on('product_units');
            $table->foreign(['warehouse_id'], 'fk_production_order_byprodu_bf46e52a20d9')->references(['id'])->on('warehouses');
            $table->foreign(['product_id'], 'fk_production_order_byprodu_ac5518bbe830')->references(['id'])->on('products');
            $table->foreign(['production_order_id'], 'fk_production_order_byprodu_43821acddd24')->references(['id'])->on('production_orders')->cascadeOnDelete();
        });

        Schema::table('production_order_expenses', function (Blueprint $table): void {
            $table->foreign(['expense_account_id'], 'fk_production_order_expense_b0d37225fd70')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['production_order_id'], 'fk_production_order_expense_782d50b2eafe')->references(['id'])->on('production_orders')->cascadeOnDelete();
        });

        Schema::table('production_order_raw_materials', function (Blueprint $table): void {
            $table->foreign(['product_unit_id'], 'fk_production_order_raw_mat_78bf8a23f77e')->references(['id'])->on('product_units');
            $table->foreign(['warehouse_id'], 'fk_production_order_raw_mat_86dec59fe469')->references(['id'])->on('warehouses');
            $table->foreign(['product_id'], 'fk_production_order_raw_mat_39fa09dd53d3')->references(['id'])->on('products');
            $table->foreign(['production_order_id'], 'fk_production_order_raw_mat_fe663a60cbed')->references(['id'])->on('production_orders')->cascadeOnDelete();
        });

        Schema::table('production_orders', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_production_orders_aad1a0cce86e')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_production_orders_e3b3e85153c6')->references(['id'])->on('branches');
            $table->foreign(['finished_product_id'], 'fk_production_orders_d18e96449803')->references(['id'])->on('products');
            $table->foreign(['warehouse_id'], 'fk_production_orders_8ec7d8d6a7bc')->references(['id'])->on('warehouses');
            $table->foreign(['product_unit_id'], 'fk_production_orders_fa7fc2279a2c')->references(['id'])->on('product_units');
            $table->foreign(['approved_by_id'], 'fk_production_orders_917a787ca1a0')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_production_orders_793b3a87edcf')->references(['id'])->on('users');
            $table->foreign(['journal_voucher_id'], 'fk_production_orders_fd402ed83efd')->references(['id'])->on('journal_vouchers');
            $table->foreign(['user_add_id'], 'fk_production_orders_11f544a21955')->references(['id'])->on('users');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_products_469e120ab22e')->references(['id'])->on('users');
            $table->foreign(['purchase_return_account_id'], 'fk_products_743679d3e981')->references(['id'])->on('accounts');
            $table->foreign(['sales_return_account_id'], 'fk_products_90416b92fcef')->references(['id'])->on('accounts');
            $table->foreign(['purchase_account_id'], 'fk_products_063b5b3c1a24')->references(['id'])->on('accounts');
            $table->foreign(['sales_account_id'], 'fk_products_f318b05a9222')->references(['id'])->on('accounts');
            $table->foreign(['tax_class_id'], 'fk_products_5cffe566b32c')->references(['id'])->on('tax_classes');
            $table->foreign(['product_unit_id'], 'fk_products_1c1084896b71')->references(['id'])->on('product_units');
            $table->foreign(['product_tax_category_id'], 'fk_products_7b816bdb31af')->references(['id'])->on('product_tax_categories');
            $table->foreign(['product_category_id'], 'fk_products_cc6cbaa31daa')->references(['id'])->on('product_categories');
            $table->foreign(['parent_id'], 'fk_products_45683e51f812')->references(['id'])->on('products');
        });

        Schema::table('proforma_invoice_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_proforma_invoice_lines_c6f17e585bb2')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_proforma_invoice_lines_a7820e4f91ac')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_proforma_invoice_lines_9289799576dc')->references(['id'])->on('products');
            $table->foreign(['proforma_invoice_id'], 'fk_proforma_invoice_lines_4462d36b934e')->references(['id'])->on('proforma_invoices');
        });

        Schema::table('proforma_invoices', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_proforma_invoices_0b4d6462679d')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_proforma_invoices_9cf089e5cd59')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_proforma_invoices_c9f15335460b')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_proforma_invoices_f300e4e6489d')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_proforma_invoices_bd2afb3785be')->references(['id'])->on('currencies');
            $table->foreign(['contact_id'], 'fk_proforma_invoices_cec49ce87867')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_proforma_invoices_211ba278f413')->references(['id'])->on('branches');
        });

        Schema::table('project_team_members', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_project_team_members_9f9ad3177f90')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_project_team_members_4aa81573a27f')->references(['id'])->on('users');
            $table->foreign(['project_team_id'], 'fk_project_team_members_30d1a3337605')->references(['id'])->on('project_teams');
        });

        Schema::table('project_teams', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_project_teams_027cdca394b2')->references(['id'])->on('users');
            $table->foreign(['project_id'], 'fk_project_teams_1c8daf752d08')->references(['id'])->on('projects');
        });

        Schema::table('projects', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_projects_a2bffe696f01')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['project_manager_id'], 'fk_projects_4ce5a896cd79')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_projects_7d9ac341172f')->references(['id'])->on('users');
        });

        Schema::table('public_holidays', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_public_holidays_daf6ae32866e')->references(['id'])->on('users');
        });

        Schema::table('purchase_bill_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_purchase_bill_lines_690fc032e29f')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_purchase_bill_lines_aa9feedc4075')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_purchase_bill_lines_c0b53c483f36')->references(['id'])->on('products');
            $table->foreign(['purchase_bill_id'], 'fk_purchase_bill_lines_c5a8e95b907b')->references(['id'])->on('purchase_bills');
        });

        Schema::table('purchase_bills', function (Blueprint $table): void {
            $table->foreign(['project_id'], 'fk_purchase_bills_fbc1909c269c')->references(['id'])->on('projects')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_purchase_bills_e9f1bfd05dbe')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_purchase_bills_f0a16c35935a')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_purchase_bills_210f5840fb45')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_purchase_bills_915b1a95a984')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_purchase_bills_427b344c3b5c')->references(['id'])->on('currencies');
            $table->foreign(['warehouse_id'], 'fk_purchase_bills_3cb1616d7dd5')->references(['id'])->on('warehouses');
            $table->foreign(['contact_id'], 'fk_purchase_bills_a42b67c6eb64')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_purchase_bills_f2e4478dc300')->references(['id'])->on('branches');
            $table->foreign(['fiscal_year_id'], 'fk_purchase_bills_ac13ee7dfe35')->references(['id'])->on('fiscal_years')->nullOnDelete();
        });

        Schema::table('purchase_configurations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_purchase_configurations_62bb784b0aef')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['default_purchase_tax_id'], 'fk_purchase_configurations_ededc6c6e9f4')->references(['id'])->on('tax_rates')->nullOnDelete();
            $table->foreign(['default_supplier_account_id'], 'fk_purchase_configurations_7c68d0f268f8')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::table('purchase_order_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_purchase_order_lines_8f32ea139530')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_purchase_order_lines_b2e1e107a519')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_purchase_order_lines_2ed65cde97e6')->references(['id'])->on('products');
            $table->foreign(['purchase_order_id'], 'fk_purchase_order_lines_9f11330dade1')->references(['id'])->on('purchase_orders');
        });

        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_purchase_orders_1e773e8fad73')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_purchase_orders_76dd20017592')->references(['id'])->on('branches');
            $table->foreign(['contact_id'], 'fk_purchase_orders_74b79cf798ce')->references(['id'])->on('contacts');
            $table->foreign(['currency_id'], 'fk_purchase_orders_a95160f9dda8')->references(['id'])->on('currencies');
            $table->foreign(['credit_term_id'], 'fk_purchase_orders_4484a4096119')->references(['id'])->on('credit_terms');
            $table->foreign(['approved_by_id'], 'fk_purchase_orders_7214679dc778')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_purchase_orders_bbc1d83ab6d5')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_purchase_orders_89d05a1e71d6')->references(['id'])->on('users');
        });

        Schema::table('quotation_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_quotation_lines_bc3a8606407d')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_quotation_lines_328494c10650')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_quotation_lines_653d902019a4')->references(['id'])->on('products');
            $table->foreign(['quotation_id'], 'fk_quotation_lines_5aa5e4fd088d')->references(['id'])->on('quotations');
        });

        Schema::table('quotations', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_quotations_0b8383aea9b0')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_quotations_ee8251c072a8')->references(['id'])->on('branches');
            $table->foreign(['contact_id'], 'fk_quotations_686772ca37ff')->references(['id'])->on('contacts');
            $table->foreign(['credit_term_id'], 'fk_quotations_827f286e3f3b')->references(['id'])->on('credit_terms');
            $table->foreign(['currency_id'], 'fk_quotations_d07a0cebca0d')->references(['id'])->on('currencies');
            $table->foreign(['approved_by_id'], 'fk_quotations_be2dd84bd346')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_quotations_2ce26b64e583')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_quotations_8fdf1492b6df')->references(['id'])->on('users');
        });

        Schema::table('reporting_tag_lines', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_reporting_tag_lines_e0d07fa7ddfe')->references(['id'])->on('users');
            $table->foreign(['reporting_tag_id'], 'fk_reporting_tag_lines_059d7e9aafe6')->references(['id'])->on('reporting_tags');
        });

        Schema::table('reporting_tag_values', function (Blueprint $table): void {
            $table->foreign(['reporting_tag_line_id'], 'fk_reporting_tag_values_3f31b9418c65')->references(['id'])->on('reporting_tag_lines')->nullOnDelete();
            $table->foreign(['reporting_tag_id'], 'fk_reporting_tag_values_d73ffe728cc4')->references(['id'])->on('reporting_tags')->cascadeOnDelete();
        });

        Schema::table('reporting_tags', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_reporting_tags_dbaca7913c48')->references(['id'])->on('users');
        });

        Schema::table('role_has_permissions', function (Blueprint $table): void {
            $table->foreign(['role_id'], 'fk_role_has_permissions_495c5fc2e8c9')->references(['id'])->on('roles')->cascadeOnDelete();
            $table->foreign(['permission_id'], 'fk_role_has_permissions_b834b84b9aef')->references(['id'])->on('permissions')->cascadeOnDelete();
        });

        Schema::table('role_permissions', function (Blueprint $table): void {
            $table->foreign(['permission_id'], 'fk_role_permissions_8d1eb3ff16be')->references(['id'])->on('permissions')->cascadeOnDelete();
            $table->foreign(['role_id'], 'fk_role_permissions_605407dcd347')->references(['id'])->on('roles')->cascadeOnDelete();
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_roles_32ce3ae18a70')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_roles_ffebe6c47d86')->references(['id'])->on('branches')->nullOnDelete();
        });

        Schema::table('salary_components', function (Blueprint $table): void {
            $table->foreign(['accounting_account_id'], 'fk_salary_components_8d5b997d5e53')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::table('salary_histories', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_salary_histories_75d2e5e8642c')->references(['id'])->on('users');
            $table->foreign(['user_id'], 'fk_salary_histories_24fd25c2337a')->references(['id'])->on('users');
        });

        Schema::table('salary_structure_lines', function (Blueprint $table): void {
            $table->foreign(['component_id'], 'fk_salary_structure_lines_8aefce45159d')->references(['id'])->on('salary_components')->restrictOnDelete();
            $table->foreign(['salary_structure_id'], 'fk_salary_structure_lines_22ebe47014e7')->references(['id'])->on('salary_structures')->cascadeOnDelete();
        });

        Schema::table('salary_structures', function (Blueprint $table): void {
            $table->foreign(['updated_by'], 'fk_salary_structures_15345eb38dca')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['created_by'], 'fk_salary_structures_d5acbabd4182')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['currency_id'], 'fk_salary_structures_dfe3597e4285')->references(['id'])->on('currencies')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_salary_structures_fe76f6edf03d')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['employee_id'], 'fk_salary_structures_3bcd6264883f')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('sales_configurations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_sales_configurations_de0a81b522e8')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['default_sales_tax_id'], 'fk_sales_configurations_7ac9a0f2d250')->references(['id'])->on('tax_rates')->nullOnDelete();
            $table->foreign(['default_customer_account_id'], 'fk_sales_configurations_5570a98488b9')->references(['id'])->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::table('sales_order_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_sales_order_lines_31ab47080665')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_sales_order_lines_e95b54e5a611')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_sales_order_lines_203e342e2380')->references(['id'])->on('products');
            $table->foreign(['sales_order_id'], 'fk_sales_order_lines_c184f18f9738')->references(['id'])->on('sales_orders');
        });

        Schema::table('sales_orders', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_sales_orders_a085769ccb1b')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_sales_orders_8a775af26ada')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_sales_orders_44448b969fc7')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_sales_orders_a65267029ebb')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_sales_orders_3de23dbd4069')->references(['id'])->on('currencies');
            $table->foreign(['warehouse_id'], 'fk_sales_orders_b6c04b87f3e1')->references(['id'])->on('warehouses');
            $table->foreign(['contact_id'], 'fk_sales_orders_8efe2d1b82e3')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_sales_orders_df3a64fa143d')->references(['id'])->on('branches');
        });

        Schema::table('sales_return_lines', function (Blueprint $table): void {
            $table->foreign(['tax_jurisdiction_id'], 'fk_sales_return_lines_0d790b361fbb')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_rate_id'], 'fk_sales_return_lines_0b090c6ef5df')->references(['id'])->on('tax_rates');
            $table->foreign(['product_id'], 'fk_sales_return_lines_5851d98cfd48')->references(['id'])->on('products');
            $table->foreign(['sales_return_id'], 'fk_sales_return_lines_f8a2ea8ad428')->references(['id'])->on('sales_returns');
        });

        Schema::table('sales_returns', function (Blueprint $table): void {
            $table->foreign(['refund_account_id'], 'fk_sales_returns_362c068e228f')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_sales_returns_2757d9429c90')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_sales_returns_5429203a0462')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_sales_returns_4fb05176948d')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_sales_returns_02ed766ebd47')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_sales_returns_08b274bdfb43')->references(['id'])->on('currencies');
            $table->foreign(['warehouse_id'], 'fk_sales_returns_463cd002f518')->references(['id'])->on('warehouses');
            $table->foreign(['contact_id'], 'fk_sales_returns_a8e03d608228')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_sales_returns_1affa54004b7')->references(['id'])->on('branches');
            $table->foreign(['fiscal_year_id'], 'fk_sales_returns_b542b8342b27')->references(['id'])->on('fiscal_years')->nullOnDelete();
        });

        Schema::table('shifts', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_shifts_3cb07cda1be9')->references(['id'])->on('users');
        });

        Schema::table('sms_configs', function (Blueprint $table): void {
            $table->foreign(['updated_by'], 'fk_sms_configs_8058cef16d0a')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['created_by'], 'fk_sms_configs_72fd9949de59')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_sms_configs_b564d4f4e882')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_sms_configs_77a41d03d7dd')->references(['id'])->on('users');
        });

        Schema::table('sms_logs', function (Blueprint $table): void {
            $table->foreign(['created_by'], 'fk_sms_logs_f8c7acd306d4')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['campaign_sms_recipient_id'], 'fk_sms_logs_527d86c6df26')->references(['id'])->on('campaign_sms_recipients')->nullOnDelete();
            $table->foreign(['campaign_sms_message_id'], 'fk_sms_logs_2f715473cd25')->references(['id'])->on('campaign_sms_messages')->nullOnDelete();
            $table->foreign(['campaign_id'], 'fk_sms_logs_feb8db68d533')->references(['id'])->on('crm_campaigns')->nullOnDelete();
            $table->foreign(['sms_template_id'], 'fk_sms_logs_c194717da731')->references(['id'])->on('sms_templates')->nullOnDelete();
            $table->foreign(['sms_config_id'], 'fk_sms_logs_bdf1a93015eb')->references(['id'])->on('sms_configs')->nullOnDelete();
        });

        Schema::table('sms_templates', function (Blueprint $table): void {
            $table->foreign(['updated_by'], 'fk_sms_templates_16d1e5ec819c')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['created_by'], 'fk_sms_templates_f9a0da106a75')->references(['id'])->on('users')->nullOnDelete();
        });

        Schema::table('supplier_payment_lines', function (Blueprint $table): void {
            $table->foreign(['purchase_bill_id'], 'fk_supplier_payment_lines_eb6327ef4f5f')->references(['id'])->on('purchase_bills');
            $table->foreign(['supplier_payment_id'], 'fk_supplier_payment_lines_939ae27cc4b4')->references(['id'])->on('supplier_payments');
        });

        Schema::table('supplier_payments', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_supplier_payments_39bb2d8bfca3')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['journal_voucher_id'], 'fk_supplier_payments_67f62396687f')->references(['id'])->on('journal_vouchers')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_supplier_payments_a747627a3c12')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_supplier_payments_06595d2cca68')->references(['id'])->on('users');
            $table->foreign(['approved_by_id'], 'fk_supplier_payments_e3bbbb7fa84c')->references(['id'])->on('users');
            $table->foreign(['currency_id'], 'fk_supplier_payments_2ff7caa76014')->references(['id'])->on('currencies');
            $table->foreign(['account_id'], 'fk_supplier_payments_5c644ba69b27')->references(['id'])->on('accounts');
            $table->foreign(['contact_id'], 'fk_supplier_payments_feb26c837b7f')->references(['id'])->on('contacts');
            $table->foreign(['branch_id'], 'fk_supplier_payments_15e82c3d9a3e')->references(['id'])->on('branches');
            $table->foreign(['bank_charges_account_id'], 'fk_supplier_payments_0ae341430007')->references(['id'])->on('accounts')->nullOnDelete();
            $table->foreign(['tds_charges_account_id'], 'fk_supplier_payments_f0a11324df20')->references(['id'])->on('accounts')->nullOnDelete();
        });

        Schema::table('task_statuses', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_task_statuses_8d2ba5671e7c')->references(['id'])->on('users');
            $table->foreign(['project_id'], 'fk_task_statuses_d6eb3529e899')->references(['id'])->on('projects');
        });

        Schema::table('tasks', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tasks_de77197f5c6f')->references(['id'])->on('users');
            $table->foreign(['task_status_id'], 'fk_tasks_39e6d1364c5d')->references(['id'])->on('task_statuses');
            $table->foreign(['priority_id'], 'fk_tasks_5d999057a63e')->references(['id'])->on('priorities');
            $table->foreign(['milestone_id'], 'fk_tasks_5f2b42ef2c10')->references(['id'])->on('milestones');
            $table->foreign(['project_id'], 'fk_tasks_192dd2f65a6c')->references(['id'])->on('projects');
        });

        Schema::table('tax_classes', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_classes_996ce02e2d7b')->references(['id'])->on('users');
            $table->foreign(['tax_jurisdiction_id'], 'fk_tax_classes_6b5fa4976a8e')->references(['id'])->on('tax_jurisdictions');
        });

        Schema::table('tax_exemptions', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_exemptions_b75af96f6bbe')->references(['id'])->on('users');
            $table->foreign(['product_tax_category_id'], 'fk_tax_exemptions_3426723c15ac')->references(['id'])->on('product_tax_categories');
            $table->foreign(['contact_id'], 'fk_tax_exemptions_6497ff3a5536')->references(['id'])->on('contacts');
        });

        Schema::table('tax_jurisdictions', function (Blueprint $table): void {
            $table->foreign(['tax_system_id'], 'fk_tax_jurisdictions_0895c880061e')->references(['id'])->on('tax_systems')->nullOnDelete();
            $table->foreign(['user_add_id'], 'fk_tax_jurisdictions_9e89a81f6b92')->references(['id'])->on('users');
        });

        Schema::table('tax_rate_components', function (Blueprint $table): void {
            $table->foreign(['account_id'], 'fk_tax_rate_components_6f0f824c3c5b')->references(['id'])->on('chart_of_accounts');
            $table->foreign(['tax_rate_id'], 'fk_tax_rate_components_9b34ee0030ba')->references(['id'])->on('tax_rates');
        });

        Schema::table('tax_rates', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_rates_f7a6777b80ae')->references(['id'])->on('users');
            $table->foreign(['tax_jurisdiction_id'], 'fk_tax_rates_3101c7fb6f9c')->references(['id'])->on('tax_jurisdictions');
            $table->foreign(['tax_class_id'], 'fk_tax_rates_c4698c0689dd')->references(['id'])->on('tax_classes');
        });

        Schema::table('tax_registrations', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_registrations_bf2826961979')->references(['id'])->on('users');
            $table->foreign(['tax_jurisdiction_id'], 'fk_tax_registrations_8ce4202072ee')->references(['id'])->on('tax_jurisdictions');
        });

        Schema::table('tax_report_templates', function (Blueprint $table): void {
            $table->foreign(['tax_system_id'], 'fk_tax_report_templates_a59087046d4d')->references(['id'])->on('tax_systems')->nullOnDelete();
        });

        Schema::table('tax_rules', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_rules_650fdb2fde93')->references(['id'])->on('users');
            $table->foreign(['product_tax_category_id'], 'fk_tax_rules_4b64f1bffe34')->references(['id'])->on('product_tax_categories');
            $table->foreign(['tax_rate_id'], 'fk_tax_rules_5d038e43d923')->references(['id'])->on('tax_rates');
            $table->foreign(['tax_jurisdiction_id'], 'fk_tax_rules_472cd24597f0')->references(['id'])->on('tax_jurisdictions');
        });

        Schema::table('tax_systems', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_tax_systems_723915b69467')->references(['id'])->on('users');
        });

        Schema::table('user_app_contexts', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_user_app_contexts_6dbedbbd1285')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_user_app_contexts_6524db4734da')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['user_id'], 'fk_user_app_contexts_c1c3625a70be')->references(['id'])->on('users')->cascadeOnDelete();
        });

        Schema::table('user_logs', function (Blueprint $table): void {
            $table->foreign(['branch_id'], 'fk_user_logs_f06caa2b8b5b')->references(['id'])->on('branches');
            $table->foreign(['user_id'], 'fk_user_logs_a4ddda0e225e')->references(['id'])->on('users');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_users_6d2c9dc9667e')->references(['id'])->on('users')->nullOnDelete();
            $table->foreign(['weekly_holiday_id'], 'fk_users_99089d28dfee')->references(['id'])->on('weekly_holidays')->nullOnDelete();
            $table->foreign(['leave_policy_id'], 'fk_users_06a17de2001b')->references(['id'])->on('leave_policies')->nullOnDelete();
            $table->foreign(['shift_id'], 'fk_users_91d356e9fe1a')->references(['id'])->on('shifts')->nullOnDelete();
            $table->foreign(['department_id'], 'fk_users_5a150283ddd4')->references(['id'])->on('departments')->nullOnDelete();
            $table->foreign(['employment_status_id'], 'fk_users_aa79d7aa1051')->references(['id'])->on('employment_statuses')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_users_108785470597')->references(['id'])->on('branches')->nullOnDelete();
            $table->foreign(['payroll_account_id'], 'fk_users_5a2b849be0ce')->references(['id'])->on('accounts')->nullOnDelete();
        });

        Schema::table('variant_lines', function (Blueprint $table): void {
            $table->foreign(['variant_id'], 'fk_variant_lines_53b6d4e554ae')->references(['id'])->on('variants');
        });

        Schema::table('variants', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_variants_14ee85f1da87')->references(['id'])->on('users');
        });

        Schema::table('warehouse_items', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_warehouse_items_83db268d80f9')->references(['id'])->on('products');
            $table->foreign(['warehouse_id'], 'fk_warehouse_items_1e3f32969910')->references(['id'])->on('warehouses');
            $table->foreign(['branch_id'], 'fk_warehouse_items_821f6c231deb')->references(['id'])->on('branches');
        });

        Schema::table('warehouse_transfer_lines', function (Blueprint $table): void {
            $table->foreign(['product_id'], 'fk_warehouse_transfer_lines_b52f08178122')->references(['id'])->on('products');
            $table->foreign(['warehouse_transfer_id'], 'fk_warehouse_transfer_lines_713b0809ebac')->references(['id'])->on('warehouse_transfers');
        });

        Schema::table('warehouse_transfers', function (Blueprint $table): void {
            $table->foreign(['fiscal_year_id'], 'fk_warehouse_transfers_693a80a168f3')->references(['id'])->on('fiscal_years')->nullOnDelete();
            $table->foreign(['branch_id'], 'fk_warehouse_transfers_55dfb87b12b2')->references(['id'])->on('branches');
            $table->foreign(['from_warehouse_id'], 'fk_warehouse_transfers_807258070a64')->references(['id'])->on('warehouses');
            $table->foreign(['to_warehouse_id'], 'fk_warehouse_transfers_c9389ba57156')->references(['id'])->on('warehouses');
            $table->foreign(['approved_by_id'], 'fk_warehouse_transfers_d82ffe4e6e78')->references(['id'])->on('users');
            $table->foreign(['voided_by_id'], 'fk_warehouse_transfers_5c3f9648fe3d')->references(['id'])->on('users');
            $table->foreign(['user_add_id'], 'fk_warehouse_transfers_371710e85693')->references(['id'])->on('users');
        });

        Schema::table('warehouses', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_warehouses_1aa6181b0b6b')->references(['id'])->on('users');
            $table->foreign(['branch_id'], 'fk_warehouses_a542e7791234')->references(['id'])->on('branches');
        });

        Schema::table('weekly_holidays', function (Blueprint $table): void {
            $table->foreign(['user_add_id'], 'fk_weekly_holidays_47c49b99f70b')->references(['id'])->on('users');
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('weekly_holidays');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('warehouse_transfers');
        Schema::dropIfExists('warehouse_transfer_lines');
        Schema::dropIfExists('warehouse_items');
        Schema::dropIfExists('variants');
        Schema::dropIfExists('variant_lines');
        Schema::dropIfExists('users');
        Schema::dropIfExists('user_logs');
        Schema::dropIfExists('user_app_contexts');
        Schema::dropIfExists('tax_systems');
        Schema::dropIfExists('tax_slabs');
        Schema::dropIfExists('tax_settings');
        Schema::dropIfExists('tax_rules');
        Schema::dropIfExists('tax_report_templates');
        Schema::dropIfExists('tax_registrations');
        Schema::dropIfExists('tax_rates');
        Schema::dropIfExists('tax_rate_components');
        Schema::dropIfExists('tax_jurisdictions');
        Schema::dropIfExists('tax_exemptions');
        Schema::dropIfExists('tax_classes');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('task_statuses');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('support_ticket_comments');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_payment_lines');
        Schema::dropIfExists('sms_templates');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_configs');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('sales_returns');
        Schema::dropIfExists('sales_return_lines');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('sales_order_lines');
        Schema::dropIfExists('sales_configurations');
        Schema::dropIfExists('salary_structures');
        Schema::dropIfExists('salary_structure_lines');
        Schema::dropIfExists('salary_histories');
        Schema::dropIfExists('salary_components');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('reporting_tags');
        Schema::dropIfExists('reporting_tag_values');
        Schema::dropIfExists('reporting_tag_lines');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('quotation_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('purchase_order_lines');
        Schema::dropIfExists('purchase_configurations');
        Schema::dropIfExists('purchase_bills');
        Schema::dropIfExists('purchase_bill_lines');
        Schema::dropIfExists('public_holidays');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('project_teams');
        Schema::dropIfExists('project_team_members');
        Schema::dropIfExists('proforma_invoices');
        Schema::dropIfExists('proforma_invoice_lines');
        Schema::dropIfExists('products');
        Schema::dropIfExists('production_orders');
        Schema::dropIfExists('production_order_raw_materials');
        Schema::dropIfExists('production_order_expenses');
        Schema::dropIfExists('production_order_byproducts');
        Schema::dropIfExists('production_journals');
        Schema::dropIfExists('production_journal_raw_materials');
        Schema::dropIfExists('production_journal_expenses');
        Schema::dropIfExists('production_journal_by_products');
        Schema::dropIfExists('production_cost_terms');
        Schema::dropIfExists('product_variant_items');
        Schema::dropIfExists('product_units');
        Schema::dropIfExists('product_tax_categories');
        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('priorities');
        Schema::dropIfExists('printing_templates');
        Schema::dropIfExists('pos_terminals');
        Schema::dropIfExists('pos_shifts');
        Schema::dropIfExists('pos_sales');
        Schema::dropIfExists('pos_sale_lines');
        Schema::dropIfExists('pos_returns');
        Schema::dropIfExists('pos_return_lines');
        Schema::dropIfExists('pos_payments');
        Schema::dropIfExists('pos_cash_movements');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payslip_lines');
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('payroll_settings');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('payroll_payments');
        Schema::dropIfExists('payroll_deductions');
        Schema::dropIfExists('payroll_additions');
        Schema::dropIfExists('payment_webhook_logs');
        Schema::dropIfExists('payment_gateway_settings');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('online_payments');
        Schema::dropIfExists('online_payment_settings');
        Schema::dropIfExists('onboarding_checklists');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('milestones');
        Schema::dropIfExists('master_data');
        Schema::dropIfExists('loan_top_ups');
        Schema::dropIfExists('loan_paybacks');
        Schema::dropIfExists('loan_charges');
        Schema::dropIfExists('loan_accounts');
        Schema::dropIfExists('leave_types');
        Schema::dropIfExists('leave_policies');
        Schema::dropIfExists('leave_applications');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('languages');
        Schema::dropIfExists('journal_vouchers');
        Schema::dropIfExists('journal_voucher_lines');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('invoice_payment_links');
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('inventory_ledgers');
        Schema::dropIfExists('inventory_configurations');
        Schema::dropIfExists('inventory_adjustments');
        Schema::dropIfExists('inventory_adjustment_lines');
        Schema::dropIfExists('hrm_configurations');
        Schema::dropIfExists('general_settings');
        Schema::dropIfExists('fiscal_years');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_lines');
        Schema::dropIfExists('employment_statuses');
        Schema::dropIfExists('employee_reimbursements');
        Schema::dropIfExists('employee_profiles');
        Schema::dropIfExists('employee_documents');
        Schema::dropIfExists('employee_deductions');
        Schema::dropIfExists('employee_additions');
        Schema::dropIfExists('emails');
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('email_configs');
        Schema::dropIfExists('education');
        Schema::dropIfExists('document_uploads');
        Schema::dropIfExists('document_transaction_proposals');
        Schema::dropIfExists('document_numberings');
        Schema::dropIfExists('document_links');
        Schema::dropIfExists('document_extractions');
        Schema::dropIfExists('document_entity_matches');
        Schema::dropIfExists('designations');
        Schema::dropIfExists('designation_histories');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('debit_notes');
        Schema::dropIfExists('debit_note_lines');
        Schema::dropIfExists('deals');
        Schema::dropIfExists('deal_stages');
        Schema::dropIfExists('deal_pipelines');
        Schema::dropIfExists('customer_payments');
        Schema::dropIfExists('customer_payment_lines');
        Schema::dropIfExists('custom_templates');
        Schema::dropIfExists('custom_fields');
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('custom_field_validations');
        Schema::dropIfExists('custom_field_modules');
        Schema::dropIfExists('custom_field_choices');
        Schema::dropIfExists('currencies');
        Schema::dropIfExists('crm_sequences');
        Schema::dropIfExists('crm_sequence_steps');
        Schema::dropIfExists('crm_notes');
        Schema::dropIfExists('crm_deal_stage_histories');
        Schema::dropIfExists('crm_customer_health_scores');
        Schema::dropIfExists('crm_contact_roles');
        Schema::dropIfExists('crm_communications');
        Schema::dropIfExists('crm_campaigns');
        Schema::dropIfExists('crm_attributions');
        Schema::dropIfExists('crm_activity_escalations');
        Schema::dropIfExists('crm_activity_comments');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_accounts');
        Schema::dropIfExists('credit_terms');
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('contact_groups');
        Schema::dropIfExists('cheque_registers');
        Schema::dropIfExists('cheque_format_configurations');
        Schema::dropIfExists('chart_of_accounts');
        Schema::dropIfExists('cash_transfers');
        Schema::dropIfExists('cash_transfer_lines');
        Schema::dropIfExists('campaign_sms_recipients');
        Schema::dropIfExists('campaign_sms_messages');
        Schema::dropIfExists('campaign_send_logs');
        Schema::dropIfExists('campaign_email_recipients');
        Schema::dropIfExists('campaign_email_messages');
        Schema::dropIfExists('campaign_email_attachments');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('bills_of_material');
        Schema::dropIfExists('bill_of_material_raw_materials');
        Schema::dropIfExists('bill_of_material_expenses');
        Schema::dropIfExists('bill_of_material_by_products');
        Schema::dropIfExists('benefit_rules');
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('bank_reconciliation_items');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('awards');
        Schema::dropIfExists('award_histories');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('attendance_summaries');
        Schema::dropIfExists('assigned_tasks');
        Schema::dropIfExists('approval_workflows');
        Schema::dropIfExists('approval_logs');
        Schema::dropIfExists('application_settings');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('alert_types');
        Schema::dropIfExists('ai_tool_calls');
        Schema::dropIfExists('ai_action_audit_logs');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_pending_actions');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_knowledge_chunks');
        Schema::dropIfExists('ai_embeddings');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('accounting_configurations');

        Schema::enableForeignKeyConstraints();
    }
};
