<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->foreignUuid('language_id')->nullable()->after('logo')->constrained('languages')->nullOnDelete();
            $table->json('enabled_languages')->nullable()->after('language_id');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('language_id');
            $table->dropColumn('enabled_languages');
        });
    }
};
