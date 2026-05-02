<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Project extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','name','project_manager_id','start_date','end_date','status','description','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function projectManager(): BelongsTo { return $this->belongsTo(User::class,'project_manager_id'); }
    public function milestones(): HasMany { return $this->hasMany(Milestone::class); }
    public function taskStatuses(): HasMany { return $this->hasMany(TaskStatus::class); }
    public function tasks(): HasMany { return $this->hasMany(Task::class); }
    public function projectTeams(): HasMany { return $this->hasMany(ProjectTeam::class); }
}
