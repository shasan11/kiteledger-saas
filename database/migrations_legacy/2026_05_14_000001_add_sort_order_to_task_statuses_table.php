<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_statuses', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('color');
        });

        DB::table('task_statuses')
            ->orderBy('project_id')
            ->orderBy('name')
            ->get(['id', 'project_id'])
            ->groupBy('project_id')
            ->each(function ($statuses) {
                $statuses->values()->each(function ($status, int $index) {
                    DB::table('task_statuses')
                        ->where('id', $status->id)
                        ->update(['sort_order' => $index + 1]);
                });
            });
    }

    public function down(): void
    {
        Schema::table('task_statuses', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
