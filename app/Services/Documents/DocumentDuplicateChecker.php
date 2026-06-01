<?php

namespace App\Services\Documents;

use App\Models\CustomerPayment;
use App\Models\DocumentLink;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PurchaseBill;
use App\Models\SupplierPayment;

class DocumentDuplicateChecker
{
    public function check(string $transactionType, array $payload, ?string $fileHash = null): array
    {
        $duplicates = [];

        if ($fileHash) {
            $linked = DocumentLink::query()
                ->whereHas('documentUpload', fn ($q) => $q->where('file_hash', $fileHash))
                ->limit(5)->get();
            foreach ($linked as $l) {
                $duplicates[] = [
                    'reason' => 'file_hash_match',
                    'linkable_type' => $l->linkable_type,
                    'linkable_id' => $l->linkable_id,
                ];
            }
        }

        switch ($transactionType) {
            case 'purchase_bill':
                if (!empty($payload['contact_id']) && !empty($payload['bill_no'])) {
                    $hit = PurchaseBill::query()
                        ->where('contact_id', $payload['contact_id'])
                        ->where('reference', $payload['bill_no'])
                        ->orWhere('bill_no', $payload['bill_no'])
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'supplier_bill_no_match', 'record_id' => $hit->id, 'record_type' => PurchaseBill::class, 'open_url' => "/payment-out/purchase-bills/{$hit->id}"];
                }
                if (!empty($payload['contact_id']) && !empty($payload['bill_date']) && !empty($payload['total'])) {
                    $hit = PurchaseBill::query()
                        ->where('contact_id', $payload['contact_id'])
                        ->whereDate('bill_date', $payload['bill_date'])
                        ->whereBetween('total', [$payload['total'] - 0.01, $payload['total'] + 0.01])
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'supplier_date_total_match', 'record_id' => $hit->id, 'record_type' => PurchaseBill::class, 'open_url' => "/payment-out/purchase-bills/{$hit->id}"];
                }
                break;
            case 'invoice':
                if (!empty($payload['contact_id']) && !empty($payload['reference'])) {
                    $hit = Invoice::query()
                        ->where('contact_id', $payload['contact_id'])
                        ->where('reference', $payload['reference'])
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'customer_ref_match', 'record_id' => $hit->id, 'record_type' => Invoice::class];
                }
                break;
            case 'expense':
                if (!empty($payload['expense_date']) && !empty($payload['total'])) {
                    $hit = Expense::query()
                        ->whereDate('expense_date', $payload['expense_date'])
                        ->whereBetween('total', [$payload['total'] - 0.01, $payload['total'] + 0.01])
                        ->when(!empty($payload['contact_id']), fn ($q) => $q->where('contact_id', $payload['contact_id']))
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'expense_date_amount_match', 'record_id' => $hit->id, 'record_type' => Expense::class];
                }
                break;
            case 'customer_payment':
                if (!empty($payload['contact_id']) && !empty($payload['payment_date']) && !empty($payload['amount'])) {
                    $hit = CustomerPayment::query()
                        ->where('contact_id', $payload['contact_id'])
                        ->whereDate('payment_date', $payload['payment_date'])
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'customer_payment_match', 'record_id' => $hit->id, 'record_type' => CustomerPayment::class];
                }
                break;
            case 'supplier_payment':
                if (!empty($payload['contact_id']) && !empty($payload['payment_date'])) {
                    $hit = SupplierPayment::query()
                        ->where('contact_id', $payload['contact_id'])
                        ->whereDate('payment_date', $payload['payment_date'])
                        ->first();
                    if ($hit) $duplicates[] = ['reason' => 'supplier_payment_match', 'record_id' => $hit->id, 'record_type' => SupplierPayment::class];
                }
                break;
        }

        return $duplicates;
    }
}
