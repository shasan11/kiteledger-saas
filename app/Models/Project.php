<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'project_manager_id',
        'name',
        'start_date',
        'end_date',
        'description',
        'status',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'branch_id' => 'string',
            'project_manager_id' => 'integer',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class);
    }

    public function taskStatuses(): HasMany
    {
        return $this->hasMany(TaskStatus::class)->orderBy('sort_order')->orderBy('name');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class)->orderBy('task_status_id')->orderBy('sort_order')->orderBy('created_at');
    }

    public function projectTeams(): HasMany
    {
        return $this->hasMany(ProjectTeam::class);
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function purchaseBills(): HasMany
    {
        return $this->hasMany(PurchaseBill::class);
    }
}
