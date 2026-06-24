<?php

use App\Http\Controllers\Api\InvoicePaymentLinkController;
use App\Http\Controllers\Api\OnlinePaymentController;
use App\Http\Controllers\Api\OnlinePaymentSettingController;
use App\Http\Controllers\Api\PaymentGatewaySettingController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PublicInvoicePaymentController;
use App\Http\Controllers\Api\Documents\DocumentEntityMatchController;
use App\Http\Controllers\Api\Documents\DocumentExtractionController;
use App\Http\Controllers\Api\Documents\DocumentProposalController;
use App\Http\Controllers\Api\Documents\DocumentUploadController;
use App\Http\Controllers\Api\AI\AiActionApprovalController;
use App\Http\Controllers\Api\AI\AiAssistantController;
use App\Http\Controllers\Api\AI\AiSemanticSearchController;
use App\Http\Controllers\Api\AI\AiSettingsController;
use App\Http\Controllers\Api\AI\AiUsageLogController;
use App\Http\Controllers\Api\Reports\ReportAiSummaryController;
use App\Http\Controllers\Api\AlertTypeController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AppContextController;
use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\ApplicationSettingController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BusinessRuleValidationController;
use App\Http\Controllers\Api\CashTransferController;
use App\Http\Controllers\Api\CreditTermController;
use App\Http\Controllers\Api\CrmActivityController;
use App\Http\Controllers\Api\CrmAccountController;
use App\Http\Controllers\Api\CrmCampaignController;
use App\Http\Controllers\Api\CrmCommunicationController;
use App\Http\Controllers\Api\CrmContactRoleController;
use App\Http\Controllers\Api\CrmInsightController;
use App\Http\Controllers\Api\CrmSequenceController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\CustomTemplateController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\DealPipelineController;
use App\Http\Controllers\Api\DealStageController;
use App\Http\Controllers\Api\DocumentNumberingController;
use App\Http\Controllers\Api\EmployeeProfileController;
use App\Http\Controllers\Api\GeneralSettingController;
use App\Http\Controllers\Api\GlobalSearchController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LoanAccountController;
use App\Http\Controllers\Api\LoanChargeController;
use App\Http\Controllers\Api\LoanTopUpController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\Api\PrintingTemplateController;
use App\Http\Controllers\Api\ProductTaxCategoryController;
use App\Http\Controllers\Api\ReportingTagController;
use App\Http\Controllers\Api\TaxClassController;
use App\Http\Controllers\Api\TaxExemptionController;
use App\Http\Controllers\Api\TaxJurisdictionController;
use App\Http\Controllers\Api\TaxRateController;
use App\Http\Controllers\Api\TaxRegistrationController;
use App\Http\Controllers\Api\TaxRuleController;
use App\Http\Controllers\Api\TaxSettingsController;
use App\Http\Controllers\Api\TaxSystemController;
use App\Http\Controllers\Api\TaxDashboardController;
use App\Http\Controllers\Api\CashTransferLineController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ChequeRegisterController;
use App\Http\Controllers\Api\ChequeFormatConfigurationController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ContactGroupController;
use App\Http\Controllers\Api\CustomerPaymentController;
use App\Http\Controllers\Api\DebitNoteController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\PurchaseBillController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\ProformaInvoiceController;
use App\Http\Controllers\Api\SalesReturnController;
use App\Http\Controllers\Api\SupplierPaymentController;
use App\Http\Controllers\Api\VariantController;
use App\Http\Controllers\Api\JournalVoucherController;
use App\Http\Controllers\Api\JournalVoucherLineController;
use App\Http\Controllers\Api\InventoryAdjustmentController;
use App\Http\Controllers\Api\WarehouseItemController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\WarehouseTransferController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductUnitController;
use App\Http\Controllers\Api\ProductVariantItemController;
use App\Http\Controllers\Api\BillOfMaterialController;
use App\Http\Controllers\Api\ProductionCostTermController;
use App\Http\Controllers\Api\ProductionJournalController;
use App\Http\Controllers\Api\ProductionOrderController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\Pos\PosCashMovementController;
use App\Http\Controllers\Api\Pos\PosPaymentController;
use App\Http\Controllers\Api\Pos\PosReturnController;
use App\Http\Controllers\Api\Pos\PosSaleController;
use App\Http\Controllers\Api\Pos\PosShiftController;
use App\Http\Controllers\Api\Pos\PosTerminalController;
use Illuminate\Support\Facades\Route;

// HRM Controllers
use App\Http\Controllers\Api\EmploymentStatusController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeavePolicyController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\WeeklyHolidayController;
use App\Http\Controllers\Api\ShiftController as HrmShiftController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\UserController as HrmUserController;
use App\Http\Controllers\Api\DesignationHistoryController;
use App\Http\Controllers\Api\SalaryHistoryController;
use App\Http\Controllers\Api\EducationController;
use App\Http\Controllers\Api\LeaveApplicationController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\AwardController;
use App\Http\Controllers\Api\AwardHistoryController;
use App\Http\Controllers\Api\PublicHolidayController;
use App\Http\Controllers\Api\EmailConfigController;
use App\Http\Controllers\Api\EmailTemplateController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\SmsConfigController;
use App\Http\Controllers\Api\SmsLogController;
use App\Http\Controllers\Api\SmsTemplateController;
use App\Http\Controllers\Api\SmsUtilityController;
use App\Http\Controllers\Api\FiscalYearController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\MilestoneController;
use App\Http\Controllers\Api\PriorityController;
use App\Http\Controllers\Api\TaskStatusController;
use App\Http\Controllers\Api\TaskController as HrmTaskController;
use App\Http\Controllers\Api\AssignedTaskController;
use App\Http\Controllers\Api\Reports\ReportController;
use App\Http\Controllers\Api\Reports\ReportRegistryController;
use App\Http\Controllers\Api\ProjectTeamController;
use App\Http\Controllers\Api\ProjectTeamMemberController;
use App\Http\Controllers\Api\SettingsConfigurationController;
use App\Http\Controllers\Api\Payroll\AttendanceSummaryController;
use App\Http\Controllers\Api\Payroll\BenefitRuleController;
use App\Http\Controllers\Api\Payroll\EmployeeAdditionController;
use App\Http\Controllers\Api\Payroll\EmployeeDeductionController;
use App\Http\Controllers\Api\Payroll\EmployeeReimbursementController;
use App\Http\Controllers\Api\Payroll\PayrollPaymentController;
use App\Http\Controllers\Api\Payroll\PayrollPeriodController;
use App\Http\Controllers\Api\Payroll\PayrollRunController;
use App\Http\Controllers\Api\Payroll\PayrollSettingController;
use App\Http\Controllers\Api\Payroll\PayslipLineController;
use App\Http\Controllers\Api\Payroll\SalaryComponentController;
use App\Http\Controllers\Api\Payroll\SalaryStructureController;
use App\Http\Controllers\Api\Payroll\TaxSlabController;

Route::middleware(['web', 'auth', 'verified'])->get('global-search', GlobalSearchController::class)
    ->name('api.global-search');

Route::middleware(['web', 'auth', 'verified'])->post('business-rules/validate', BusinessRuleValidationController::class)
    ->name('api.business-rules.validate');

Route::middleware(['web', 'auth', 'verified'])->post('utils/send-document-email', [EmailController::class, 'sendDocumentEmail'])
    ->name('api.utils.send-document-email');

Route::middleware(['web', 'auth', 'verified'])->prefix('app/context')->name('api.app.context.')->group(function () {
    Route::get('/', [AppContextController::class, 'show'])->name('show');
    Route::post('/branch', [AppContextController::class, 'setBranch'])->name('branch');
    Route::post('/fiscal-year', [AppContextController::class, 'setFiscalYear'])->name('fiscal-year');
});

// Canonical alias matching the documented contract for the frontend branch toggle.
Route::middleware(['web', 'auth', 'verified'])->prefix('branch-context')->name('api.branch-context.')->group(function () {
    Route::post('/select', [AppContextController::class, 'setBranch'])->name('select');
});

