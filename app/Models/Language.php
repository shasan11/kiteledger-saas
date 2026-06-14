<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Language extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'name',
        'native_name',
        'direction',
        'date_locale',
        'is_active',
        'is_default',
        'is_system',
        'sort_order',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'is_system' => 'boolean',
            'sort_order' => 'integer',
            'translations' => 'array',
        ];
    }
}
