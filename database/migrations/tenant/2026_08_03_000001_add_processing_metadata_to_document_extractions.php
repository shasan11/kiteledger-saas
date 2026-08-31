<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Attempt history for Document AI V2.
 *
 * All columns are additive and nullable so a rollback loses only the new
 * metadata, never an extraction. attempt_number also gives a monotonic ordering
 * that does not depend on comparing UUID primary keys.
 */
return new class extends Migration
{
    /** @var array<string, callable(Blueprint): void> */
    private function columns(): array
    {
        return [
            // Pipeline position, e.g. preparing / reading / extracting.
            'stage' => fn (Blueprint $t) => $t->string('stage', 40)->nullable(),
            // Stable public error code, e.g. DOCUMENT_AI_TIMEOUT.
            'error_code' => fn (Blueprint $t) => $t->string('error_code', 60)->nullable(),
            // Extraction contract version this attempt produced.
            'schema_version' => fn (Blueprint $t) => $t->string('schema_version', 10)->nullable(),
            'attempt_number' => fn (Blueprint $t) => $t->unsignedInteger('attempt_number')->default(1),
            'page_count' => fn (Blueprint $t) => $t->unsignedSmallInteger('page_count')->nullable(),
            'used_ocr' => fn (Blueprint $t) => $t->boolean('used_ocr')->default(false),
            // True when only part of the document could be processed.
            'partial' => fn (Blueprint $t) => $t->boolean('partial')->default(false),
            'duration_ms' => fn (Blueprint $t) => $t->unsignedInteger('duration_ms')->nullable(),
            'review_issue_count' => fn (Blueprint $t) => $t->unsignedSmallInteger('review_issue_count')->nullable(),
            // Field-level v2 payload, kept beside the v1 normalized_json.
            'structured_json' => fn (Blueprint $t) => $t->json('structured_json')->nullable(),
        ];
    }

    public function up(): void
    {
        if (! Schema::hasTable('document_extractions')) {
            return;
        }

        foreach ($this->columns() as $name => $definition) {
            if (Schema::hasColumn('document_extractions', $name)) {
                continue;
            }

            Schema::table('document_extractions', function (Blueprint $table) use ($definition): void {
                $definition($table);
            });
        }

        // Existing rows predate attempt tracking; number them by creation order
        // per document so history stays meaningful.
        if (Schema::hasColumn('document_extractions', 'attempt_number')) {
            $this->backfillAttemptNumbers();
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('document_extractions')) {
            return;
        }

        $existing = array_values(array_filter(
            array_keys($this->columns()),
            static fn (string $column) => Schema::hasColumn('document_extractions', $column),
        ));

        if ($existing === []) {
            return;
        }

        Schema::table('document_extractions', function (Blueprint $table) use ($existing): void {
            $table->dropColumn($existing);
        });
    }

    private function backfillAttemptNumbers(): void
    {
        $documentIds = DB::table('document_extractions')
            ->select('document_upload_id')
            ->distinct()
            ->pluck('document_upload_id');

        foreach ($documentIds as $documentId) {
            $rows = DB::table('document_extractions')
                ->where('document_upload_id', $documentId)
                ->orderBy('created_at')
                ->orderBy('id')
                ->pluck('id');

            foreach ($rows as $index => $id) {
                DB::table('document_extractions')
                    ->where('id', $id)
                    ->update(['attempt_number' => $index + 1]);
            }
        }
    }
};
