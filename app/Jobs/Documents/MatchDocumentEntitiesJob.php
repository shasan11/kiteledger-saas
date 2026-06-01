<?php

namespace App\Jobs\Documents;

use App\Models\DocumentUpload;
use App\Services\Documents\DocumentEntityMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class MatchDocumentEntitiesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public string $documentUploadId) {}

    public function handle(DocumentEntityMatcher $matcher): void
    {
        $doc = DocumentUpload::with('extraction')->findOrFail($this->documentUploadId);
        if (!$doc->extraction || !is_array($doc->extraction->normalized_json)) {
            return;
        }
        $matcher->matchAll($doc, $doc->extraction->normalized_json);
    }
}
