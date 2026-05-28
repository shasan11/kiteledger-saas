<?php

use App\Http\Controllers\Api\AI\AiActionApprovalController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'verified'])
    ->prefix('api/ai')
    ->name('api.ai.')
    ->group(function () {
        Route::get('actions', [AiActionApprovalController::class, 'index'])->name('actions.index');
        Route::get('actions/{id}', [AiActionApprovalController::class, 'show'])->name('actions.show');
        Route::post('actions/{id}/approve', [AiActionApprovalController::class, 'approve'])->name('actions.approve');
        Route::post('actions/{id}/reject', [AiActionApprovalController::class, 'reject'])->name('actions.reject');
    });
