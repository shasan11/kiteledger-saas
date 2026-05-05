<?php

use App\Http\Controllers\Api\AlertTypeController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\ApplicationSettingController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CashTransferController;
use App\Http\Controllers\Api\CreditTermController;
use App\Http\Controllers\Api\CrmActivityController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\CustomTemplateController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\DealPipelineController;
use App\Http\Controllers\Api\DealStageController;
use App\Http\Controllers\Api\DocumentNumberingController;
use App\Http\Controllers\Api\EmployeeProfileController;
use App\Http\Controllers\Api\GeneralSettingController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LoanAccountController;
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
use App\Http\Controllers\Api\CashTransferLineController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ChequeRegisterController;
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
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\WarehouseTransferController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductUnitController;
use App\Http\Controllers\Api\ProductVariantItemController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\CurrencyController;
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
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\MilestoneController;
use App\Http\Controllers\Api\PriorityController;
use App\Http\Controllers\Api\TaskStatusController;
use App\Http\Controllers\Api\TaskController as HrmTaskController;
use App\Http\Controllers\Api\AssignedTaskController;
use App\Http\Controllers\Api\ProjectTeamController;
use App\Http\Controllers\Api\ProjectTeamMemberController;

/*
|--------------------------------------------------------------------------
| Bank Accounts
|--------------------------------------------------------------------------
*/

Route::post('bank-accounts/bulk', [BankAccountController::class, 'bulkStore']);
Route::patch('bank-accounts/bulk', [BankAccountController::class, 'bulkUpdate']);
Route::delete('bank-accounts/bulk', [BankAccountController::class, 'bulkDestroy']);

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

/*
|--------------------------------------------------------------------------
| Cash Transfers
|--------------------------------------------------------------------------
*/

Route::post('cash-transfers/bulk', [CashTransferController::class, 'bulkStore']);
Route::patch('cash-transfers/bulk', [CashTransferController::class, 'bulkUpdate']);
Route::delete('cash-transfers/bulk', [CashTransferController::class, 'bulkDestroy']);

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

Route::apiResource('cheque-registers', ChequeRegisterController::class)
    ->parameters([
        'cheque-registers' => 'chequeRegister',
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
Route::apiResource('warehouse-transfers', WarehouseTransferController::class);

Route::post('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkStore']);
Route::patch('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkUpdate']);
Route::delete('inventory-adjustments/bulk', [InventoryAdjustmentController::class, 'bulkDestroy']);
Route::apiResource('inventory-adjustments', InventoryAdjustmentController::class);

Route::post('quotations/bulk', [QuotationController::class, 'bulkStore']);
Route::patch('quotations/bulk', [QuotationController::class, 'bulkUpdate']);
Route::delete('quotations/bulk', [QuotationController::class, 'bulkDestroy']);
Route::apiResource('quotations', QuotationController::class);

Route::post('sales-orders/bulk', [SalesOrderController::class, 'bulkStore']);
Route::patch('sales-orders/bulk', [SalesOrderController::class, 'bulkUpdate']);
Route::delete('sales-orders/bulk', [SalesOrderController::class, 'bulkDestroy']);
Route::apiResource('sales-orders', SalesOrderController::class);

Route::post('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkStore']);
Route::patch('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkUpdate']);
Route::delete('proforma-invoices/bulk', [ProformaInvoiceController::class, 'bulkDestroy']);
Route::apiResource('proforma-invoices', ProformaInvoiceController::class);

Route::post('invoices/bulk', [InvoiceController::class, 'bulkStore']);
Route::patch('invoices/bulk', [InvoiceController::class, 'bulkUpdate']);
Route::delete('invoices/bulk', [InvoiceController::class, 'bulkDestroy']);
Route::apiResource('invoices', InvoiceController::class);

Route::post('customer-payments/bulk', [CustomerPaymentController::class, 'bulkStore']);
Route::patch('customer-payments/bulk', [CustomerPaymentController::class, 'bulkUpdate']);
Route::delete('customer-payments/bulk', [CustomerPaymentController::class, 'bulkDestroy']);
Route::apiResource('customer-payments', CustomerPaymentController::class);

