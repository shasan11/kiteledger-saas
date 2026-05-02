<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Payslip extends Model
{
    use HasFactory;
    protected $fillable = [
        'branch_id','user_id','salary_month','salary_year','salary',
        'paid_leave','unpaid_leave','monthly_holiday','public_holiday','work_day',
        'shift_wise_work_hour','monthly_work_hour','hourly_salary','working_hour',
        'salary_payable','bonus','bonus_comment','deduction','deduction_comment',
        'total_payable','payment_status','active','is_system_generated','user_add_id'
    ];
    protected function casts(): array {
        return ['active'=>'boolean','is_system_generated'=>'boolean',
            'salary'=>'decimal:2','salary_payable'=>'decimal:2','total_payable'=>'decimal:2',
            'bonus'=>'decimal:2','deduction'=>'decimal:2','hourly_salary'=>'decimal:2',
            'salary_month'=>'integer','salary_year'=>'integer','work_day'=>'integer',
            'paid_leave'=>'integer','unpaid_leave'=>'integer','monthly_holiday'=>'integer','public_holiday'=>'integer',
        ];
    }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
