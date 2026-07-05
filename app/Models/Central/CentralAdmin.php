<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class CentralAdmin extends Authenticatable
{
    use CentralConnection, SoftDeletes;

    protected $table = 'central_admin_users';

    protected $guarded = [];

    protected $hidden = ['password', 'remember_token', 'mfa_secret', 'mfa_recovery_codes'];

    protected function casts(): array
    {
        return ['permissions' => 'array', 'is_active' => 'boolean', 'last_login_at' => 'datetime', 'mfa_secret' => 'encrypted', 'mfa_recovery_codes' => 'encrypted:array', 'mfa_confirmed_at' => 'datetime'];
    }

    public function roles()
    {
        return $this->belongsToMany(CentralRole::class, 'central_admin_role', 'admin_id', 'role_id');
    }

    public function can($abilities, $arguments = []): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }
        $abilities = is_array($abilities) ? $abilities : [$abilities];

        $rolePermissions = $this->roles()->with('permissions')->get()->flatMap->permissions->pluck('name');

        return collect($abilities)->every(fn ($ability) => $rolePermissions->contains($ability) || in_array($ability, $this->permissions ?? [], true));
    }
}
