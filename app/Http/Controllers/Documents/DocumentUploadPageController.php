<?php

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Services\Documents\DocumentPermissionService;
use Inertia\Inertia;

class DocumentUploadPageController extends Controller
{
    /**
     * Dedicated review workspace.
     *
     * Split from the inbox so reviewing is a focused task with the source
     * document visible beside the extracted values. Only the public id is
     * passed through; all scope and permission checks happen on the API call
     * the page makes, so this route cannot be used to widen access.
     */
    public function review(DocumentPermissionService $perms, string $publicId)
    {
        $perms->authorize(auth()->user(), 'document_upload.extract.view');

        return Inertia::render('App/Documents/Review/Show', [
            'publicId' => $publicId,
            'permissions' => $perms->summary(auth()->user()),
        ]);
    }

    public function index(DocumentPermissionService $perms)
    {
        $perms->authorize(auth()->user(), 'document_upload.view');

        return Inertia::render('App/Documents/Upload/Index', [
            'permissions' => $perms->summary(auth()->user()),
            'config' => [
                'max_upload_mb' => (int) config('documents.max_upload_mb', 10),
                'allowed_extensions' => ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
                'transaction_types' => [
                    ['value' => 'purchase_bill', 'label' => 'Purchase Bill'],
                    ['value' => 'invoice', 'label' => 'Invoice'],
                    ['value' => 'expense', 'label' => 'Expense'],
                    ['value' => 'customer_payment', 'label' => 'Customer Payment'],
                    ['value' => 'supplier_payment', 'label' => 'Supplier Payment'],
                    ['value' => 'credit_note', 'label' => 'Credit Note'],
                    ['value' => 'debit_note', 'label' => 'Debit Note'],
                    ['value' => 'purchase_order', 'label' => 'Purchase Order'],
                    ['value' => 'sales_order', 'label' => 'Sales Order'],
                    ['value' => 'quotation', 'label' => 'Quotation'],
                ],
                'document_types' => [
                    'unknown', 'sales_invoice', 'purchase_bill', 'expense_receipt',
                    'customer_payment_slip', 'supplier_payment_slip', 'credit_note',
                    'debit_note', 'journal_voucher', 'purchase_order', 'sales_order',
                    'quotation', 'warehouse_transfer', 'inventory_adjustment',
                    'bank_statement', 'other',
                ],
            ],
        ]);
    }
}
