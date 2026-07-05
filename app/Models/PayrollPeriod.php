<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = ['month', 'year', 'start_date', 'end_date', 'branch_id', 'status', 'locked_at', 'locked_by'];

    protected $appends = ['name', 'salary_month', 'salary_year', 'locked', 'active'];

    protected function casts(): array
    {
        return [
            'month' => 'integer',
            'year' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'locked_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function payrollRuns(): HasMany
    {
        return $this->hasMany(PayrollRun::class);
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function getNameAttribute(): string
    {
        $month = $this->month ? now()->month((int) $this->month)->format('F') : 'Payroll';

        return trim($month.' '.($this->year ?: ''));
    }

    public function getSalaryMonthAttribute(): ?int
    {
        return $this->month;
    }

    public function getSalaryYearAttribute(): ?int
    {
        return $this->year;
    }

    public function getLockedAttribute(): bool
    {
        return $this->status === 'locked' || (bool) $this->locked_at;
    }

    public function getActiveAttribute(): bool
    {
        return ! in_array($this->status, ['closed', 'locked'], true);
    }
}
