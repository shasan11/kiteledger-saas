<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmAttribution extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'campaign_id',
        'lead_id',
        'deal_id',
        'contact_id',
        'source',
        'medium',
        'value',
        'revenue',
        'cost',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'revenue' => 'decimal:2',
            'cost' => 'decimal:2',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }
}
