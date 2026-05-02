<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class DesignationHistory extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','user_id','designation_id','start_date','end_date','comment','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function designation(): BelongsTo { return $this->belongsTo(Designation::class); }
}
