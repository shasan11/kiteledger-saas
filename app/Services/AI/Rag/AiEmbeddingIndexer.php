<?php

namespace App\Services\AI\Rag;

use App\Models\AiEmbedding;
use App\Models\Contact;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\Product;
use App\Models\PurchaseBill;
use App\Models\Quotation;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;

/**
 * Builds/updates the in-DB embedding index over the TEXT fields of accounting
 * records (never the numbers — those stay with the deterministic financial
 * tools). Slice 1 covers invoice notes/references and journal narrations.
 *
 * Resumable and idempotent: a record whose text + embedding model are unchanged
 * is skipped, so it is safe to re-run from cron or a "Rebuild index" button.
 */
class AiEmbeddingIndexer
{
    public function __construct(
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
    ) {}

    /**
     * Registry of indexable sources. To extend the corpus later, add an entry.
     *
     * @return array<string, array{model: class-string, branch: ?string, text: callable, label: callable}>
     */
    public function sources(): array
    {
        return [
            'invoice' => [
                'model' => Invoice::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->reference ?? null, $m->notes ?? null]),
                'label' => fn ($m) => 'Invoice '.($m->invoice_number ?? $m->getKey()),
            ],
            'journal_voucher' => [
                'model' => JournalVoucher::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->reference ?? null, $m->narration ?? null]),
                'label' => fn ($m) => 'Journal '.($m->voucher_no ?? $m->getKey()),
            ],
            'quotation' => [
                'model' => Quotation::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->reference ?? null, $m->notes ?? null, $m->remarks ?? null, $m->terms_and_conditions ?? null]),
                'label' => fn ($m) => 'Quotation '.($m->quotation_no ?? $m->getKey()),
            ],
            'purchase_bill' => [
                'model' => PurchaseBill::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->reference ?? null, $m->notes ?? null, $m->remarks ?? null]),
                'label' => fn ($m) => 'Purchase Bill '.($m->bill_no ?? $m->getKey()),
            ],
            'expense' => [
                'model' => Expense::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->reference ?? null, $m->notes ?? null, $m->remarks ?? null]),
                'label' => fn ($m) => 'Expense '.($m->expense_no ?? $m->getKey()),
            ],
            'product' => [
                'model' => Product::class,
                'branch' => 'branch_id',
                'text' => fn ($m) => $this->joinText([$m->name ?? null, $m->description ?? null]),
                'label' => fn ($m) => 'Product '.($m->name ?? $m->code ?? $m->getKey()),
            ],
            'contact' => [
                'model' => Contact::class,
                'branch' => null,
                'text' => fn ($m) => $this->joinText([$m->name ?? null, $m->address ?? null, $m->pan ?? null]),
                'label' => fn ($m) => 'Contact '.($m->name ?? $m->getKey()),
            ],
        ];
    }

    /**
     * @return array{indexed: int, skipped: int, empty: int}
     */
    public function index(?string $only = null, ?callable $progress = null): array
    {
        $model = $this->settings->embeddingModel();
        $provider = $this->settings->provider();
        $stats = ['indexed' => 0, 'skipped' => 0, 'empty' => 0];

        foreach ($this->sources() as $type => $cfg) {
            if ($only !== null && $only !== $type) {
                continue;
            }

            $class = $cfg['model'];
            $keyName = (new $class)->getKeyName();

            $class::query()->orderBy($keyName)->chunk(50, function ($rows) use ($type, $cfg, $model, $provider, &$stats, $progress) {
                foreach ($rows as $row) {
                    $text = trim((string) ($cfg['text'])($row));

                    if ($text === '') {
                        $stats['empty']++;

                        continue;
                    }

                    $hash = hash('sha256', $text);
                    $sourceId = (string) $row->getKey();

                    $existing = AiEmbedding::query()
                        ->where('source_type', $type)
                        ->where('source_id', $sourceId)
                        ->first();

                    if ($existing && $existing->content_hash === $hash && $existing->model === $model) {
                        $stats['skipped']++;

                        continue;
                    }

                    $vector = $this->provider->embedOne($text);
                    if ($vector === []) {
                        $stats['empty']++;

                        continue;
                    }

                    AiEmbedding::query()->updateOrCreate(
                        ['source_type' => $type, 'source_id' => $sourceId],
                        [
                            'branch_id' => $cfg['branch'] ? (string) ($row->{$cfg['branch']} ?? '') ?: null : null,
                            'content' => mb_substr($text, 0, 4000),
                            'content_hash' => $hash,
                            'vector' => $vector,
                            'dims' => count($vector),
                            'provider' => $provider,
                            'model' => $model,
                        ],
                    );

                    $stats['indexed']++;

                    if ($progress) {
                        $progress($type, $sourceId, ($cfg['label'])($row));
                    }
                }
            });
        }

        return $stats;
    }

    /**
     * @param  array<int, ?string>  $parts
     */
    private function joinText(array $parts): string
    {
        return trim(implode(' — ', array_filter(array_map(
            fn ($p) => trim((string) $p),
            $parts,
        ), fn ($p) => $p !== '')));
    }
}
