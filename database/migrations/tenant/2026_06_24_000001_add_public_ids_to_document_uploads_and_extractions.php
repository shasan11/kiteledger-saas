<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('document_uploads') && ! Schema::hasColumn('document_uploads', 'public_id')) {
            Schema::table('document_uploads', function (Blueprint $table): void {
                $table->uuid('public_id')->nullable()->after('id');
            });

            DB::table('document_uploads')
                ->whereNull('public_id')
                ->orderBy('id')
                ->select('id')
                ->chunk(100, function ($rows): void {
                    foreach ($rows as $row) {
                        DB::table('document_uploads')
                            ->where('id', $row->id)
                            ->update(['public_id' => (string) Str::uuid()]);
                    }
                });

            Schema::table('document_uploads', function (Blueprint $table): void {
                $table->unique('public_id', 'document_uploads_public_id_unique');
            });
        }

        if (Schema::hasTable('document_extractions') && ! Schema::hasColumn('document_extractions', 'public_id')) {
            Schema::table('document_extractions', function (Blueprint $table): void {
                $table->uuid('public_id')->nullable()->after('id');
            });

            DB::table('document_extractions')
                ->whereNull('public_id')
                ->orderBy('id')
                ->select('id')
                ->chunk(100, function ($rows): void {
                    foreach ($rows as $row) {
                        DB::table('document_extractions')
                            ->where('id', $row->id)
                            ->update(['public_id' => (string) Str::uuid()]);
                    }
                });

            Schema::table('document_extractions', function (Blueprint $table): void {
                $table->unique('public_id', 'document_extractions_public_id_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('document_extractions') && Schema::hasColumn('document_extractions', 'public_id')) {
            Schema::table('document_extractions', function (Blueprint $table): void {
                $table->dropUnique('document_extractions_public_id_unique');
                $table->dropColumn('public_id');
            });
        }

        if (Schema::hasTable('document_uploads') && Schema::hasColumn('document_uploads', 'public_id')) {
            Schema::table('document_uploads', function (Blueprint $table): void {
                $table->dropUnique('document_uploads_public_id_unique');
                $table->dropColumn('public_id');
            });
        }
    }
};