Route::middleware(['web', 'auth', 'verified'])->group(function () {

/*
|--------------------------------------------------------------------------
| Bank Accounts
|--------------------------------------------------------------------------
*/

Route::post('bank-accounts/bulk', [BankAccountController::class, 'bulkStore']);
Route::patch('bank-accounts/bulk', [BankAccountController::class, 'bulkUpdate']);
Route::delete('bank-accounts/bulk', [BankAccountController::class, 'bulkDestroy']);
Route::get('bank-accounts/{bankAccount}/ledger', [BankAccountController::class, 'ledger']);
Route::post('bank-accounts/{bankAccount}/statement-import', [BankAccountController::class, 'importStatement']);

// Bank reconciliation + forex
Route::get('bank-accounts/{bankAccount}/reconciliation', [\App\Http\Controllers\Api\BankReconciliationController::class, 'summary']);
Route::get('bank-accounts/{bankAccount}/reconciliation/history', [\App\Http\Controllers\Api\BankReconciliationController::class, 'history']);
Route::get('bank-accounts/{bankAccount}/reconciliation/report', [\App\Http\Controllers\Api\BankReconciliationController::class, 'report']);
Route::post('bank-accounts/{bankAccount}/reconciliation/auto-match', [\App\Http\Controllers\Api\BankReconciliationController::class, 'autoMatch']);
Route::post('bank-accounts/{bankAccount}/reconciliation/manual-match', [\App\Http\Controllers\Api\BankReconciliationController::class, 'manualMatch']);
Route::post('bank-accounts/{bankAccount}/reconciliation/unmatch', [\App\Http\Controllers\Api\BankReconciliationController::class, 'unmatch']);
Route::post('bank-accounts/{bankAccount}/reconciliation/mark-pending', [\App\Http\Controllers\Api\BankReconciliationController::class, 'markPending']);
Route::post('bank-accounts/{bankAccount}/reconciliation/restore', [\App\Http\Controllers\Api\BankReconciliationController::class, 'restore']);
Route::post('bank-accounts/{bankAccount}/reconciliation/finalize', [\App\Http\Controllers\Api\BankReconciliationController::class, 'finalize']);
Route::post('bank-accounts/{bankAccount}/reconciliation/{reconciliation}/reopen', [\App\Http\Controllers\Api\BankReconciliationController::class, 'reopen']);
Route::post('bank-accounts/{bankAccount}/forex-adjustment/preview', [\App\Http\Controllers\Api\BankReconciliationController::class, 'forexPreview']);
Route::post('bank-accounts/{bankAccount}/forex-adjustment', [\App\Http\Controllers\Api\BankReconciliationController::class, 'forexPost']);

Route::apiResource('bank-accounts', BankAccountController::class)
    ->parameters([
        'bank-accounts' => 'bankAccount',
    ]);

/*
|--------------------------------------------------------------------------
| Currencies
|--------------------------------------------------------------------------
*/

Route::post('currencies/bulk', [CurrencyController::class, 'bulkStore']);
Route::patch('currencies/bulk', [CurrencyController::class, 'bulkUpdate']);
Route::delete('currencies/bulk', [CurrencyController::class, 'bulkDestroy']);
Route::apiResource('currencies', CurrencyController::class);

Route::get('settings/dashboard', [SettingsConfigurationController::class, 'dashboard']);
Route::get('settings/configurations/{area}', [SettingsConfigurationController::class, 'show']);
Route::put('settings/configurations/{area}', [SettingsConfigurationController::class, 'update']);
Route::patch('settings/configurations/{area}', [SettingsConfigurationController::class, 'update']);

Route::get('app-settings/current', [AppSettingController::class, 'singletonShow']);
Route::post('app-settings/current', [AppSettingController::class, 'singletonUpsert']);
Route::put('app-settings/current', [AppSettingController::class, 'singletonUpsert']);
Route::patch('app-settings/current', [AppSettingController::class, 'singletonUpsert']);
Route::apiResource('app-settings', AppSettingController::class);

Route::post('fiscal-years/{id}/mark-current', [FiscalYearController::class, 'markCurrent']);
Route::post('fiscal-years/{id}/close', [FiscalYearController::class, 'close']);
Route::apiResource('fiscal-years', FiscalYearController::class);

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::apiResource('email-templates', EmailTemplateController::class);
    Route::post('sms/send-test', [SmsUtilityController::class, 'sendTest']);
    Route::post('sms/preview-template', [SmsUtilityController::class, 'previewTemplate']);
    Route::post('sms/validate-phone', [SmsUtilityController::class, 'validatePhone']);
    Route::get('sms-configs/summary', [SmsConfigController::class, 'summary']);
    Route::post('sms-configs/{id}/set-default', [SmsConfigController::class, 'setDefault']);
    Route::post('sms-configs/{id}/test', [SmsConfigController::class, 'testSend']);
    Route::post('sms-configs/{id}/test-send', [SmsConfigController::class, 'testSend']);
    Route::post('sms-configs/{id}/activate', [SmsConfigController::class, 'activate']);
    Route::post('sms-configs/{id}/deactivate', [SmsConfigController::class, 'deactivate']);
    Route::apiResource('sms-configs', SmsConfigController::class)->parameters(['sms-configs' => 'smsConfig']);
    Route::post('sms-templates/preview', [SmsTemplateController::class, 'preview']);
    Route::apiResource('sms-templates', SmsTemplateController::class);
    Route::get('sms-logs/export', [SmsLogController::class, 'export']);
    Route::post('sms-logs/bulk-retry', [SmsLogController::class, 'bulkRetry']);
    Route::post('sms-logs/{id}/retry', [SmsLogController::class, 'retry']);
    Route::apiResource('sms-logs', SmsLogController::class)->only(['index', 'show']);
});

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('reports/registry', [ReportRegistryController::class, 'registry']);
    Route::post('reports/soft-query', [ReportRegistryController::class, 'softQueryEndpoint']);
    Route::post('reports/summarize', [ReportAiSummaryController::class, 'summarize'])->middleware('throttle:20,1');
    Route::get('reports/options/{type}', [ReportRegistryController::class, 'options'])
        ->where('type', '[a-z0-9\-]+');
    Route::get('reports/{category}/{report_key}', [ReportController::class, 'index']);
    Route::get('reports/{category}/{report_key}/export', [ReportController::class, 'export']);
});

Route::middleware(['web', 'auth', 'verified'])->group(function () {

/*
|--------------------------------------------------------------------------
| Cash Transfers
|--------------------------------------------------------------------------
*/

Route::post('cash-transfers/bulk', [CashTransferController::class, 'bulkStore']);
Route::patch('cash-transfers/bulk', [CashTransferController::class, 'bulkUpdate']);
Route::delete('cash-transfers/bulk', [CashTransferController::class, 'bulkDestroy']);
Route::post('cash-transfers/bulk-approve', [CashTransferController::class, 'bulkApprove']);
Route::post('cash-transfers/bulk-void', [CashTransferController::class, 'bulkVoid']);
Route::post('cash-transfers/bulk-export', [CashTransferController::class, 'bulkExport']);
Route::post('cash-transfers/{id}/approve', [CashTransferController::class, 'transactionApprove']);
Route::post('cash-transfers/{id}/void', [CashTransferController::class, 'transactionVoid']);

Route::apiResource('cash-transfers', CashTransferController::class)
    ->parameters([
        'cash-transfers' => 'cashTransfer',
    ]);

/*
|--------------------------------------------------------------------------
| Cash Transfer Lines
|--------------------------------------------------------------------------
*/

Route::post('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkStore']);
Route::patch('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkUpdate']);
Route::delete('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkDestroy']);

Route::apiResource('cash-transfer-lines', CashTransferLineController::class)
    ->parameters([
        'cash-transfer-lines' => 'cashTransferLine',
    ]);

/*
|--------------------------------------------------------------------------
| Chart Of Accounts
|--------------------------------------------------------------------------
*/

Route::post('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkStore']);
Route::patch('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkUpdate']);
Route::delete('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkDestroy']);
Route::get('chart-of-accounts/{chartOfAccount}/ledger', [ChartOfAccountController::class, 'ledger']);

Route::apiResource('chart-of-accounts', ChartOfAccountController::class)
    ->parameters([
        'chart-of-accounts' => 'chartOfAccount',
    ]);

/*
|--------------------------------------------------------------------------
| Journal Vouchers
|--------------------------------------------------------------------------
*/

Route::post('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkStore']);
Route::patch('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkUpdate']);
Route::delete('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkDestroy']);
Route::post('journal-vouchers/bulk-approve', [JournalVoucherController::class, 'bulkApprove']);
Route::post('journal-vouchers/bulk-void', [JournalVoucherController::class, 'bulkVoid']);
Route::post('journal-vouchers/bulk-export', [JournalVoucherController::class, 'bulkExport']);
Route::post('journal-vouchers/{id}/approve', [JournalVoucherController::class, 'transactionApprove']);
Route::post('journal-vouchers/{id}/void', [JournalVoucherController::class, 'transactionVoid']);

Route::apiResource('journal-vouchers', JournalVoucherController::class)
    ->parameters([
        'journal-vouchers' => 'journalVoucher',
    ]);

/*
|--------------------------------------------------------------------------
| Journal Voucher Lines
|--------------------------------------------------------------------------
*/

Route::post('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkStore']);
Route::patch('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkUpdate']);
Route::delete('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkDestroy']);

Route::apiResource('journal-voucher-lines', JournalVoucherLineController::class)
    ->parameters([
        'journal-voucher-lines' => 'journalVoucherLine',
    ]);

/*
|--------------------------------------------------------------------------
| Cheque Registers
|--------------------------------------------------------------------------
*/

Route::post('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkStore']);
Route::patch('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkUpdate']);
Route::delete('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkDestroy']);

Route::get('cheque-registers/{id}/print', [ChequeRegisterController::class, 'print']);
Route::get('cheque-registers/{id}/print-pdf', [ChequeRegisterController::class, 'printPdf']);

Route::apiResource('cheque-registers', ChequeRegisterController::class)
    ->parameters([
        'cheque-registers' => 'chequeRegister',
    ]);

// Must precede the apiResource so "default" is not treated as a record id.
Route::get('cheque-format-configurations/default', [ChequeFormatConfigurationController::class, 'default']);

Route::apiResource('cheque-format-configurations', ChequeFormatConfigurationController::class)
    ->parameters([
        'cheque-format-configurations' => 'chequeFormatConfiguration',
    ]);


Route::post('accounts/bulk', [AccountController::class, 'bulkStore']);
Route::patch('accounts/bulk', [AccountController::class, 'bulkUpdate']);
Route::delete('accounts/bulk', [AccountController::class, 'bulkDestroy']);

Route::apiResource('accounts', AccountController::class)
    ->parameters([
        'accounts' => 'account',
    ]);

/*
|--------------------------------------------------------------------------
| Contact Groups
|--------------------------------------------------------------------------
*/

Route::post('contact-groups/bulk', [ContactGroupController::class, 'bulkStore']);
Route::patch('contact-groups/bulk', [ContactGroupController::class, 'bulkUpdate']);
Route::delete('contact-groups/bulk', [ContactGroupController::class, 'bulkDestroy']);

