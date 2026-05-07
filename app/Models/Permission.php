<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasUuids;

    protected $fillable = [
        'branch_id', 'name', 'description', 'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'active'               => 'boolean',
            'is_system_generated'  => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions')->withTimestamps();
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
