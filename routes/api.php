<?php

use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\CashTransferController;
use App\Http\Controllers\Api\CashTransferLineController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ChequeRegisterController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ContactGroupController;
use App\Http\Controllers\Api\JournalVoucherController;
use App\Http\Controllers\Api\JournalVoucherLineController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductUnitController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('bank-accounts/bulk', [BankAccountController::class, 'bulkStore']);
Route::patch('bank-accounts/bulk', [BankAccountController::class, 'bulkUpdate']);
Route::delete('bank-accounts/bulk', [BankAccountController::class, 'bulkDestroy']);

Route::apiResource('bank-accounts', BankAccountController::class)
    ->parameters([
        'bank-accounts' => 'bankAccount',
    ]);

Route::post('cash-transfers/bulk', [CashTransferController::class, 'bulkStore']);
Route::patch('cash-transfers/bulk', [CashTransferController::class, 'bulkUpdate']);
Route::delete('cash-transfers/bulk', [CashTransferController::class, 'bulkDestroy']);

Route::apiResource('cash-transfers', CashTransferController::class)
    ->parameters([
        'cash-transfers' => 'cashTransfer',
    ]);


Route::post('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkStore']);
Route::patch('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkUpdate']);
Route::delete('cash-transfer-lines/bulk', [CashTransferLineController::class, 'bulkDestroy']);

Route::apiResource('cash-transfer-lines', CashTransferLineController::class)
    ->parameters([
        'cash-transfer-lines' => 'cashTransferLine',
    ]);


Route::post('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkStore']);
Route::patch('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkUpdate']);
Route::delete('chart-of-accounts/bulk', [ChartOfAccountController::class, 'bulkDestroy']);

Route::apiResource('chart-of-accounts', ChartOfAccountController::class)
    ->parameters([
        'chart-of-accounts' => 'chartOfAccount',
    ]);

Route::post('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkStore']);
Route::patch('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkUpdate']);
Route::delete('journal-vouchers/bulk', [JournalVoucherController::class, 'bulkDestroy']);

Route::apiResource('journal-vouchers', JournalVoucherController::class)
    ->parameters([
        'journal-vouchers' => 'journalVoucher',
    ]);

Route::post('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkStore']);
Route::patch('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkUpdate']);
Route::delete('journal-voucher-lines/bulk', [JournalVoucherLineController::class, 'bulkDestroy']);

Route::apiResource('journal-voucher-lines', JournalVoucherLineController::class)
    ->parameters([
        'journal-voucher-lines' => 'journalVoucherLine',
    ]);


Route::post('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkStore']);
Route::patch('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkUpdate']);
Route::delete('cheque-registers/bulk', [ChequeRegisterController::class, 'bulkDestroy']);

Route::apiResource('cheque-registers', ChequeRegisterController::class)
    ->parameters([
        'cheque-registers' => 'chequeRegister',
    ]);


Route::post('contact-groups/bulk', [ContactGroupController::class, 'bulkStore']);
Route::patch('contact-groups/bulk', [ContactGroupController::class, 'bulkUpdate']);
Route::delete('contact-groups/bulk', [ContactGroupController::class, 'bulkDestroy']);

Route::apiResource('contact-groups', ContactGroupController::class)
    ->parameters([
        'contact-groups' => 'contactGroup',
    ]);

Route::post('contacts/bulk', [ContactController::class, 'bulkStore']);
Route::patch('contacts/bulk', [ContactController::class, 'bulkUpdate']);
Route::delete('contacts/bulk', [ContactController::class, 'bulkDestroy']);

Route::apiResource('contacts', ContactController::class)
    ->parameters([
        'contacts' => 'contact',
    ]);


Route::post('product-categories/bulk', [ProductCategoryController::class, 'bulkStore']);
Route::patch('product-categories/bulk', [ProductCategoryController::class, 'bulkUpdate']);
Route::delete('product-categories/bulk', [ProductCategoryController::class, 'bulkDestroy']);

Route::apiResource('product-categories', ProductCategoryController::class)
    ->parameters([
        'product-categories' => 'productCategory',
    ]);

Route::post('product-units/bulk', [ProductUnitController::class, 'bulkStore']);
Route::patch('product-units/bulk', [ProductUnitController::class, 'bulkUpdate']);
Route::delete('product-units/bulk', [ProductUnitController::class, 'bulkDestroy']);

Route::apiResource('product-units', ProductUnitController::class)
    ->parameters([
        'product-units' => 'productUnit',
    ]);

Route::post('products/bulk', [ProductController::class, 'bulkStore']);
Route::patch('products/bulk', [ProductController::class, 'bulkUpdate']);
Route::delete('products/bulk', [ProductController::class, 'bulkDestroy']);

Route::apiResource('products', ProductController::class)
    ->parameters([
        'products' => 'product',
    ]);

Route::post('warehouses/bulk', [WarehouseController::class, 'bulkStore']);
Route::patch('warehouses/bulk', [WarehouseController::class, 'bulkUpdate']);
Route::delete('warehouses/bulk', [WarehouseController::class, 'bulkDestroy']);

Route::apiResource('warehouses', WarehouseController::class)
    ->parameters([
        'warehouses' => 'warehouse',
    ]);