Route::apiResource('contact-groups', ContactGroupController::class)
    ->parameters([
        'contact-groups' => 'contactGroup',
    ]);

/*
|--------------------------------------------------------------------------
| Contacts
|--------------------------------------------------------------------------
*/

Route::post('contacts/bulk', [ContactController::class, 'bulkStore']);
Route::patch('contacts/bulk', [ContactController::class, 'bulkUpdate']);
Route::delete('contacts/bulk', [ContactController::class, 'bulkDestroy']);

Route::get('contacts/{contact}/transactions', [ContactController::class, 'transactions']);
Route::post('contacts/{contact}/send-email', [ContactController::class, 'sendEmail']);
Route::post('contacts/{contact}/send-sms', [ContactController::class, 'sendSms']);
Route::apiResource('contacts', ContactController::class)
    ->parameters([
        'contacts' => 'contact',
    ]);

/*
|--------------------------------------------------------------------------
| Product Categories
|--------------------------------------------------------------------------
*/

Route::post('product-categories/bulk', [ProductCategoryController::class, 'bulkStore']);
Route::patch('product-categories/bulk', [ProductCategoryController::class, 'bulkUpdate']);
Route::delete('product-categories/bulk', [ProductCategoryController::class, 'bulkDestroy']);

Route::apiResource('product-categories', ProductCategoryController::class)
    ->parameters([
        'product-categories' => 'productCategory',
    ]);

/*
|--------------------------------------------------------------------------
| Product Units
|--------------------------------------------------------------------------
*/

Route::post('product-units/bulk', [ProductUnitController::class, 'bulkStore']);
Route::patch('product-units/bulk', [ProductUnitController::class, 'bulkUpdate']);
Route::delete('product-units/bulk', [ProductUnitController::class, 'bulkDestroy']);

Route::apiResource('product-units', ProductUnitController::class)
    ->parameters([
        'product-units' => 'productUnit',
    ]);

/*
|--------------------------------------------------------------------------
| Products
|--------------------------------------------------------------------------
*/

Route::post('products/bulk', [ProductController::class, 'bulkStore']);
Route::patch('products/bulk', [ProductController::class, 'bulkUpdate']);
Route::delete('products/bulk', [ProductController::class, 'bulkDestroy']);
Route::get('products/search', [ProductController::class, 'search']);
Route::get('products/{id}/variants', [ProductController::class, 'variants']);
Route::post('products/{id}/generate-variants', [ProductController::class, 'generateVariants']);
Route::patch('products/{id}/sync-variants', [ProductController::class, 'syncVariants']);

Route::apiResource('products', ProductController::class)
    ->parameters([
        'products' => 'product',
    ]);

/*
|--------------------------------------------------------------------------
| Warehouses
|--------------------------------------------------------------------------
*/

Route::post('warehouses/bulk', [WarehouseController::class, 'bulkStore']);
Route::patch('warehouses/bulk', [WarehouseController::class, 'bulkUpdate']);
Route::delete('warehouses/bulk', [WarehouseController::class, 'bulkDestroy']);

Route::apiResource('warehouses', WarehouseController::class)
    ->parameters([
        'warehouses' => 'warehouse',
    ]);

Route::post('warehouse-transfers/bulk', [WarehouseTransferController::class, 'bulkStore']);
Route::patch('warehouse-transfers/bulk', [WarehouseTransferController::class, 'bulkUpdate']);
Route::delete('warehouse-transfers/bulk', [WarehouseTransferController::class, 'bulkDestroy']);
Route::post('warehouse-transfers/bulk-approve', [WarehouseTransferController::class, 'bulkApprove']);
Route::post('warehouse-transfers/bulk-void', [WarehouseTransferController::class, 'bulkVoid']);
Route::post('warehouse-transfers/{id}/approve', [WarehouseTransferController::class, 'transactionApprove']);
Route::post('warehouse-transfers/{id}/void', [WarehouseTransferController::class, 'transactionVoid']);
Route::apiResource('warehouse-transfers', WarehouseTransferController::class);

Route::post('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkStore']);
Route::patch('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkUpdate']);
Route::delete('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkDestroy']);
Route::post('inventory-adjustments/bulk-approve', [InventoryAdjustmentController::class, 'bulkApprove']);
Route::post('inventory-adjustments/bulk-void', [InventoryAdjustmentController::class, 'bulkVoid']);
Route::post('inventory-adjustments/{id}/approve', [InventoryAdjustmentController::class, 'transactionApprove']);
Route::post('inventory-adjustments/{id}/void', [InventoryAdjustmentController::class, 'transactionVoid']);
Route::apiResource('inventory-adjustments', InventoryAdjustmentController::class);
Route::post('adjustments/bulk', [InventoryAdjustmentController::class, 'bulkStore']);
Route::patch('adjustments/bulk', [InventoryAdjustmentController::class, 'bulkUpdate']);
Route::delete('adjustments/bulk', [InventoryAdjustmentController::class, 'bulkDestroy']);
Route::post('adjustments/bulk-approve', [InventoryAdjustmentController::class, 'bulkApprove']);
Route::post('adjustments/bulk-void', [InventoryAdjustmentController::class, 'bulkVoid']);
Route::post('adjustments/{id}/approve', [InventoryAdjustmentController::class, 'transactionApprove']);
Route::post('adjustments/{id}/void', [InventoryAdjustmentController::class, 'transactionVoid']);
Route::apiResource('adjustments', InventoryAdjustmentController::class);
Route::apiResource('warehouse-items', WarehouseItemController::class)->only(['index', 'show', 'store', 'update', 'destroy']);

Route::post('bills-of-material/bulk', [BillOfMaterialController::class, 'bulkStore']);
Route::patch('bills-of-material/bulk', [BillOfMaterialController::class, 'bulkUpdate']);
Route::delete('bills-of-material/bulk', [BillOfMaterialController::class, 'bulkDestroy']);
Route::apiResource('bills-of-material', BillOfMaterialController::class);

Route::post('production-cost-terms/bulk', [ProductionCostTermController::class, 'bulkStore']);
Route::patch('production-cost-terms/bulk', [ProductionCostTermController::class, 'bulkUpdate']);
Route::delete('production-cost-terms/bulk', [ProductionCostTermController::class, 'bulkDestroy']);
Route::apiResource('production-cost-terms', ProductionCostTermController::class);

Route::post('production-orders/bulk', [ProductionOrderController::class, 'bulkStore']);
Route::patch('production-orders/bulk', [ProductionOrderController::class, 'bulkUpdate']);
Route::delete('production-orders/bulk', [ProductionOrderController::class, 'bulkDestroy']);
Route::post('production-orders/bulk-approve', [ProductionOrderController::class, 'bulkApprove']);
Route::post('production-orders/bulk-void', [ProductionOrderController::class, 'bulkVoid']);
Route::post('production-orders/bulk-export', [ProductionOrderController::class, 'bulkExport']);
Route::post('production-orders/{id}/approve', [ProductionOrderController::class, 'transactionApprove']);
Route::post('production-orders/{id}/void', [ProductionOrderController::class, 'transactionVoid']);
Route::apiResource('production-orders', ProductionOrderController::class);

Route::post('production-journals/bulk', [ProductionJournalController::class, 'bulkStore']);
Route::patch('production-journals/bulk', [ProductionJournalController::class, 'bulkUpdate']);
Route::delete('production-journals/bulk', [ProductionJournalController::class, 'bulkDestroy']);
Route::post('production-journals/bulk-approve', [ProductionJournalController::class, 'bulkApprove']);
Route::post('production-journals/bulk-void', [ProductionJournalController::class, 'bulkVoid']);
Route::post('production-journals/{id}/approve', [ProductionJournalController::class, 'transactionApprove']);
Route::post('production-journals/{id}/void', [ProductionJournalController::class, 'transactionVoid']);
Route::apiResource('production-journals', ProductionJournalController::class);

Route::post('quotations/bulk', [QuotationController::class, 'bulkStore']);
Route::patch('quotations/bulk', [QuotationController::class, 'bulkUpdate']);
Route::delete('quotations/bulk', [QuotationController::class, 'bulkDestroy']);
Route::post('quotations/bulk-approve', [QuotationController::class, 'bulkApprove']);
Route::post('quotations/bulk-void', [QuotationController::class, 'bulkVoid']);
Route::post('quotations/bulk-export', [QuotationController::class, 'bulkExport']);
Route::post('quotations/{id}/approve', [QuotationController::class, 'transactionApprove']);
Route::post('quotations/{id}/void', [QuotationController::class, 'transactionVoid']);
Route::apiResource('quotations', QuotationController::class);

Route::post('sales-orders/bulk', [SalesOrderController::class, 'bulkStore']);
Route::patch('sales-orders/bulk', [SalesOrderController::class, 'bulkUpdate']);
Route::delete('sales-orders/bulk', [SalesOrderController::class, 'bulkDestroy']);
Route::post('sales-orders/bulk-approve', [SalesOrderController::class, 'bulkApprove']);
Route::post('sales-orders/bulk-void', [SalesOrderController::class, 'bulkVoid']);
Route::post('sales-orders/bulk-export', [SalesOrderController::class, 'bulkExport']);
Route::post('sales-orders/{id}/approve', [SalesOrderController::class, 'transactionApprove']);
Route::post('sales-orders/{id}/void', [SalesOrderController::class, 'transactionVoid']);
Route::apiResource('sales-orders', SalesOrderController::class);

Route::post('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkStore']);
Route::patch('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkUpdate']);
Route::delete('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkDestroy']);
Route::apiResource('proforma-invoices', ProformaInvoiceController::class);

