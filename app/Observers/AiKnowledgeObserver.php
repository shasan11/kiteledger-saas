<?php

namespace App\Observers;

use App\Jobs\AI\DeleteAiKnowledgeRecord;
use App\Jobs\AI\IndexAiKnowledgeRecord;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use Illuminate\Database\Eloquent\Model;

final class AiKnowledgeObserver
{
    public function __construct(
        private BusinessKnowledgeIndexer $indexer,
        private AiSettingsService $settings,
    ) {}

    public function created(Model $model): void
    {
        $this->index($model);
    }

    public function updated(Model $model): void
    {
        $this->index($model);
    }

    public function restored(Model $model): void
    {
        $this->index($model);
    }

    public function deleted(Model $model): void
    {
        if (! $this->settings->incrementalIndexingEnabled()) {
            return;
        }

        $sourceType = $this->indexer->sourceTypeForTable($model->getTable());
        if ($sourceType && $model->getKey() !== null) {
            DeleteAiKnowledgeRecord::dispatch($sourceType, (string) $model->getKey())->afterCommit();
        }
    }

    private function index(Model $model): void
    {
        if (! $this->settings->incrementalIndexingEnabled()) {
            return;
        }

        $sourceType = $this->indexer->sourceTypeForTable($model->getTable());
        if ($sourceType && $model->getKey() !== null) {
            IndexAiKnowledgeRecord::dispatch($sourceType, (string) $model->getKey())->afterCommit();
        }
    }
}
