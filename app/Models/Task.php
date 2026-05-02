<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Task extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','project_id','milestone_id','priority_id','task_status_id','name','description','start_date','end_date','completion_time','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean','completion_time'=>'decimal:2']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function milestone(): BelongsTo { return $this->belongsTo(Milestone::class); }
    public function priority(): BelongsTo { return $this->belongsTo(Priority::class); }
    public function taskStatus(): BelongsTo { return $this->belongsTo(TaskStatus::class); }
    public function assignedTasks(): HasMany { return $this->hasMany(AssignedTask::class); }
}