Route::post('invoices/bulk', [InvoiceController::class, 'bulkStore']);
Route::patch('invoices/bulk', [InvoiceController::class, 'bulkUpdate']);
Route::delete('invoices/bulk', [InvoiceController::class, 'bulkDestroy']);
Route::post('invoices/bulk-approve', [InvoiceController::class, 'bulkApprove']);
Route::post('invoices/bulk-void', [InvoiceController::class, 'bulkVoid']);
Route::post('invoices/bulk-export', [InvoiceController::class, 'bulkExport']);
Route::post('invoices/{id}/approve', [InvoiceController::class, 'transactionApprove']);
Route::post('invoices/{id}/void', [InvoiceController::class, 'transactionVoid']);
Route::apiResource('invoices', InvoiceController::class);

Route::post('customer-payments/bulk', [CustomerPaymentController::class, 'bulkStore']);
Route::patch('customer-payments/bulk', [CustomerPaymentController::class, 'bulkUpdate']);
Route::delete('customer-payments/bulk', [CustomerPaymentController::class, 'bulkDestroy']);
Route::post('customer-payments/bulk-approve', [CustomerPaymentController::class, 'bulkApprove']);
Route::post('customer-payments/bulk-void', [CustomerPaymentController::class, 'bulkVoid']);
Route::post('customer-payments/bulk-export', [CustomerPaymentController::class, 'bulkExport']);
Route::post('customer-payments/{id}/approve', [CustomerPaymentController::class, 'transactionApprove']);
Route::post('customer-payments/{id}/void', [CustomerPaymentController::class, 'transactionVoid']);
Route::apiResource('customer-payments', CustomerPaymentController::class);

Route::post('sales-returns/bulk', [SalesReturnController::class, 'bulkStore']);
Route::patch('sales-returns/bulk', [SalesReturnController::class, 'bulkUpdate']);
Route::delete('sales-returns/bulk', [SalesReturnController::class, 'bulkDestroy']);
Route::post('sales-returns/bulk-approve', [SalesReturnController::class, 'bulkApprove']);
Route::post('sales-returns/bulk-void', [SalesReturnController::class, 'bulkVoid']);
Route::post('sales-returns/bulk-export', [SalesReturnController::class, 'bulkExport']);
Route::post('sales-returns/{id}/approve', [SalesReturnController::class, 'transactionApprove']);
Route::post('sales-returns/{id}/void', [SalesReturnController::class, 'transactionVoid']);
Route::apiResource('sales-returns', SalesReturnController::class);

Route::post('credit-notes/bulk', [SalesReturnController::class, 'bulkStore']);
Route::patch('credit-notes/bulk', [SalesReturnController::class, 'bulkUpdate']);
Route::delete('credit-notes/bulk', [SalesReturnController::class, 'bulkDestroy']);
Route::post('credit-notes/bulk-approve', [SalesReturnController::class, 'bulkApprove']);
Route::post('credit-notes/bulk-void', [SalesReturnController::class, 'bulkVoid']);
Route::post('credit-notes/bulk-export', [SalesReturnController::class, 'bulkExport']);
Route::post('credit-notes/{id}/approve', [SalesReturnController::class, 'transactionApprove']);
Route::post('credit-notes/{id}/void', [SalesReturnController::class, 'transactionVoid']);
Route::apiResource('credit-notes', SalesReturnController::class);

Route::post('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkStore']);
Route::patch('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkUpdate']);
Route::delete('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkDestroy']);
Route::post('purchase-orders/bulk-approve', [PurchaseOrderController::class, 'bulkApprove']);
Route::post('purchase-orders/bulk-void', [PurchaseOrderController::class, 'bulkVoid']);
Route::post('purchase-orders/bulk-export', [PurchaseOrderController::class, 'bulkExport']);
Route::post('purchase-orders/{id}/approve', [PurchaseOrderController::class, 'transactionApprove']);
Route::post('purchase-orders/{id}/void', [PurchaseOrderController::class, 'transactionVoid']);
Route::apiResource('purchase-orders', PurchaseOrderController::class);

Route::post('purchase-bills/bulk', [PurchaseBillController::class, 'bulkStore']);
Route::patch('purchase-bills/bulk', [PurchaseBillController::class, 'bulkUpdate']);
Route::delete('purchase-bills/bulk', [PurchaseBillController::class, 'bulkDestroy']);
Route::post('purchase-bills/bulk-approve', [PurchaseBillController::class, 'bulkApprove']);
Route::post('purchase-bills/bulk-void', [PurchaseBillController::class, 'bulkVoid']);
Route::post('purchase-bills/bulk-export', [PurchaseBillController::class, 'bulkExport']);
Route::post('purchase-bills/{id}/approve', [PurchaseBillController::class, 'transactionApprove']);
Route::post('purchase-bills/{id}/void', [PurchaseBillController::class, 'transactionVoid']);
Route::apiResource('purchase-bills', PurchaseBillController::class);

Route::post('expenses/bulk', [ExpenseController::class, 'bulkStore']);
Route::patch('expenses/bulk', [ExpenseController::class, 'bulkUpdate']);
Route::delete('expenses/bulk', [ExpenseController::class, 'bulkDestroy']);
Route::post('expenses/bulk-approve', [ExpenseController::class, 'bulkApprove']);
Route::post('expenses/bulk-void', [ExpenseController::class, 'bulkVoid']);
Route::post('expenses/bulk-export', [ExpenseController::class, 'bulkExport']);
Route::post('expenses/{id}/approve', [ExpenseController::class, 'transactionApprove']);
Route::post('expenses/{id}/void', [ExpenseController::class, 'transactionVoid']);
Route::apiResource('expenses', ExpenseController::class);

Route::post('debit-notes/bulk', [DebitNoteController::class, 'bulkStore']);
Route::patch('debit-notes/bulk', [DebitNoteController::class, 'bulkUpdate']);
Route::delete('debit-notes/bulk', [DebitNoteController::class, 'bulkDestroy']);
Route::post('debit-notes/bulk-approve', [DebitNoteController::class, 'bulkApprove']);
Route::post('debit-notes/bulk-void', [DebitNoteController::class, 'bulkVoid']);
Route::post('debit-notes/bulk-export', [DebitNoteController::class, 'bulkExport']);
Route::post('debit-notes/{id}/approve', [DebitNoteController::class, 'transactionApprove']);
Route::post('debit-notes/{id}/void', [DebitNoteController::class, 'transactionVoid']);
Route::apiResource('debit-notes', DebitNoteController::class);

Route::post('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkStore']);
Route::patch('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkUpdate']);
Route::delete('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkDestroy']);
Route::post('supplier-payments/bulk-approve', [SupplierPaymentController::class, 'bulkApprove']);
Route::post('supplier-payments/bulk-void', [SupplierPaymentController::class, 'bulkVoid']);
Route::post('supplier-payments/bulk-export', [SupplierPaymentController::class, 'bulkExport']);
Route::post('supplier-payments/{id}/approve', [SupplierPaymentController::class, 'transactionApprove']);
Route::post('supplier-payments/{id}/void', [SupplierPaymentController::class, 'transactionVoid']);
Route::apiResource('supplier-payments', SupplierPaymentController::class);

Route::post('variants/bulk', [VariantController::class, 'bulkStore']);
Route::patch('variants/bulk', [VariantController::class, 'bulkUpdate']);
Route::delete('variants/bulk', [VariantController::class, 'bulkDestroy']);
Route::apiResource('variants', VariantController::class);
Route::apiResource('product-variants', ProductVariantItemController::class);

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('pos/dashboard', [PosSaleController::class, 'dashboard']);
    Route::get('pos/products/search', [PosSaleController::class, 'productSearch']);
    Route::get('pos/terminals/overview', [PosTerminalController::class, 'overview']);

    Route::apiResource('pos-terminals', PosTerminalController::class);

    Route::get('pos-shifts/current', [PosShiftController::class, 'current']);
    Route::post('pos-shifts/open', [PosShiftController::class, 'open']);
    Route::post('pos-shifts/{id}/close', [PosShiftController::class, 'close']);
    Route::get('pos-shifts', [PosShiftController::class, 'index']);
    Route::get('pos-shifts/{id}', [PosShiftController::class, 'show']);

    Route::get('pos-sales', [PosSaleController::class, 'index']);
    Route::post('pos-sales', [PosSaleController::class, 'store']);
    Route::get('pos-sales/{id}/refundable', [PosSaleController::class, 'refundable']);
    Route::get('pos-sales/{id}', [PosSaleController::class, 'show']);
    Route::patch('pos-sales/{id}', [PosSaleController::class, 'update']);
    Route::post('pos-sales/{id}/hold', [PosSaleController::class, 'hold']);
    Route::post('pos-sales/{id}/complete', [PosSaleController::class, 'complete']);
    Route::post('pos-sales/{id}/cancel', [PosSaleController::class, 'cancel']);
    Route::post('pos-sales/{id}/void', [PosSaleController::class, 'void']);

    Route::get('pos-payments', [PosPaymentController::class, 'index']);
    Route::get('pos-payments/{pos_payment}', [PosPaymentController::class, 'show']);

    Route::get('pos-cash-movements', [PosCashMovementController::class, 'index']);
    Route::post('pos-cash-movements', [PosCashMovementController::class, 'store']);
    Route::get('pos-cash-movements/{pos_cash_movement}', [PosCashMovementController::class, 'show']);
    Route::patch('pos-cash-movements/{pos_cash_movement}', [PosCashMovementController::class, 'update']);

    Route::get('pos-returns', [PosReturnController::class, 'index']);
    Route::post('pos-returns', [PosReturnController::class, 'store']);
    Route::get('pos-returns/{id}', [PosReturnController::class, 'show']);
    Route::post('pos-returns/{id}/complete', [PosReturnController::class, 'complete']);
    Route::post('pos-returns/{id}/cancel', [PosReturnController::class, 'cancel']);
});

