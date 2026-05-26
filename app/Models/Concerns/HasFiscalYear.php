<?php

namespace App\Models\Concerns;

use App\Models\FiscalYear;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait HasFiscalYear
{
    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }
}
