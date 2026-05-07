<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'module', 'template_key', 'subject', 'body', 'variables',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
