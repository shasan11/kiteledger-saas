<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printing_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('printing_templates', 'template_key')) {
                $table->string('template_key', 120)->nullable()->after('document_type');
            }
        });

        Schema::table('custom_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('custom_templates', 'template_key')) {
                $table->string('template_key', 120)->nullable()->after('purpose');
            }
        });
    }

    public function down(): void
    {
        Schema::table('custom_templates', function (Blueprint $table) {
            if (Schema::hasColumn('custom_templates', 'template_key')) {
                $table->dropColumn('template_key');
            }
        });

        Schema::table('printing_templates', function (Blueprint $table) {
            if (Schema::hasColumn('printing_templates', 'template_key')) {
                $table->dropColumn('template_key');
            }
        });
    }
};
