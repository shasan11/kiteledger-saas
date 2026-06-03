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
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'username')) {
            return;
        }

        DB::table('users')
            ->select(['id', 'email', 'name', 'username'])
            ->orderBy('id')
            ->chunkById(100, function ($users) {
                foreach ($users as $user) {
                    if (trim((string) $user->username) !== '') {
                        continue;
                    }

                    $base = Str::of(Str::before((string) $user->email, '@') ?: (string) $user->name ?: 'user')
                        ->lower()
                        ->replaceMatches('/[^a-z0-9._-]+/', '.')
                        ->trim('.-_')
                        ->toString() ?: 'user';

                    $username = $base;
                    $suffix = 1;

                    while (DB::table('users')->where('username', $username)->where('id', '!=', $user->id)->exists()) {
                        $username = $base . $suffix++;
                    }

                    DB::table('users')->where('id', $user->id)->update(['username' => $username]);
                }
            });

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username', 80)->nullable(false)->change();
            });
        } catch (Throwable) {
            // Some drivers cannot alter nullability without a table rebuild; app validation remains authoritative.
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'username')) {
            try {
                Schema::table('users', function (Blueprint $table) {
                    $table->string('username', 80)->nullable()->change();
                });
            } catch (Throwable) {
                //
            }
        }
    }
};
