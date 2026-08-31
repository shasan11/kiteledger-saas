<?php

namespace App\Models\Central;

/** Backwards-compatible central-admin namespace. */
class Domain extends \App\Models\Domain
{
    protected function casts(): array
    {
        return array_merge(parent::casts(), ['verification_attempted_at' => 'datetime', 'activated_at' => 'datetime', 'disabled_at' => 'datetime', 'metadata' => 'array']);
    }
}
