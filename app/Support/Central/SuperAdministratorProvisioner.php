<?php

namespace App\Support\Central;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralRole;
use Database\Seeders\CentralRolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;

/**
 * Single place where the central super administrator is created and granted
 * every central permission (tenants, plans, billing, support, website/CMS,
 * communication, and platform settings).
 *
 * Every installation path funnels through here so the first administrator can
 * always manage the whole SaaS platform and the marketing website without a
 * manual role assignment afterwards.
 */
class SuperAdministratorProvisioner
{
    public const ROLE = 'super_administrator';

    public static function ensure(string $email, ?string $name = null, ?string $password = null): ?CentralAdmin
    {
        $email = strtolower(trim($email));

        if ($email === '') {
            return null;
        }

        $admin = CentralAdmin::withTrashed()->firstOrNew(['email' => $email]);
        $admin->name = $name ?: ($admin->name ?: 'Super Administrator');

        if (filled($password)) {
            $admin->password = Hash::make($password);
        }

        $admin->role = 'super_admin';
        $admin->is_active = true;
        $admin->deleted_at = null;
        $admin->save();

        return self::grant($admin);
    }

    /**
     * Point the installation's primary super administrator at the credentials
     * the installer collected. An existing seeded placeholder is renamed rather
     * than left behind, so an install never ends with a second administrator
     * still holding the default .env credentials.
     */
    public static function ensurePrimary(string $email, ?string $name = null, ?string $password = null): ?CentralAdmin
    {
        $email = strtolower(trim($email));
        $existing = CentralAdmin::query()->orderBy('id')->first();

        if ($email === '' || ! $existing || CentralAdmin::query()->where('email', $email)->whereKeyNot($existing->id)->exists()) {
            return self::ensure($email, $name, $password);
        }

        $existing->forceFill(array_filter([
            'name' => $name ?: $existing->name,
            'email' => $email,
            'password' => filled($password) ? Hash::make((string) $password) : null,
        ]) + ['role' => 'super_admin', 'is_active' => true])->save();

        return self::grant($existing);
    }

    /**
     * Attach the Super Administrator role, which carries every permission in
     * CentralRolesAndPermissionsSeeder::PERMISSIONS.
     */
    public static function grant(CentralAdmin $admin): CentralAdmin
    {
        $admin->roles()->syncWithoutDetaching([self::role()->id]);

        return $admin;
    }

    /**
     * Backfill the role onto super administrators created before the role was
     * attached automatically (older installs, or the CLI/tenancy installers).
     */
    public static function backfill(): int
    {
        $roleId = self::role()->id;

        return CentralAdmin::query()
            ->where('role', 'super_admin')
            ->whereDoesntHave('roles')
            ->get()
            ->each(fn (CentralAdmin $admin) => $admin->roles()->syncWithoutDetaching([$roleId]))
            ->count();
    }

    /**
     * Resolve the Super Administrator role, seeding the central roles and
     * permissions first when it is missing or out of date after an upgrade.
     */
    public static function role(): CentralRole
    {
        $role = CentralRole::query()->where('name', self::ROLE)->first();

        if (! $role || $role->permissions()->count() < count(CentralRolesAndPermissionsSeeder::PERMISSIONS)) {
            (new CentralRolesAndPermissionsSeeder)->run();
            $role = CentralRole::query()->where('name', self::ROLE)->firstOrFail();
        }

        return $role;
    }
}
