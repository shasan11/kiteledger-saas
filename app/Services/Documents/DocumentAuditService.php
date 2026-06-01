<?php

namespace App\Services\Documents;

use Illuminate\Support\Facades\Log;

class DocumentAuditService
{
    public function log(string $event, array $context = []): void
    {
        Log::info('[document_audit] ' . $event, $context + [
            'user_id' => auth()->id(),
            'at' => now()->toIso8601String(),
        ]);
    }
}
