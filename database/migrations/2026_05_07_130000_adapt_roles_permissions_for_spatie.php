<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (!Schema::hasColumn('roles', 'guard_name')) {
                $table->string('guard_name', 80)->default('web')->after('name');
            }
        });

        Schema::table('permissions', function (Blueprint $table) {
            if (!Schema::hasColumn('permissions', 'guard_name')) {
                $table->string('guard_name', 80)->default('web')->after('name');
            }
        });

        Role::query()->whereNull('guard_name')->orWhere('guard_name', '')->update(['guard_name' => 'web']);
        Permission::query()->whereNull('guard_name')->orWhere('guard_name', '')->update(['guard_name' => 'web']);

        if (!Schema::hasTable('role_has_permissions')) {
            Schema::create('role_has_permissions', function (Blueprint $table) {
                $table->foreignUuid('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
                $table->primary(['permission_id', 'role_id'], 'role_has_permissions_permission_id_role_id_primary');
            });
        }

        if (!Schema::hasTable('model_has_roles')) {
            Schema::create('model_has_roles', function (Blueprint $table) {
                $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
                $table->string('model_type');
                $table->unsignedBigInteger('model_id');
                $table->index(['model_id', 'model_type'], 'model_has_roles_model_id_model_type_index');
                $table->primary(['role_id', 'model_id', 'model_type'], 'model_has_roles_role_model_type_primary');
            });
        }

        if (!Schema::hasTable('model_has_permissions')) {
            Schema::create('model_has_permissions', function (Blueprint $table) {
                $table->foreignUuid('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->string('model_type');
                $table->unsignedBigInteger('model_id');
                $table->index(['model_id', 'model_type'], 'model_has_permissions_model_id_model_type_index');
                $table->primary(['permission_id', 'model_id', 'model_type'], 'model_has_permissions_permission_model_type_primary');
            });
        }

        DB::table('role_permissions')
            ->orderBy('role_id')
            ->get(['role_id', 'permission_id'])
            ->each(function ($row) {
                DB::table('role_has_permissions')->updateOrInsert([
                    'role_id' => $row->role_id,
                    'permission_id' => $row->permission_id,
                ]);
            });

        DB::table('users')
            ->whereNotNull('role_id')
            ->orderBy('id')
            ->get(['id', 'role_id'])
            ->each(function ($row) {
                if (DB::table('roles')->where('id', $row->role_id)->exists()) {
                    DB::table('model_has_roles')->updateOrInsert([
                        'role_id' => $row->role_id,
                        'model_type' => App\Models\User::class,
                        'model_id' => $row->id,
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('role_has_permissions');
    }
};
