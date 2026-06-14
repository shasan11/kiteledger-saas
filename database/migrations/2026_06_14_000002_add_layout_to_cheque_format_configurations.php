<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cheque_format_configurations', function (Blueprint $table) {
            if (!Schema::hasColumn('cheque_format_configurations', 'layout_json')) {
                $table->json('layout_json')->nullable()->after('signature_position');
            }
            if (!Schema::hasColumn('cheque_format_configurations', 'signature_image')) {
                // Stores a base64 data URI so it prints cleanly via dompdf without storage symlinks.
                $table->longText('signature_image')->nullable()->after('layout_json');
            }
            if (!Schema::hasColumn('cheque_format_configurations', 'signature_width')) {
                $table->unsignedInteger('signature_width')->nullable()->after('signature_image');
            }
            if (!Schema::hasColumn('cheque_format_configurations', 'signature_height')) {
                $table->unsignedInteger('signature_height')->nullable()->after('signature_width');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cheque_format_configurations', function (Blueprint $table) {
            foreach (['layout_json', 'signature_image', 'signature_width', 'signature_height'] as $column) {
                if (Schema::hasColumn('cheque_format_configurations', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