/*
|--------------------------------------------------------------------------
| HRM Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['web', 'auth'])->prefix('hrm')->group(function () {
    Route::apiResource('employment-statuses', EmploymentStatusController::class);
    Route::apiResource('departments', \App\Http\Controllers\Api\DepartmentController::class);
    Route::apiResource('designations', \App\Http\Controllers\Api\DesignationController::class);
    Route::apiResource('designation-histories', DesignationHistoryController::class);
    Route::apiResource('salary-histories', SalaryHistoryController::class);
    Route::apiResource('leave-policies', LeavePolicyController::class);
    Route::apiResource('weekly-holidays', WeeklyHolidayController::class);
    Route::apiResource('shifts', HrmShiftController::class);
    Route::apiResource('roles', RoleController::class);
    Route::apiResource('permissions', PermissionController::class);
    Route::apiResource('role-permissions', RolePermissionController::class);
    Route::apiResource('users', HrmUserController::class);
    Route::apiResource('employees', EmployeeController::class);
    Route::apiResource('educations', EducationController::class);
    Route::apiResource('attendances', \App\Http\Controllers\Api\AttendanceController::class);
    Route::apiResource('leave-types', LeaveTypeController::class);
    Route::apiResource('leave-requests', LeaveRequestController::class);
    Route::apiResource('leave-applications', LeaveApplicationController::class);
    Route::apiResource('payslips', PayslipController::class);
    Route::apiResource('awards', AwardController::class);
    Route::apiResource('award-histories', AwardHistoryController::class);
    Route::apiResource('public-holidays', PublicHolidayController::class);
    Route::post('email-configs/test-connection', [EmailConfigController::class, 'testConnection']);
    Route::apiResource('email-configs', EmailConfigController::class);
    Route::apiResource('emails', EmailController::class);

    Route::get('projects/{project}/financial-summary', [ProjectController::class, 'financialSummary']);
    Route::apiResource('projects', ProjectController::class);

    Route::apiResource('milestones', MilestoneController::class);
    Route::apiResource('priorities', PriorityController::class);
    Route::apiResource('task-statuses', TaskStatusController::class);
    Route::apiResource('tasks', HrmTaskController::class);
    Route::apiResource('assigned-tasks', AssignedTaskController::class);
    Route::apiResource('project-teams', ProjectTeamController::class);
    Route::apiResource('project-team-members', ProjectTeamMemberController::class);

    Route::prefix('payroll')->name('hrm.payroll.')->group(function () {
        Route::get('dashboard', [PayrollRunController::class, 'dashboard']);
        Route::post('sync-accounts', [PayrollRunController::class, 'syncAccounts']);

        // payrolls is the canonical payroll run endpoint; runs remains a backward-compatible alias.
        Route::match(['get', 'post'], 'payrolls/preview', [PayrollRunController::class, 'preview']);
        Route::post('payrolls/generate', [PayrollRunController::class, 'generate']);
        Route::post('payrolls/{id}/approve', [PayrollRunController::class, 'approve']);
        Route::post('payrolls/{id}/process', [PayrollRunController::class, 'process']);
        Route::post('payrolls/{id}/mark-paid', [PayrollRunController::class, 'markPaid']);
        Route::post('payrolls/{id}/lock', [PayrollRunController::class, 'lock']);
        Route::post('payrolls/{id}/reopen', [PayrollRunController::class, 'reopen']);
        Route::post('payrolls/{id}/void', [PayrollRunController::class, 'void']);
        Route::post('payrolls/{id}/reverse', [PayrollRunController::class, 'reverse']);
        Route::get('payrolls/{id}/payslips', [PayrollRunController::class, 'payslips']);
        Route::post('payrolls/{id}/journal-voucher', [PayrollRunController::class, 'journalVoucher']);

        Route::post('payrolls/{id}/{kind}', [PayrollRunController::class, 'storeAdjustment'])
            ->whereIn('kind', ['addition', 'deduction']);

        Route::delete('payrolls/{id}/{kind}/{adjustmentId}', [PayrollRunController::class, 'destroyAdjustment'])
            ->whereIn('kind', ['addition', 'deduction']);

        Route::match(['get', 'post'], 'runs/preview', [PayrollRunController::class, 'preview']);
        Route::post('runs/generate', [PayrollRunController::class, 'generate']);
        Route::post('runs/{id}/review', [PayrollRunController::class, 'review']);
        Route::post('runs/{id}/approve', [PayrollRunController::class, 'approve']);
        Route::post('runs/{id}/process', [PayrollRunController::class, 'process']);
        Route::post('runs/{id}/mark-paid', [PayrollRunController::class, 'markPaid']);
        Route::post('runs/{id}/lock', [PayrollRunController::class, 'lock']);
        Route::post('runs/{id}/reopen', [PayrollRunController::class, 'reopen']);
        Route::post('runs/{id}/void', [PayrollRunController::class, 'void']);
        Route::post('runs/{id}/reverse', [PayrollRunController::class, 'reverse']);
        Route::post('runs/{id}/journal-voucher', [PayrollRunController::class, 'journalVoucher']);

        Route::apiResource('salary-components', SalaryComponentController::class);
        Route::apiResource('settings', PayrollSettingController::class);
        Route::apiResource('salary-structures', SalaryStructureController::class);
        Route::apiResource('employee-additions', EmployeeAdditionController::class);
        Route::apiResource('employee-deductions', EmployeeDeductionController::class);
        Route::apiResource('periods', PayrollPeriodController::class);
        Route::apiResource('attendance-summaries', AttendanceSummaryController::class);
        Route::apiResource('payrolls', PayrollRunController::class);
        Route::apiResource('runs', PayrollRunController::class);
        Route::apiResource('payslip-lines', PayslipLineController::class);
        Route::apiResource('tax-slabs', TaxSlabController::class);
        Route::apiResource('benefit-rules', BenefitRuleController::class);
        Route::apiResource('payments', PayrollPaymentController::class);
        Route::apiResource('reimbursements', EmployeeReimbursementController::class);
    });

    Route::match(['get', 'post'], 'payrolls/preview', [PayrollRunController::class, 'preview']);
    Route::post('payrolls/generate', [PayrollRunController::class, 'generate']);
    Route::post('payrolls/{id}/approve', [PayrollRunController::class, 'approve']);
    Route::post('payrolls/{id}/process', [PayrollRunController::class, 'process']);
    Route::post('payrolls/{id}/mark-paid', [PayrollRunController::class, 'markPaid']);
    Route::post('payrolls/{id}/lock', [PayrollRunController::class, 'lock']);
    Route::post('payrolls/{id}/reopen', [PayrollRunController::class, 'reopen']);
    Route::post('payrolls/{id}/void', [PayrollRunController::class, 'void']);
    Route::post('payrolls/{id}/reverse', [PayrollRunController::class, 'reverse']);
    Route::get('payrolls/{id}/payslips', [PayrollRunController::class, 'payslips']);
    Route::apiResource('payrolls', PayrollRunController::class);
    Route::apiResource('payroll-periods', PayrollPeriodController::class);
    Route::apiResource('payroll-components', SalaryComponentController::class);
    Route::apiResource('employee-payroll-components', EmployeeAdditionController::class);
    Route::get('payslips/{id}/pdf', [PayslipController::class, 'pdf']);
    Route::get('payroll-reports/summary', [PayrollRunController::class, 'summaryReport']);
    Route::get('payroll-reports/employee', [PayrollRunController::class, 'summaryReport']);
    Route::get('payroll-reports/payment', [PayrollRunController::class, 'summaryReport']);
    Route::get('payroll-reports/accounting', [PayrollRunController::class, 'summaryReport']);

    Route::post('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkStore']);
    Route::patch('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkUpdate']);
    Route::delete('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkDestroy']);
    Route::apiResource('employee-profiles', EmployeeProfileController::class);

    Route::apiResource('employee-documents', \App\Http\Controllers\Api\EmployeeDocumentController::class);
    Route::apiResource('onboarding-checklists', \App\Http\Controllers\Api\OnboardingChecklistController::class);
});

/*
|--------------------------------------------------------------------------
| App Setting (Singleton)
|--------------------------------------------------------------------------
*/

Route::get('app-setting', [AppSettingController::class, 'singletonShow']);
Route::put('app-setting', [AppSettingController::class, 'singletonUpsert']);
Route::patch('app-setting', [AppSettingController::class, 'singletonUpsert']);

/*
|--------------------------------------------------------------------------
| Master / Settings
|--------------------------------------------------------------------------
*/

Route::post('branches/bulk', [BranchController::class, 'bulkStore']);
Route::patch('branches/bulk', [BranchController::class, 'bulkUpdate']);
Route::delete('branches/bulk', [BranchController::class, 'bulkDestroy']);
Route::apiResource('branches', BranchController::class);

Route::post('application-settings/bulk', [ApplicationSettingController::class, 'bulkStore']);
Route::patch('application-settings/bulk', [ApplicationSettingController::class, 'bulkUpdate']);
Route::delete('application-settings/bulk', [ApplicationSettingController::class, 'bulkDestroy']);
Route::apiResource('application-settings', ApplicationSettingController::class)
    ->parameters(['application-settings' => 'applicationSetting']);

