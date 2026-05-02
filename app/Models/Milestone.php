<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Milestone extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','project_id','name','start_date','end_date','description','status','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function tasks(): HasMany { return $this->hasMany(Task::class); }
}
