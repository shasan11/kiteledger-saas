<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class LeavePolicy extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','name','paid_leave_count','unpaid_leave_count','description','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean','paid_leave_count'=>'integer','unpaid_leave_count'=>'integer']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
}
