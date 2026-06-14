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
        Schema::create('languages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 12)->unique();
            $table->string('name', 80);
            $table->string('native_name', 80);
            $table->enum('direction', ['ltr', 'rtl'])->default('ltr');
            $table->string('date_locale', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_system')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->json('translations')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        $now = now();

        DB::table('languages')->insert([
            [
                'id' => (string) Str::uuid(),
                'code' => 'en',
                'name' => 'English',
                'native_name' => 'English',
                'direction' => 'ltr',
                'date_locale' => 'en',
                'is_active' => true,
                'is_default' => true,
                'is_system' => true,
                'sort_order' => 0,
                'translations' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'code' => 'ne',
                'name' => 'Nepali',
                'native_name' => 'नेपाली',
                'direction' => 'ltr',
                'date_locale' => 'ne',
                'is_active' => true,
                'is_default' => false,
                'is_system' => true,
                'sort_order' => 10,
                'translations' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'code' => 'ar',
                'name' => 'Arabic',
                'native_name' => 'العربية',
                'direction' => 'rtl',
                'date_locale' => 'ar',
                'is_active' => true,
                'is_default' => false,
                'is_system' => true,
                'sort_order' => 20,
                'translations' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('languages');
    }
};