Route::post('general-settings/bulk', [GeneralSettingController::class, 'bulkStore']);
Route::patch('general-settings/bulk', [GeneralSettingController::class, 'bulkUpdate']);
Route::delete('general-settings/bulk', [GeneralSettingController::class, 'bulkDestroy']);
Route::apiResource('general-settings', GeneralSettingController::class)
    ->parameters(['general-settings' => 'generalSetting']);

Route::post('master-data/bulk', [MasterDataController::class, 'bulkStore']);
Route::patch('master-data/bulk', [MasterDataController::class, 'bulkUpdate']);
Route::delete('master-data/bulk', [MasterDataController::class, 'bulkDestroy']);
Route::apiResource('master-data', MasterDataController::class)
    ->parameters(['master-data' => 'masterData']);

Route::post('alert-types/bulk', [AlertTypeController::class, 'bulkStore']);
Route::patch('alert-types/bulk', [AlertTypeController::class, 'bulkUpdate']);
Route::delete('alert-types/bulk', [AlertTypeController::class, 'bulkDestroy']);
Route::apiResource('alert-types', AlertTypeController::class)
    ->parameters(['alert-types' => 'alertType']);

Route::post('document-numberings/bulk', [DocumentNumberingController::class, 'bulkStore']);
Route::patch('document-numberings/bulk', [DocumentNumberingController::class, 'bulkUpdate']);
Route::delete('document-numberings/bulk', [DocumentNumberingController::class, 'bulkDestroy']);
Route::apiResource('document-numberings', DocumentNumberingController::class)
    ->parameters(['document-numberings' => 'documentNumbering']);

Route::post('printing-templates/bulk', [PrintingTemplateController::class, 'bulkStore']);
Route::patch('printing-templates/bulk', [PrintingTemplateController::class, 'bulkUpdate']);
Route::delete('printing-templates/bulk', [PrintingTemplateController::class, 'bulkDestroy']);
Route::get('printing-templates/resolve', [PrintingTemplateController::class, 'resolve']);
Route::apiResource('printing-templates', PrintingTemplateController::class)
    ->parameters(['printing-templates' => 'printingTemplate']);

Route::post('custom-templates/bulk', [CustomTemplateController::class, 'bulkStore']);
Route::patch('custom-templates/bulk', [CustomTemplateController::class, 'bulkUpdate']);
Route::delete('custom-templates/bulk', [CustomTemplateController::class, 'bulkDestroy']);
Route::apiResource('custom-templates', CustomTemplateController::class)
    ->parameters(['custom-templates' => 'customTemplate']);

Route::post('announcements/bulk', [AnnouncementController::class, 'bulkStore']);
Route::patch('announcements/bulk', [AnnouncementController::class, 'bulkUpdate']);
Route::delete('announcements/bulk', [AnnouncementController::class, 'bulkDestroy']);
Route::apiResource('announcements', AnnouncementController::class);

Route::post('reporting-tags/bulk', [ReportingTagController::class, 'bulkStore']);
Route::patch('reporting-tags/bulk', [ReportingTagController::class, 'bulkUpdate']);
Route::delete('reporting-tags/bulk', [ReportingTagController::class, 'bulkDestroy']);
Route::apiResource('reporting-tags', ReportingTagController::class)
    ->parameters(['reporting-tags' => 'reportingTag']);

Route::post('custom-fields/bulk', [CustomFieldController::class, 'bulkStore']);
Route::patch('custom-fields/bulk', [CustomFieldController::class, 'bulkUpdate']);
Route::delete('custom-fields/bulk', [CustomFieldController::class, 'bulkDestroy']);
Route::apiResource('custom-fields', CustomFieldController::class)
    ->parameters(['custom-fields' => 'customField']);

/*
|--------------------------------------------------------------------------
| Loans
|--------------------------------------------------------------------------
*/

Route::post('loan-accounts/bulk', [LoanAccountController::class, 'bulkStore']);
Route::patch('loan-accounts/bulk', [LoanAccountController::class, 'bulkUpdate']);
Route::delete('loan-accounts/bulk', [LoanAccountController::class, 'bulkDestroy']);
Route::apiResource('loan-accounts', LoanAccountController::class)
    ->parameters(['loan-accounts' => 'loanAccount']);
// Loan payback sub-resource
Route::get('loan-accounts/{loanAccount}/paybacks', [LoanAccountController::class, 'paybacks'])
    ->name('loan-accounts.paybacks.index');
Route::post('loan-accounts/{loanAccount}/paybacks', [LoanAccountController::class, 'storePayback'])
    ->name('loan-accounts.paybacks.store');
Route::delete('loan-accounts/{loanAccount}/paybacks/{payback}', [LoanAccountController::class, 'destroyPayback'])
    ->name('loan-accounts.paybacks.destroy');
Route::apiResource('loan-top-ups', LoanTopUpController::class)
    ->parameters(['loan-top-ups' => 'loanTopUp']);
Route::apiResource('loan-charges', LoanChargeController::class)
    ->parameters(['loan-charges' => 'loanCharge']);

/*
|--------------------------------------------------------------------------
| CRM
|--------------------------------------------------------------------------
*/

Route::prefix('crm')->group(function () {
    Route::get('dashboard', [CrmInsightController::class, 'dashboard']);
    Route::get('customers/{id}/timeline', [CrmInsightController::class, 'customerTimeline']);
    Route::get('accounts/{id}/summary', [CrmAccountController::class, 'summary']);
    Route::get('accounts/{id}/commercials', [CrmAccountController::class, 'commercials']);
    Route::get('deals/forecast', [CrmInsightController::class, 'forecast']);
    Route::get('deals/stuck', [CrmInsightController::class, 'stuckDeals']);
    Route::get('deals/{id}/stage-history', [CrmInsightController::class, 'stageHistory']);
    Route::get('deals/{id}/quotation-prefill', [CrmInsightController::class, 'quotationPrefill']);
    Route::get('activities/inbox', [CrmInsightController::class, 'activityInbox']);
    Route::post('activities/escalate-overdue', [CrmInsightController::class, 'escalateOverdue']);
    Route::post('activities/{id}/complete', [CrmInsightController::class, 'completeActivity']);
    Route::post('activities/{id}/reschedule', [CrmInsightController::class, 'rescheduleActivity']);
    Route::post('communications/sync/email', [CrmCommunicationController::class, 'syncEmail']);
    Route::get('analytics/source-roi', [CrmInsightController::class, 'sourceRoi']);
    Route::post('leads/{id}/convert', [CrmInsightController::class, 'convertLead']);
    Route::post('leads/{id}/mark-lost', [CrmInsightController::class, 'markLeadLost']);
});

Route::post('credit-terms/bulk', [CreditTermController::class, 'bulkStore']);
Route::patch('credit-terms/bulk', [CreditTermController::class, 'bulkUpdate']);
Route::delete('credit-terms/bulk', [CreditTermController::class, 'bulkDestroy']);
Route::apiResource('credit-terms', CreditTermController::class)
    ->parameters(['credit-terms' => 'creditTerm']);

Route::post('crm-accounts/bulk', [CrmAccountController::class, 'bulkStore']);
Route::patch('crm-accounts/bulk', [CrmAccountController::class, 'bulkUpdate']);
Route::delete('crm-accounts/bulk', [CrmAccountController::class, 'bulkDestroy']);
Route::apiResource('crm-accounts', CrmAccountController::class)
    ->parameters(['crm-accounts' => 'crmAccount']);

Route::post('crm-contact-roles/bulk', [CrmContactRoleController::class, 'bulkStore']);
Route::patch('crm-contact-roles/bulk', [CrmContactRoleController::class, 'bulkUpdate']);
Route::delete('crm-contact-roles/bulk', [CrmContactRoleController::class, 'bulkDestroy']);
Route::apiResource('crm-contact-roles', CrmContactRoleController::class)
    ->parameters(['crm-contact-roles' => 'crmContactRole']);

