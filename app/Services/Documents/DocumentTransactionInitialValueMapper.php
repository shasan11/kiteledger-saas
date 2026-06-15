<?php

namespace App\Services\Documents;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\DocumentEntityMatch;
use App\Models\DocumentUpload;

class DocumentTransactionInitialValueMapper
{
    public function __construct(
        protected DocumentReviewSchemaBuilder $schemaBuilder,
        protected DocumentTransactionPayloadValidator $validator,
    ) {}

    public function map(
        DocumentUpload $doc,
        string $transactionType,
        array $normalized,
        array $matchedEntities = [],
        array $reviewValues = [],
    ): array {
        $matches = $matchedEntities ?: $this->matchMap($doc);
        $initial = $this->initialValues($doc, $transactionType, $matches);
        $mapped = $this->mergePayload(
            $transactionType,
            $initial,
            $normalized,
            $matches,
            $reviewValues,
        );

        $mapped = $this->recalculate($transactionType, $mapped);
        $missing = $this->validator->missingFields($transactionType, $mapped);
        $warnings = array_values(array_filter(array_merge(
            $normalized['warnings'] ?? [],
            $this->mappingWarnings($transactionType, $mapped, $normalized),
        )));

        return [
            'transaction_type' => $transactionType,
            'initial_values' => $initial,
            'mapped_payload' => $mapped,
            'missing_fields' => $missing,
            'warnings' => array_values(array_unique($warnings)),
            'confidence' => $normalized['confidence'] ?? null,
            'review_schema' => $this->schemaBuilder->build($transactionType, $mapped, $missing, [
                'contact_match_id' => $matches['contact_match_id'] ?? null,
            ]),
        ];
    }

    public function matchMap(DocumentUpload $doc): array
    {
        $matches = DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->whereIn('match_status', ['matched', 'created', 'user_selected'])
            ->whereNotNull('matched_id')
            ->get();

        $map = [];
        $productIdx = 0;

        foreach ($matches as $match) {
            switch ($match->entity_type) {
                case 'customer':
                case 'supplier':
                    $map['contact'] = $match->matched_id;
                    $map['contact_match_id'] = $match->id;
                    break;
                case 'currency':
                    $map['currency'] = $match->matched_id;
                    break;
                case 'warehouse':
                    $role = $match->options['extra']['role'] ?? 'warehouse_default';
                    $map[$role === 'source_warehouse' ? 'warehouse_source' : ($role === 'destination_warehouse' ? 'warehouse_destination' : 'warehouse_default')] = $match->matched_id;
                    break;
                case 'bank_account':
                case 'account':
                case 'chart_of_account':
                    $map['account'] = $match->matched_id;
                    break;
                case 'product':
                    $idx = $match->options['extra']['line_index'] ?? $productIdx;
                    $map['product_' . $idx] = $match->matched_id;
                    $productIdx++;
                    break;
            }
        }

        if (empty($map['contact_match_id'])) {
            $contactMatch = DocumentEntityMatch::query()
                ->where('document_upload_id', $doc->id)
                ->whereIn('entity_type', ['customer', 'supplier'])
                ->latest()
                ->first();

            if ($contactMatch) {
                $map['contact_match_id'] = $contactMatch->id;
            }
        }

        return $map;
    }

    private function initialValues(DocumentUpload $doc, string $type, array $matches): array
    {
        return [
            'active' => true,
            'approved' => false,
            'void' => false,
            'status' => 'draft',
            'exchange_rate' => 1,
            'discount_type' => null,
            'discount_percent' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'tax_rate_id' => null,
            'currency_id' => $matches['currency'] ?? $this->defaultCurrencyId(),
            'branch_id' => $doc->branch_id ?: auth()->user()?->branch_id,
            'user_add_id' => auth()->id(),
            'date' => now()->toDateString(),
            'lines' => [],
        ];
    }

