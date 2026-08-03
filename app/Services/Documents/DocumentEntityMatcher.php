<?php

namespace App\Services\Documents;

use App\Models\BankAccount;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentEntityMatch;
use App\Models\DocumentUpload;
use App\Models\Product;
use App\Models\TaxRate;
use App\Models\Warehouse;
use App\Services\Documents\Matching\AccountMatcher;
use App\Services\Documents\Matching\MatchCandidate;
use App\Services\Documents\Matching\PartyMatcher;
use App\Services\Documents\Matching\ProductMatcher;
use Illuminate\Support\Str;

class DocumentEntityMatcher
{
    public function __construct(
        private readonly PartyMatcher $parties,
        private readonly ProductMatcher $products,
        private readonly AccountMatcher $accounts,
    ) {}

    public function matchAll(DocumentUpload $doc, array $normalized): array
    {
        $matches = [];

        $partyRole = strtolower((string) ($normalized['party']['role'] ?? ''));
        $entityType = $partyRole === 'supplier' || $partyRole === 'vendor' ? 'supplier' : 'customer';
        $partyName = $normalized['party']['name'] ?? null;
        if ($partyName) {
            $matches[] = $this->saveMatch(
                $doc,
                $entityType,
                $partyName,
                $this->matchContact($partyName, $normalized['party'], $entityType),
            );
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
            $matches[] = $this->saveMatch($doc, 'account', $name, $match, ['journal_line_index' => $idx]);
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

    /**
     * Delegates to PartyMatcher so contact matching has one implementation.
     *
     * The previous inline version ranked on a raw name LIKE, which could rank a
     * loose substring above a tax-number match and gave the reviewer no reason
     * for a suggestion. PartyMatcher orders by evidence strength and explains
     * each candidate, and never auto-selects a fuzzy name.
     *
     * @param array{tax_number?: ?string, email?: ?string, phone?: ?string, role?: ?string} $party
     */
    private function matchContact(string $name, array $party, ?string $role = null): array
    {
        $candidates = $this->parties->match([
            'name' => $name,
            'tax_number' => $party['tax_number'] ?? null,
            'email' => $party['email'] ?? null,
            'phone' => $party['phone'] ?? null,
        ], $role);

        if ($candidates === []) {
            return ['status' => 'unmatched', 'model' => Contact::class];
        }

        $best = $candidates[0];

        // Only strong, verifiable evidence auto-matches. Anything weaker is
        // offered for confirmation, so a guess never silently becomes the
        // supplier on a bill.
        if ($best->isAutoSelectable()) {
            $contact = Contact::query()->find($best->publicId);

            if ($contact) {
                $matched = $this->matched($contact, Contact::class, $best->score);
                $matched['match_reason'] = $best->reason;

                return $matched;
            }
        }

        $suggestions = array_map(
            static fn ($candidate) => [
                'id' => $candidate->publicId,
                'name' => $candidate->displayName,
                'code' => $candidate->code,
                'reason' => $candidate->reason,
            ],
            $candidates,
        );

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

    /** Delegates to ProductMatcher so barcode/SKU rank above a description. */
    private function matchProduct(string $name, ?string $code): array
    {
        return $this->resolve(
            $this->products->match(['name' => $name, 'code' => $code]),
            Product::class,
        );
    }

    /** Delegates to AccountMatcher, which never auto-selects on name similarity. */
    private function matchAccount(string $name): array
    {
        return $this->resolve($this->accounts->match($name), Account::class);
    }

    /**
     * Turns ranked candidates into the match record shape.
     *
     * Only an auto-selectable candidate becomes a match; everything else is a
     * suggestion carrying its reason, so the reviewer sees why it was offered.
     *
     * @param MatchCandidate[] $candidates
     */
    private function resolve(array $candidates, string $modelClass): array
    {
        if ($candidates === []) {
            return ['status' => 'unmatched', 'model' => $modelClass];
        }

        $best = $candidates[0];

        if ($best->isAutoSelectable()) {
            $record = $modelClass::query()->find($best->publicId);

            if ($record) {
                $matched = $this->matched($record, $modelClass, $best->score);
                $matched['match_reason'] = $best->reason;

                return $matched;
            }
        }

        return [
            'status' => 'suggested',
            'suggestions' => array_map(
                static fn (MatchCandidate $c) => [
                    'id' => $c->publicId,
                    'name' => $c->displayName,
                    'code' => $c->code,
                    'reason' => $c->reason,
                ],
                $candidates,
            ),
            'model' => $modelClass,
        ];
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
