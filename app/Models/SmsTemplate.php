<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SmsTemplate extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'name',
        'code',
        'module',
        'subject',
        'internal_title',
        'body',
        'variables',
        'is_active',
        'active',
        'is_system_generated',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function logs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }
}