    private function mergePayload(string $type, array $initial, array $normalized, array $matches, array $review): array
    {
        $party = $normalized['party'] ?? [];
        $totals = $normalized['totals'] ?? [];
        $normalizedLines = $normalized['lines']
            ?? $normalized['line_items']
            ?? $normalized['items']
            ?? $normalized['products']
            ?? $normalized['services']
            ?? [];
        $grand = $this->num($totals['grand_total'] ?? $totals['total'] ?? null);
        $documentDate = $normalized['document_date'] ?? now()->toDateString();
        $common = array_replace($initial, [
            'contact_id' => $matches['contact'] ?? null,
            'currency_id' => $matches['currency'] ?? $initial['currency_id'],
            'warehouse_id' => $matches['warehouse_default'] ?? null,
            'reference' => $normalized['document_number'] ?? null,
            'notes' => null,
            'total' => $grand,
            'lines' => $this->mapLines(is_array($normalizedLines) ? $normalizedLines : [], $matches),
            'extracted_party' => [
                'role' => $party['role'] ?? null,
                'name' => $party['name'] ?? null,
                'tax_number' => $party['tax_number'] ?? null,
                'email' => $party['email'] ?? null,
                'phone' => $party['phone'] ?? null,
                'address' => $party['address'] ?? null,
            ],
        ]);

        if ($type === 'expense') {
            $common['lines'] = $this->normalizeExpenseLineAccounts($common['lines']);
        }

        $payload = match ($type) {
            'purchase_bill' => $common + [
                'bill_date' => $documentDate,
                'due_date' => $normalized['due_date'] ?? null,
            ],
            'invoice' => $common + [
                'invoice_date' => $documentDate,
                'due_date' => $normalized['due_date'] ?? null,
            ],
            'expense' => $common + [
                'contact_id' => $matches['contact'] ?? null,
                'expense_date' => $documentDate,
                'due_date' => $normalized['due_date'] ?? null,
                'payment_method' => $normalized['payment']['method'] ?? null,
            ],
            'customer_payment', 'supplier_payment' => array_replace($initial, [
                'contact_id' => $matches['contact'] ?? null,
                'currency_id' => $matches['currency'] ?? $initial['currency_id'],
                'payment_date' => $normalized['payment']['payment_date'] ?? $documentDate,
                'amount' => $this->num($normalized['payment']['paid_amount'] ?? $totals['paid_amount'] ?? $grand),
                'total' => $this->num($normalized['payment']['paid_amount'] ?? $totals['paid_amount'] ?? $grand),
                'account_id' => $matches['account'] ?? $this->defaultPaymentAccountId(),
                'method' => $normalized['payment']['method'] ?? null,
                'payment_method' => $normalized['payment']['method'] ?? null,
                'reference' => $normalized['payment']['reference_no'] ?? $normalized['document_number'] ?? null,
                'extracted_party' => $common['extracted_party'],
            ]),
            'credit_note' => $common + [
                'sales_return_date' => $documentDate,
            ],
            'debit_note' => $common + [
                'debit_note_date' => $documentDate,
            ],
            'purchase_order' => $common + [
                'purchase_order_date' => $documentDate,
            ],
            'sales_order' => $common + [
                'sales_order_date' => $documentDate,
                'grand_total' => $grand,
            ],
            'quotation' => $common + [
                'quotation_date' => $documentDate,
                'expiry_date' => $normalized['due_date'] ?? null,
                'terms_and_conditions' => $normalized['terms_and_conditions'] ?? null,
            ],
            default => $common,
        };

        $merged = array_replace_recursive($payload, $review);

        if (array_key_exists('lines', $review) && is_array($review['lines'])) {
            $merged['lines'] = array_values($review['lines']);
        }

        if ($type === 'expense') {
            $merged['lines'] = $this->normalizeExpenseLineAccounts($merged['lines'] ?? []);
        }

        return $merged;
    }

    private function mapLines(array $lines, array $matches): array
    {
        return array_values(array_map(function (array $line, int $idx) use ($matches) {
            $qty = max($this->num($line['quantity'] ?? $line['qty'] ?? 1), 0.0001);
            $amount = $this->num($line['amount'] ?? $line['line_total'] ?? null);
            $rate = $this->num($line['rate'] ?? $line['unit_price'] ?? ($amount > 0 ? $amount / $qty : 0));
            $discount = $this->num($line['discount'] ?? $line['discount_amount'] ?? 0);
            $tax = $this->num($line['tax_amount'] ?? $line['tax'] ?? 0);
            $lineTotal = $amount > 0 ? $amount : round(($qty * $rate) - $discount + $tax, 2);

            return [
                'product_id' => $matches['product_' . $idx] ?? null,
                'product_name' => $line['product_name'] ?? $line['name'] ?? null,
                'description' => $line['description'] ?? $line['product_name'] ?? 'Extracted line item',
                'qty' => $qty,
                'unit' => $line['unit'] ?? null,
                'unit_price' => $rate,
                'discount_type' => null,
                'discount_percent' => 0,
                'discount_amount' => $discount,
                'tax_rate_id' => $matches['tax_rate_' . $idx] ?? null,
                'tax_amount' => $tax,
                'account_id' => $matches['account_' . $idx] ?? null,
                'account_hint' => $line['account_hint'] ?? null,
                'line_total' => $lineTotal,
                'warning' => empty($matches['product_' . $idx]) ? 'Product not linked' : null,
            ];
        }, $lines, array_keys($lines)));
    }

