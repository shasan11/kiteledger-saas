<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    use HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'branch_id', 'name', 'guard_name', 'description', 'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
