<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CrmNote extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'notable_type',
        'notable_id',
        'note',
        'visibility',
        'created_by',
    ];

    public function notable(): MorphTo
    {
        return $this->morphTo();
    }
}
