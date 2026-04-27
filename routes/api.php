<?php

use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\CashTransferController;
use App\Http\Controllers\Api\CashTransferLineController;
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

