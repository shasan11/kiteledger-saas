<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmCampaign extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'source',
        'medium',
        'budget',
        'start_date',
        'end_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function attributions(): HasMany
    {
        return $this->hasMany(CrmAttribution::class, 'campaign_id');
    }

    public function purchaseBills(): HasMany
    {
        return $this->hasMany(PurchaseBill::class, 'campaign_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'campaign_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class, 'campaign_id');
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class, 'campaign_id');
    }
}