Route::post('sales-returns/bulk', [SalesReturnController::class, 'bulkStore']);
Route::patch('sales-returns/bulk', [SalesReturnController::class, 'bulkUpdate']);
Route::delete('sales-returns/bulk', [SalesReturnController::class, 'bulkDestroy']);
Route::apiResource('sales-returns', SalesReturnController::class);

Route::post('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkStore']);
Route::patch('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkUpdate']);
Route::delete('purchase-orders/bulk', [PurchaseOrderController::class, 'bulkDestroy']);
Route::apiResource('purchase-orders', PurchaseOrderController::class);

Route::post('purchase-bills/bulk', [PurchaseBillController::class, 'bulkStore']);
Route::patch('purchase-bills/bulk', [PurchaseBillController::class, 'bulkUpdate']);
Route::delete('purchase-bills/bulk', [PurchaseBillController::class, 'bulkDestroy']);
Route::apiResource('purchase-bills', PurchaseBillController::class);

Route::post('expenses/bulk', [ExpenseController::class, 'bulkStore']);
Route::patch('expenses/bulk', [ExpenseController::class, 'bulkUpdate']);
Route::delete('expenses/bulk', [ExpenseController::class, 'bulkDestroy']);
Route::apiResource('expenses', ExpenseController::class);

Route::post('debit-notes/bulk', [DebitNoteController::class, 'bulkStore']);
Route::patch('debit-notes/bulk', [DebitNoteController::class, 'bulkUpdate']);
Route::delete('debit-notes/bulk', [DebitNoteController::class, 'bulkDestroy']);
Route::apiResource('debit-notes', DebitNoteController::class);

Route::post('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkStore']);
Route::patch('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkUpdate']);
Route::delete('supplier-payments/bulk', [SupplierPaymentController::class, 'bulkDestroy']);
Route::apiResource('supplier-payments', SupplierPaymentController::class);

Route::post('variants/bulk', [VariantController::class, 'bulkStore']);
Route::patch('variants/bulk', [VariantController::class, 'bulkUpdate']);
Route::delete('variants/bulk', [VariantController::class, 'bulkDestroy']);
Route::apiResource('variants', VariantController::class);
Route::apiResource('product-variants', ProductVariantItemController::class);

/*
|--------------------------------------------------------------------------
| HRM Routes
|--------------------------------------------------------------------------
*/
Route::prefix('hrm')->group(function () {
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
    Route::apiResource('email-configs', EmailConfigController::class);
    Route::apiResource('emails', EmailController::class);
    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('milestones', MilestoneController::class);
    Route::apiResource('priorities', PriorityController::class);
    Route::apiResource('task-statuses', TaskStatusController::class);
    Route::apiResource('tasks', HrmTaskController::class);
    Route::apiResource('assigned-tasks', AssignedTaskController::class);
    Route::apiResource('project-teams', ProjectTeamController::class);
    Route::apiResource('project-team-members', ProjectTeamMemberController::class);

    Route::post('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkStore']);
    Route::patch('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkUpdate']);
    Route::delete('employee-profiles/bulk', [EmployeeProfileController::class, 'bulkDestroy']);
    Route::apiResource('employee-profiles', EmployeeProfileController::class);
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

/*
|--------------------------------------------------------------------------
| CRM
|--------------------------------------------------------------------------
*/

Route::post('credit-terms/bulk', [CreditTermController::class, 'bulkStore']);
Route::patch('credit-terms/bulk', [CreditTermController::class, 'bulkUpdate']);
Route::delete('credit-terms/bulk', [CreditTermController::class, 'bulkDestroy']);
Route::apiResource('credit-terms', CreditTermController::class)
    ->parameters(['credit-terms' => 'creditTerm']);

Route::post('leads/bulk', [LeadController::class, 'bulkStore']);
Route::patch('leads/bulk', [LeadController::class, 'bulkUpdate']);
Route::delete('leads/bulk', [LeadController::class, 'bulkDestroy']);
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
Route::apiResource('deals', DealController::class);

Route::post('crm-activities/bulk', [CrmActivityController::class, 'bulkStore']);
Route::patch('crm-activities/bulk', [CrmActivityController::class, 'bulkUpdate']);
Route::delete('crm-activities/bulk', [CrmActivityController::class, 'bulkDestroy']);
Route::apiResource('crm-activities', CrmActivityController::class)
    ->parameters(['crm-activities' => 'crmActivity']);

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