    private function recalculate(string $type, array $payload): array
    {
        if (!in_array($type, ['customer_payment', 'supplier_payment'], true)) {
            $subtotal = 0;
            $tax = 0;
            foreach (($payload['lines'] ?? []) as $idx => $line) {
                $qty = $this->num($line['qty'] ?? 1);
                $rate = $this->num($line['unit_price'] ?? 0);
                $discount = $this->num($line['discount_amount'] ?? 0);
                $lineTax = $this->num($line['tax_amount'] ?? 0);
                $payload['lines'][$idx]['line_total'] = round(($qty * $rate) - $discount + $lineTax, 2);
                $subtotal += ($qty * $rate) - $discount;
                $tax += $lineTax;
            }
            $payload['subtotal'] = round($subtotal, 2);
            $payload['tax_amount'] = round($tax, 2);
            $payload['total'] = $this->num($payload['total'] ?? 0) > 0
                ? round($this->num($payload['total']), 2)
                : round($subtotal + $tax, 2);
            $payload['grand_total'] = $payload['grand_total'] ?? $payload['total'];
        }

        if (in_array($type, ['customer_payment', 'supplier_payment'], true)) {
            $payload['amount'] = round($this->num($payload['amount'] ?? $payload['total'] ?? 0), 2);
            $payload['total'] = $payload['amount'];
        }

        return $payload;
    }

    private function mappingWarnings(string $type, array $payload, array $normalized): array
    {
        $warnings = [];
        if (empty($payload['contact_id']) && !empty($normalized['party']['name'])) {
            $warnings[] = 'Extracted party needs a linked contact before draft creation.';
        }
        if (!in_array($type, ['customer_payment', 'supplier_payment'], true) && empty($payload['lines'])) {
            $warnings[] = 'No line items were extracted. Add at least one line before creating a draft.';
        }
        return $warnings;
    }

    private function defaultCurrencyId(): ?string
    {
        return Currency::query()->where('is_base', true)->value('id')
            ?: Currency::query()->oldest()->value('id');
    }

    private function defaultPaymentAccountId(): ?string
    {
        return Account::query()->where('active', true)->oldest()->value('id')
            ?: Account::query()->oldest()->value('id');
    }

    private function normalizeExpenseLineAccounts(array $lines): array
    {
        $default = $this->defaultExpenseAccount();

        return array_values(array_map(function (array $line) use ($default) {
            $accountId = $line['account_id'] ?? null;
            $chartOfAccountId = $line['chart_of_account_id'] ?? null;

            if (!$accountId && $chartOfAccountId) {
                $accountId = ChartOfAccount::query()
                    ->whereKey($chartOfAccountId)
                    ->value('account_id');
            }

            $accountId = $accountId ?: $default['account_id'];
            $chartOfAccountId = $accountId
                ? $this->chartOfAccountIdForAccount($accountId)
                : ($chartOfAccountId ?: $default['chart_of_account_id']);

            return [
                ...$line,
                'account_id' => $accountId,
                'chart_of_account_id' => $chartOfAccountId,
            ];
        }, $lines));
    }

    private function defaultExpenseAccount(): array
    {
        $account = Account::query()
            ->where('active', true)
            ->where('nature', 'coa')
            ->orderBy('name')
            ->first()
            ?: Account::query()->firstOrCreate(
                ['code' => 'DOC-EXPENSE'],
                [
                    'name' => 'Uncategorized Document Expense',
                    'nature' => 'coa',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => auth()->id(),
                ]
            );

        return [
            'account_id' => $account->id,
            'chart_of_account_id' => $this->chartOfAccountIdForAccount($account->id),
        ];
    }

    private function chartOfAccountIdForAccount(string $accountId): string
    {
        $chartOfAccountId = ChartOfAccount::query()
            ->where('account_id', $accountId)
            ->value('id');

        if ($chartOfAccountId) {
            return $chartOfAccountId;
        }

        $account = Account::query()->findOrFail($accountId);

        return ChartOfAccount::withoutEvents(function () use ($account) {
            $chart = new ChartOfAccount;
            $chart->forceFill([
                'account_id' => $account->id,
                'type' => 'expense',
                'code' => null,
                'name' => $account->name,
                'description' => 'Legacy expense line compatibility link for account-based posting.',
                'active' => (bool) $account->active,
                'is_system_generated' => true,
                'user_add_id' => $account->user_add_id,
            ])->saveQuietly();

            return $chart->id;
        });
    }

    private function num(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        return (float) preg_replace('/[^\d.\-]/', '', (string) $value);
    }
}
