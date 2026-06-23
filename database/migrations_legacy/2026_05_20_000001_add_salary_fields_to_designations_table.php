<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('designations', function (Blueprint $table) {
            $table->uuid('department_id')->nullable()->after('id');
            $table->string('code', 40)->nullable()->unique()->after('name');
            $table->string('level', 50)->nullable()->after('description');
            $table->string('grade', 50)->nullable()->after('level');
            $table->integer('sort_order')->default(100)->after('grade');
            $table->decimal('default_basic_salary', 10, 2)->nullable()->after('sort_order');
            $table->string('salary_frequency', 20)->default('monthly')->after('default_basic_salary');
            $table->uuid('default_salary_structure_id')->nullable()->after('salary_frequency');
            $table->boolean('overtime_eligible')->default(false)->after('default_salary_structure_id');
            $table->boolean('taxable')->default(true)->after('overtime_eligible');

            $table->foreign('department_id')
                  ->references('id')
                  ->on('departments')
                  ->nullOnDelete();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('designations', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn([
                'department_id',
                'code',
                'level',
                'grade',
                'sort_order',
                'default_basic_salary',
                'salary_frequency',
                'default_salary_structure_id',
                'overtime_eligible',
                'taxable',
            ]);
        });

        Schema::enableForeignKeyConstraints();
    }
};