Route::post('crm-communications/bulk', [CrmCommunicationController::class, 'bulkStore']);
Route::patch('crm-communications/bulk', [CrmCommunicationController::class, 'bulkUpdate']);
Route::delete('crm-communications/bulk', [CrmCommunicationController::class, 'bulkDestroy']);
Route::apiResource('crm-communications', CrmCommunicationController::class)
    ->parameters(['crm-communications' => 'crmCommunication']);

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('crm-campaigns/summary', [CrmCampaignController::class, 'summary']);
    Route::get('crm-campaigns/{id}/statistics', [CrmCampaignController::class, 'statistics']);
    Route::post('crm-campaigns/{id}/duplicate', [CrmCampaignController::class, 'duplicate']);
    Route::post('crm-campaigns/{id}/send', [CrmCampaignController::class, 'sendCampaign']);
    Route::post('crm-campaigns/{id}/cancel', [CrmCampaignController::class, 'cancelCampaign']);
    Route::get('crm-campaigns/{id}/recipients', [CrmCampaignController::class, 'campaignRecipients']);
    Route::get('crm-campaigns/{id}/recipients/export', [CrmCampaignController::class, 'exportRecipients']);

    Route::get('crm-campaigns/{id}/email-messages', [CrmCampaignController::class, 'emailMessages']);
    Route::post('crm-campaigns/{id}/email-messages', [CrmCampaignController::class, 'storeEmailMessage']);
    Route::patch('crm-campaigns/{id}/email-messages/{messageId}', [CrmCampaignController::class, 'updateEmailMessage']);
    Route::delete('crm-campaigns/{id}/email-messages/{messageId}', [CrmCampaignController::class, 'deleteEmailMessage']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/duplicate', [CrmCampaignController::class, 'duplicateEmailMessage']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/preview', [CrmCampaignController::class, 'previewEmailMessage']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/send-test', [CrmCampaignController::class, 'sendTestEmail']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/send-now', [CrmCampaignController::class, 'sendEmailNow']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/schedule', [CrmCampaignController::class, 'scheduleEmail']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/cancel-schedule', [CrmCampaignController::class, 'cancelEmailSchedule']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/attachments', [CrmCampaignController::class, 'uploadAttachment']);
    Route::get('crm-campaigns/{id}/email-messages/{messageId}/recipients', [CrmCampaignController::class, 'emailRecipients']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/recipients', [CrmCampaignController::class, 'addEmailRecipients']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/recipients/contact-group', [CrmCampaignController::class, 'addEmailRecipientsFromGroup']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/recipients/contacts', [CrmCampaignController::class, 'addEmailContacts']);
    Route::post('crm-campaigns/{id}/email-messages/{messageId}/recipients/copy', [CrmCampaignController::class, 'copyEmailRecipients']);
    Route::delete('crm-campaigns/{id}/email-messages/{messageId}/recipients/{recipientId}', [CrmCampaignController::class, 'removeEmailRecipient']);

    Route::get('crm-campaigns/{id}/sms-messages', [CrmCampaignController::class, 'smsMessages']);
    Route::post('crm-campaigns/{id}/sms-messages', [CrmCampaignController::class, 'storeSmsMessage']);
    Route::patch('crm-campaigns/{id}/sms-messages/{messageId}', [CrmCampaignController::class, 'updateSmsMessage']);
    Route::delete('crm-campaigns/{id}/sms-messages/{messageId}', [CrmCampaignController::class, 'deleteSmsMessage']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/duplicate', [CrmCampaignController::class, 'duplicateSmsMessage']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/preview', [CrmCampaignController::class, 'previewSmsMessage']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/send-test', [CrmCampaignController::class, 'sendTestSms']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/send-now', [CrmCampaignController::class, 'sendSmsNow']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/schedule', [CrmCampaignController::class, 'scheduleSms']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/cancel-schedule', [CrmCampaignController::class, 'cancelSmsSchedule']);
    Route::get('crm-campaigns/{id}/sms-messages/{messageId}/recipients', [CrmCampaignController::class, 'smsRecipients']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/recipients', [CrmCampaignController::class, 'addSmsRecipients']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/recipients/contact-group', [CrmCampaignController::class, 'addSmsRecipientsFromGroup']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/recipients/contacts', [CrmCampaignController::class, 'addSmsContacts']);
    Route::post('crm-campaigns/{id}/sms-messages/{messageId}/recipients/copy', [CrmCampaignController::class, 'copySmsRecipients']);
    Route::delete('crm-campaigns/{id}/sms-messages/{messageId}/recipients/{recipientId}', [CrmCampaignController::class, 'removeSmsRecipient']);

    Route::get('crm-campaigns/{id}/attachments', [CrmCampaignController::class, 'attachments']);
    Route::get('crm-campaigns/{id}/attachments/{attachmentId}/download', [CrmCampaignController::class, 'downloadAttachment']);
    Route::delete('crm-campaigns/{id}/attachments/{attachmentId}', [CrmCampaignController::class, 'deleteAttachment']);
    Route::get('crm-campaigns/{id}/send-logs/export', [CrmCampaignController::class, 'exportLogs']);
    Route::get('crm-campaigns/{id}/send-logs/{logId}', [CrmCampaignController::class, 'showLog']);
    Route::post('crm-campaigns/{id}/send-logs/{logId}/retry', [CrmCampaignController::class, 'retryLog']);
    Route::post('crm-campaigns/{id}/send-logs/{logId}/resolve', [CrmCampaignController::class, 'markLogResolved']);
    Route::post('crm-campaigns/{id}/send-logs/retry-failed', [CrmCampaignController::class, 'retryFailedLogs']);
    Route::post('crm-campaigns/bulk', [CrmCampaignController::class, 'bulkStore']);
    Route::patch('crm-campaigns/bulk', [CrmCampaignController::class, 'bulkUpdate']);
    Route::delete('crm-campaigns/bulk', [CrmCampaignController::class, 'bulkDestroy']);
    Route::get('crm-campaigns/{id}/send-logs', [CrmCampaignController::class, 'sendLogs']);
    Route::apiResource('crm-campaigns', CrmCampaignController::class)
        ->parameters(['crm-campaigns' => 'crmCampaign']);

});

Route::post('crm-sequences/bulk', [CrmSequenceController::class, 'bulkStore']);
Route::patch('crm-sequences/bulk', [CrmSequenceController::class, 'bulkUpdate']);
Route::delete('crm-sequences/bulk', [CrmSequenceController::class, 'bulkDestroy']);
Route::apiResource('crm-sequences', CrmSequenceController::class)
    ->parameters(['crm-sequences' => 'crmSequence']);

Route::post('leads/bulk', [LeadController::class, 'bulkStore']);
Route::patch('leads/bulk', [LeadController::class, 'bulkUpdate']);
Route::delete('leads/bulk', [LeadController::class, 'bulkDestroy']);
Route::post('leads/{lead}/move-status', [LeadController::class, 'moveStatus']);
Route::apiResource('leads', LeadController::class);

Route::post('deal-pipelines/bulk', [DealPipelineController::class, 'bulkStore']);
Route::patch('deal-pipelines/bulk', [DealPipelineController::class, 'bulkUpdate']);
Route::delete('deal-pipelines/bulk', [DealPipelineController::class, 'bulkDestroy']);
Route::apiResource('deal-pipelines', DealPipelineController::class)
    ->parameters(['deal-pipelines' => 'dealPipeline']);
Route::apiResource('deal-stages', DealStageController::class)
    ->parameters(['deal-stages' => 'dealStage']);

Route::post('deals/bulk', [DealController::class, 'bulkStore']);
Route::patch('deals/bulk', [DealController::class, 'bulkUpdate']);
Route::delete('deals/bulk', [DealController::class, 'bulkDestroy']);
Route::post('deals/{deal}/move-stage', [DealController::class, 'moveStage']);
Route::apiResource('deals', DealController::class);

Route::post('crm-activities/bulk', [CrmActivityController::class, 'bulkStore']);
Route::patch('crm-activities/bulk', [CrmActivityController::class, 'bulkUpdate']);
Route::delete('crm-activities/bulk', [CrmActivityController::class, 'bulkDestroy']);
Route::post('crm-activities/{crmActivity}/comments', [CrmActivityController::class, 'addComment']);
Route::patch('crm-activities/{crmActivity}/toggle-complete', [CrmActivityController::class, 'toggleComplete']);
Route::apiResource('crm-activities', CrmActivityController::class)
    ->parameters(['crm-activities' => 'crmActivity']);

/*
|--------------------------------------------------------------------------
| Support Tickets
|--------------------------------------------------------------------------
*/

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('support-tickets/summary', [\App\Http\Controllers\Api\SupportTicketController::class, 'summary']);
    Route::patch('support-tickets/{supportTicket}/status', [\App\Http\Controllers\Api\SupportTicketController::class, 'updateStatus']);
    Route::get('support-tickets/{supportTicket}/comments', [\App\Http\Controllers\Api\SupportTicketCommentController::class, 'index']);
    Route::post('support-tickets/{supportTicket}/comments', [\App\Http\Controllers\Api\SupportTicketCommentController::class, 'store']);
    Route::delete('support-tickets/{supportTicket}/comments/{comment}', [\App\Http\Controllers\Api\SupportTicketCommentController::class, 'destroy']);
    Route::apiResource('support-tickets', \App\Http\Controllers\Api\SupportTicketController::class)
        ->parameters(['support-tickets' => 'supportTicket']);
});

/*
|--------------------------------------------------------------------------
| Tax
|--------------------------------------------------------------------------
*/

Route::post('tax-jurisdictions/bulk', [TaxJurisdictionController::class, 'bulkStore']);
Route::patch('tax-jurisdictions/bulk', [TaxJurisdictionController::class, 'bulkUpdate']);
Route::delete('tax-jurisdictions/bulk', [TaxJurisdictionController::class, 'bulkDestroy']);
Route::apiResource('tax-jurisdictions', TaxJurisdictionController::class)
    ->parameters(['tax-jurisdictions' => 'taxJurisdiction']);

Route::post('tax-registrations/bulk', [TaxRegistrationController::class, 'bulkStore']);
Route::patch('tax-registrations/bulk', [TaxRegistrationController::class, 'bulkUpdate']);
Route::delete('tax-registrations/bulk', [TaxRegistrationController::class, 'bulkDestroy']);
Route::apiResource('tax-registrations', TaxRegistrationController::class)
    ->parameters(['tax-registrations' => 'taxRegistration']);

Route::post('product-tax-categories/bulk', [ProductTaxCategoryController::class, 'bulkStore']);
Route::patch('product-tax-categories/bulk', [ProductTaxCategoryController::class, 'bulkUpdate']);
Route::delete('product-tax-categories/bulk', [ProductTaxCategoryController::class, 'bulkDestroy']);
Route::apiResource('product-tax-categories', ProductTaxCategoryController::class)
    ->parameters(['product-tax-categories' => 'productTaxCategory']);

Route::post('tax-classes/bulk', [TaxClassController::class, 'bulkStore']);
Route::patch('tax-classes/bulk', [TaxClassController::class, 'bulkUpdate']);
Route::delete('tax-classes/bulk', [TaxClassController::class, 'bulkDestroy']);
Route::apiResource('tax-classes', TaxClassController::class)
    ->parameters(['tax-classes' => 'taxClass']);

