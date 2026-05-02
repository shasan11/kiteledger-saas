<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class WeeklyHoliday extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','name','start_day','end_day','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean','start_day'=>'integer','end_day'=>'integer']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
}
