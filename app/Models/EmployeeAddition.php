<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeAddition extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'employee_id',
        'branch_id',
        'component_id',
        'name',
        'amount',
        'calculation_type',
        'recurring',
        'effective_from',
        'effective_to',
        'active',
        'remarks',
        'consumed_payslip_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'recurring' => 'boolean',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'active' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class, 'component_id');
    }
}
