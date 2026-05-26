<?php

namespace App\Services\AI;

use Illuminate\Database\Eloquent\Model;

class AiContextBuilder
{
    /** Build context for a generic transaction given module name and record. */
    public function transactionContext(string $module, Model $record): array
    {
        $data = $record->toArray();

        // Keep only safe fields
        $safe = $this->filterSafeFields($data);

        return [
            'module'   => $module,
            'record'   => $safe,
        ];
    }

    public function invoiceContext(Model $invoice): array
    {
        return [
            'module' => 'invoice',
            'record' => $this->filterSafeFields($invoice->toArray()),
            'items'  => $this->safeRelation($invoice, 'items'),
        ];
    }

    public function journalVoucherContext(Model $jv): array
    {
        return [
            'module' => 'journal_voucher',
            'record' => $this->filterSafeFields($jv->toArray()),
            'lines'  => $this->safeRelation($jv, 'lines'),
        ];
    }

    public function reportContext(array $reportData): array
    {
        return [
            'report_data' => $this->sanitizeDeep($reportData),
        ];
    }

    public function customerContext(Model $contact): array
    {
        return [
            'module'  => 'customer',
            'contact' => $this->filterSafeFields($contact->toArray()),
        ];
    }

    public function productContext(Model $product): array
    {
        return [
            'module'  => 'product',
            'product' => $this->filterSafeFields($product->toArray()),
        ];
    }

    public function inventoryContext(array $filters): array
    {
        return [
            'module'  => 'inventory',
            'filters' => $filters,
        ];
    }

    public function crmContext(Model $record): array
    {
        return [
            'module' => 'crm',
            'record' => $this->filterSafeFields($record->toArray()),
        ];
    }

    public function paymentCollectionContext(array $filters): array
    {
        return [
            'module'  => 'payment_collection',
            'filters' => $filters,
        ];
    }

    // -------------------------------------------------------------------------

    private function filterSafeFields(array $data): array
    {
        $sensitiveKeys = [
            'password', 'token', 'api_key', 'secret', 'private_key',
            'access_token', 'refresh_token', 'remember_token',
            'api_key_encrypted', 'email_verified_at',
        ];

        return $this->sanitizeDeep($data, $sensitiveKeys);
    }

    private function sanitizeDeep(array $data, array $blocklist = []): array
    {
        foreach ($data as $k => $v) {
            if ($blocklist && in_array(strtolower((string) $k), $blocklist, true)) {
                unset($data[$k]);
                continue;
            }

            if (is_array($v)) {
                $data[$k] = $this->sanitizeDeep($v, $blocklist);
            }
        }

        return $data;
    }

    private function safeRelation(Model $model, string $relation): array
    {
        if (!$model->relationLoaded($relation)) {
            return [];
        }

        $related = $model->getRelation($relation);

        if (!$related) {
            return [];
        }

        if ($related instanceof \Illuminate\Support\Collection) {
            return $related->map(fn ($r) => $this->filterSafeFields($r->toArray()))->values()->toArray();
        }

        return $this->filterSafeFields($related->toArray());
    }
}