Route::post('tax-rates/bulk', [TaxRateController::class, 'bulkStore']);
Route::patch('tax-rates/bulk', [TaxRateController::class, 'bulkUpdate']);
Route::delete('tax-rates/bulk', [TaxRateController::class, 'bulkDestroy']);
Route::apiResource('tax-rates', TaxRateController::class)
    ->parameters(['tax-rates' => 'taxRate']);

Route::post('tax-rules/bulk', [TaxRuleController::class, 'bulkStore']);
Route::patch('tax-rules/bulk', [TaxRuleController::class, 'bulkUpdate']);
Route::delete('tax-rules/bulk', [TaxRuleController::class, 'bulkDestroy']);
Route::apiResource('tax-rules', TaxRuleController::class)
    ->parameters(['tax-rules' => 'taxRule']);

Route::post('tax-exemptions/bulk', [TaxExemptionController::class, 'bulkStore']);
Route::patch('tax-exemptions/bulk', [TaxExemptionController::class, 'bulkUpdate']);
Route::delete('tax-exemptions/bulk', [TaxExemptionController::class, 'bulkDestroy']);
Route::apiResource('tax-exemptions', TaxExemptionController::class)
    ->parameters(['tax-exemptions' => 'taxExemption']);

// Simple Tax Settings (upsert / singleton)
Route::get('tax-settings',                    [TaxSettingsController::class, 'show']);
Route::put('tax-settings',                    [TaxSettingsController::class, 'upsert']);
Route::post('tax-settings/toggle-advanced',   [TaxSettingsController::class, 'toggleAdvancedMode']);

// Tax Systems
Route::post('tax-systems/bulk', [TaxSystemController::class, 'bulkStore']);
Route::patch('tax-systems/bulk', [TaxSystemController::class, 'bulkUpdate']);
Route::delete('tax-systems/bulk', [TaxSystemController::class, 'bulkDestroy']);
Route::apiResource('tax-systems', TaxSystemController::class)
    ->parameters(['tax-systems' => 'taxSystem']);

// Tax Dashboard & Country Options
Route::get('tax-dashboard-summary', [TaxDashboardController::class, 'summary']);
Route::get('tax-country-options',   [TaxDashboardController::class, 'countryOptions']);

/*
|--------------------------------------------------------------------------
| AI Module
|--------------------------------------------------------------------------
*/
Route::middleware(['web', 'auth', 'verified'])->prefix('ai')->group(function () {
    Route::get('health',                              [AiAssistantController::class, 'health']);
    Route::post('chat',                              [AiAssistantController::class, 'chat'])->middleware('throttle:20,1');

    // RAG semantic search over accounting text (invoice notes, journal narrations).
    Route::post('search',                            AiSemanticSearchController::class)->middleware('throttle:30,1');

    // Conversation history
    Route::get('conversations',                         [AiAssistantController::class, 'conversations']);
    Route::get('conversations/{id}',                    [AiAssistantController::class, 'showConversation']);
    Route::delete('conversations/{id}',                 [AiAssistantController::class, 'deleteConversation']);

    // Pending action approval workflow (propose -> approve/confirm -> execute).
    Route::get('actions',                               [AiActionApprovalController::class, 'index']);
    Route::get('actions/{id}',                          [AiActionApprovalController::class, 'show']);
    Route::get('actions/{id}/audit',                    [AiActionApprovalController::class, 'audit']);
    Route::post('actions/{id}/approve',                 [AiActionApprovalController::class, 'approve'])->middleware('throttle:10,1');
    Route::post('actions/{id}/reject',                  [AiActionApprovalController::class, 'reject'])->middleware('throttle:10,1');
    Route::post('actions/{id}/execute',                 [AiActionApprovalController::class, 'execute'])->middleware('throttle:10,1');

    // Focused AI report summarizer and settings.
    Route::post('report-summary',                       [ReportAiSummaryController::class, 'summarize'])->middleware('throttle:20,1');

    // Settings (DB-backed via GeneralSetting group=ai)
    Route::get('settings',                              [AiSettingsController::class, 'show']);
    Route::put('settings',                              [AiSettingsController::class, 'update']);
    Route::post('settings/test',                        [AiSettingsController::class, 'test']);
    Route::post('settings/test-connection',             [AiSettingsController::class, 'testConnection']);

    // Usage logs
    Route::get('usage-logs',                            [AiUsageLogController::class, 'index']);
});

});

});

/*
|--------------------------------------------------------------------------
| Online Payments Module
|--------------------------------------------------------------------------
*/

// Webhook routes — NO auth required, signature-verified internally
Route::post('webhooks/payments/{provider}', [PaymentWebhookController::class, 'handle'])
    ->name('api.webhooks.payments');

// Public invoice payment routes — NO auth required, rate limited
Route::middleware(['throttle:60,1'])->prefix('public/invoices')->name('api.public.invoices.')->group(function () {
    Route::get('{token}', [PublicInvoicePaymentController::class, 'show'])->name('show');
    Route::post('{token}/create-payment', [PublicInvoicePaymentController::class, 'createPayment'])->name('create-payment');
    Route::post('{token}/verify-payment', [PublicInvoicePaymentController::class, 'verifyPayment'])->name('verify-payment');
});

// Admin protected routes
Route::middleware(['web', 'auth', 'verified'])->group(function () {
    // Online payment settings (singleton)
    Route::get('online-payment-settings', [OnlinePaymentSettingController::class, 'show'])->name('api.online-payment-settings.show');
    Route::put('online-payment-settings', [OnlinePaymentSettingController::class, 'upsert'])->name('api.online-payment-settings.upsert');
    Route::patch('online-payment-settings', [OnlinePaymentSettingController::class, 'upsert']);

    // Payment gateway settings per-provider
    Route::get('payment-gateway-settings', [PaymentGatewaySettingController::class, 'index'])->name('api.payment-gateway-settings.index');
    Route::get('payment-gateway-settings/{provider}', [PaymentGatewaySettingController::class, 'show'])->name('api.payment-gateway-settings.show');
    Route::put('payment-gateway-settings/{provider}', [PaymentGatewaySettingController::class, 'upsert'])->name('api.payment-gateway-settings.upsert');
    Route::patch('payment-gateway-settings/{provider}', [PaymentGatewaySettingController::class, 'upsert']);
    Route::post('payment-gateway-settings/{provider}/test', [PaymentGatewaySettingController::class, 'testCredentials'])->name('api.payment-gateway-settings.test');

    // Invoice payment link management
    Route::get('invoices/{invoice}/payment-link', [InvoicePaymentLinkController::class, 'show'])->name('api.invoices.payment-link.show');
    Route::post('invoices/{invoice}/payment-link', [InvoicePaymentLinkController::class, 'generate'])->name('api.invoices.payment-link.generate');
    Route::delete('invoices/{invoice}/payment-link', [InvoicePaymentLinkController::class, 'disable'])->name('api.invoices.payment-link.disable');

    // Online payments list / detail / refund
    Route::get('online-payments/{id}/webhook-logs', [OnlinePaymentController::class, 'webhookLogs'])->name('api.online-payments.webhook-logs');
    Route::post('online-payments/{id}/refund', [OnlinePaymentController::class, 'refund'])->name('api.online-payments.refund');
    Route::apiResource('online-payments', OnlinePaymentController::class)->only(['index', 'show']);
});

/*
|--------------------------------------------------------------------------
| Document Upload Module
|--------------------------------------------------------------------------
*/
Route::middleware(['web', 'auth', 'verified'])->prefix('document-uploads')->name('api.document-uploads.')->group(function () {
    Route::get('/', [DocumentUploadController::class, 'index'])->name('index');
    Route::post('/', [DocumentUploadController::class, 'store'])->middleware('throttle:20,1')->name('store');
    Route::get('{publicId}', [DocumentUploadController::class, 'show'])->name('show');
    Route::patch('{publicId}', [DocumentUploadController::class, 'update'])->name('update');
    Route::delete('{publicId}', [DocumentUploadController::class, 'destroy'])->name('destroy');
    Route::get('{publicId}/preview', [DocumentUploadController::class, 'preview'])->name('preview');
    Route::post('{publicId}/archive', [DocumentUploadController::class, 'archive'])->name('archive');

    // Extraction / AI
    Route::post('{publicId}/scan-ai', [DocumentExtractionController::class, 'scan'])->middleware('throttle:5,1')->name('scan');
    Route::get('{publicId}/extraction', [DocumentExtractionController::class, 'show'])->name('extraction.show');

    // Entity matching
    Route::post('{publicId}/match-entities', [DocumentEntityMatchController::class, 'match'])->name('match');
    Route::post('matches/{matchId}/choose', [DocumentEntityMatchController::class, 'chooseMatch'])->name('match.choose');
    Route::post('{publicId}/create-missing-fk', [DocumentEntityMatchController::class, 'createFk'])->name('fk.create');

    // Proposals
    Route::get('{publicId}/proposals', [DocumentProposalController::class, 'index'])->name('proposals.index');
    Route::post('{publicId}/proposals', [DocumentProposalController::class, 'store'])->name('proposals.store');
    Route::get('{publicId}/proposals/{proposalId}/review', [DocumentProposalController::class, 'review'])->name('proposals.review');
    Route::put('{publicId}/proposals/{proposalId}/review', [DocumentProposalController::class, 'saveReview'])->name('proposals.review.save');
    Route::patch('{publicId}/proposals/{proposalId}/review', [DocumentProposalController::class, 'saveReview'])->name('proposals.review.patch');
    Route::patch('{publicId}/proposals/{proposalId}', [DocumentProposalController::class, 'update'])->name('proposals.update');
    Route::post('{publicId}/proposals/{proposalId}/convert', [DocumentProposalController::class, 'convert'])->name('proposals.convert');
});
