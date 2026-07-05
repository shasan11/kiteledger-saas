<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Durable log for the one-off legacy single-company -> SaaS tenant migration
 * (php artisan saas:migrate-legacy-company). Lives in the CENTRAL database so a
 * crashed/interrupted run can be resumed and audited. One row per attempt.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legacy_migration_runs', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->string('status')->default('running')->index(); // running|completed|failed
            $table->boolean('dry_run')->default(false);
            $table->json('steps')->nullable();   // per-step status map, resume-safe
            $table->json('verification')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_migration_runs');
    }
};
