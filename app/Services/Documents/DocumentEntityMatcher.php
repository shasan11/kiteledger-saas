<?php

namespace App\Services\Documents;

use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentEntityMatch;
use App\Models\DocumentUpload;
use App\Models\Product;
use App\Models\TaxRate;
use App\Models\Warehouse;
use Illuminate\Support\Str;

class DocumentEntityMatcher
{
    public function matchAll(DocumentUpload $doc, array $normalized): array
    {
        $matches = [];

        $partyRole = strtolower((string) ($normalized['party']['role'] ?? ''));
        $entityType = $partyRole === 'supplier' || $partyRole === 'vendor' ? 'supplier' : 'customer';
        $partyName = $normalized['party']['name'] ?? null;
        if ($partyName) {
            $matches[] = $this->saveMatch($doc, $entityType, $partyName, $this->matchContact($partyName, $normalized['party']));
        }

        if (!empty($normalized['currency_code'])) {
            $matches[] = $this->saveMatch($doc, 'currency', $normalized['currency_code'], $this->matchCurrency($normalized['currency_code']));
        }

        foreach (($normalized['lines'] ?? []) as $idx => $line) {
            $name = $line['product_name'] ?? $line['description'] ?? null;
            if (!$name) continue;
            $match = $this->matchProduct($name, $line['product_code'] ?? null);
            $matches[] = $this->saveMatch($doc, 'product', $name, $match, ['line_index' => $idx]);
        }

        foreach (($normalized['journal_entry']['lines'] ?? []) as $idx => $line) {
            $name = $line['account_name'] ?? null;
            if (!$name) continue;
            $match = $this->matchAccount($name);
            $matches[] = $this->saveMatch($doc, 'chart_of_account', $name, $match, ['journal_line_index' => $idx]);
        }

        if (!empty($normalized['payment']['bank_name'])) {
            $matches[] = $this->saveMatch($doc, 'bank_account', $normalized['payment']['bank_name'], $this->matchBank($normalized['payment']['bank_name']));
        }

        foreach (['source_warehouse', 'destination_warehouse'] as $key) {
            $name = $normalized['inventory'][$key] ?? null;
            if (!$name) continue;
            $matches[] = $this->saveMatch($doc, 'warehouse', $name, $this->matchWarehouse($name), ['role' => $key]);
        }

        return array_values(array_filter($matches));
    }

    private function saveMatch(DocumentUpload $doc, string $type, ?string $name, array $result, array $extra = []): ?DocumentEntityMatch
    {
        if (!$name) return null;

        $existing = DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->where('entity_type', $type)
            ->where('extracted_name', $name)
            ->when(!empty($extra), function ($q) use ($extra) {
                foreach ($extra as $k => $v) {
                    $q->whereJsonContains('options->extra->' . $k, $v);
                }
            })
            ->first();

        $data = [
            'document_upload_id' => $doc->id,
            'entity_type' => $type,
            'extracted_name' => $name,
            'matched_model' => $result['model'] ?? null,
            'matched_id' => $result['id'] ?? null,
            'match_status' => $result['status'],
            'confidence_score' => $result['confidence'] ?? null,
            'options' => [
                'suggestions' => $result['suggestions'] ?? [],
                'extra' => $extra,
            ],
        ];

        if ($existing) {
            $existing->update($data);
            return $existing;
        }
        return DocumentEntityMatch::create($data);
    }

    private function matchContact(string $name, array $party): array
    {
        $contact = null;
        if (!empty($party['tax_number'])) {
            $contact = Contact::query()->where('tax_registration_no', $party['tax_number'])->first();
            if ($contact) return $this->matched($contact, Contact::class, 0.98);
        }
        if (!empty($party['email'])) {
            $contact = Contact::query()->whereRaw('LOWER(email) = ?', [strtolower($party['email'])])->first();
            if ($contact) return $this->matched($contact, Contact::class, 0.95);
        }
        $exact = Contact::query()->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($exact) return $this->matched($exact, Contact::class, 0.95);

        $suggestions = Contact::query()
            ->where('name', 'like', '%' . substr($name, 0, max(3, intval(strlen($name) / 2))) . '%')
            ->limit(5)
            ->get(['id', 'name', 'code', 'email'])
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'code' => $c->code])
            ->toArray();

        return $suggestions
            ? ['status' => 'suggested', 'suggestions' => $suggestions, 'model' => Contact::class]
            : ['status' => 'unmatched', 'model' => Contact::class];
    }

    private function matchCurrency(string $code): array
    {
        $cur = Currency::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->first();
        if ($cur) return $this->matched($cur, Currency::class, 1.0);
        return ['status' => 'unmatched', 'model' => Currency::class];
    }

    private function matchProduct(string $name, ?string $code): array
    {
        if ($code) {
            $p = Product::query()->where('sku', $code)->orWhere('code', $code)->first();
            if ($p) return $this->matched($p, Product::class, 0.98);
        }
        $exact = Product::query()->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($exact) return $this->matched($exact, Product::class, 0.95);
        $suggestions = Product::query()
            ->where('name', 'like', '%' . Str::limit($name, 20, '') . '%')
            ->limit(5)
            ->get(['id', 'name', 'sku'])
            ->toArray();
        return $suggestions
            ? ['status' => 'suggested', 'suggestions' => $suggestions, 'model' => Product::class]
            : ['status' => 'unmatched', 'model' => Product::class];
    }

    private function matchAccount(string $name): array
    {
        $exact = ChartOfAccount::query()->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($exact) return $this->matched($exact, ChartOfAccount::class, 0.95);
        $suggestions = ChartOfAccount::query()
            ->where('name', 'like', '%' . Str::limit($name, 20, '') . '%')
            ->limit(5)
            ->get(['id', 'name'])
            ->toArray();
        return $suggestions
            ? ['status' => 'suggested', 'suggestions' => $suggestions, 'model' => ChartOfAccount::class]
            : ['status' => 'unmatched', 'model' => ChartOfAccount::class];
    }

    private function matchBank(string $name): array
    {
        $exact = BankAccount::query()->where('name', 'like', '%' . $name . '%')->first();
        if ($exact) return $this->matched($exact, BankAccount::class, 0.9);
        return ['status' => 'unmatched', 'model' => BankAccount::class];
    }

    private function matchWarehouse(string $name): array
    {
        $exact = Warehouse::query()->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($exact) return $this->matched($exact, Warehouse::class, 0.95);
        return ['status' => 'unmatched', 'model' => Warehouse::class];
    }

    private function matched($model, string $class, float $confidence): array
    {
        return [
            'status' => 'matched',
            'model' => $class,
            'id' => $model->id,
            'confidence' => $confidence,
        ];
    }
}
