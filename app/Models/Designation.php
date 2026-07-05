<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Designation extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'department_id',
        'name',
        'code',
        'level',
        'grade',
        'sort_order',
        'default_basic_salary',
        'salary_frequency',
        'default_salary_structure_id',
        'overtime_eligible',
        'taxable',
        'description',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'default_basic_salary' => 'decimal:2',
            'overtime_eligible' => 'boolean',
            'taxable' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function defaultSalaryStructure(): BelongsTo
    {
        return $this->belongsTo(SalaryStructure::class, 'default_salary_structure_id');
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
