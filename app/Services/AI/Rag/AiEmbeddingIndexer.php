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
        $provider = $this->settings->embeddingProvider();
        $stats = ['indexed' => 0, 'skipped' => 0, 'empty' => 0];

        foreach ($this->sources() as $type => $cfg) {
            if ($only !== null && $only !== $type) {
                continue;
            }

            $class = $cfg['model'];
            $keyName = (new $class)->getKeyName();

            $class::query()->orderBy($keyName)->chunk(50, function ($rows) use ($type, $cfg, $model, $provider, &$stats, $progress) {
                /*
                 * Work is collected for the whole database chunk and embedded
                 * in one call, rather than one HTTP round trip per record.
                 * Content-hash comparison happens first, so an unchanged record
                 * costs nothing at all — a re-run over a large tenant sends no
                 * requests instead of thousands.
                 */
                $work = [];

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
                        ->where('provider', $provider)
                        ->where('model', $model)
                        ->first();

                    if ($existing && $existing->content_hash === $hash && $existing->model === $model) {
                        $stats['skipped']++;

                        continue;
                    }

                    $work[] = [
                        'row' => $row,
                        'source_id' => $sourceId,
                        'text' => $text,
                        'hash' => $hash,
                    ];
                }

                if ($work === []) {
                    return;
                }

                $vectors = $this->provider->embed(array_column($work, 'text'));

                foreach ($work as $position => $item) {
                    // embed() preserves input order and leaves a gap rather
                    // than shifting later vectors, so a missing entry here means
                    // this text specifically did not embed.
                    $vector = $vectors[$position] ?? [];

                    if ($vector === []) {
                        $stats['empty']++;

                        continue;
                    }

                    AiEmbedding::query()->updateOrCreate(
                        ['source_type' => $type, 'source_id' => $item['source_id'], 'provider' => $provider, 'model' => $model],
                        [
                            'branch_id' => $cfg['branch'] ? (string) ($item['row']->{$cfg['branch']} ?? '') ?: null : null,
                            'content' => mb_substr($item['text'], 0, 4000),
                            'content_hash' => $item['hash'],
                            'vector' => $vector,
                            'dims' => count($vector),
                        ],
                    );

                    $stats['indexed']++;

                    if ($progress) {
                        $progress($type, $item['source_id'], ($cfg['label'])($item['row']));
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
