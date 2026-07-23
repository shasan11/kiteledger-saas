<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

class Domain extends BaseDomain
{
    protected $guarded = [];

    protected function domain(): Attribute
    {
        return Attribute::make(
            set: static fn (mixed $value): string => strtolower(trim((string) $value)),
        );
    }

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'is_primary' => 'boolean',
            'verification_token' => 'encrypted',
        ];
    }
}
