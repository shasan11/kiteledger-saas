<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ProjectTeamMember extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','project_team_id','user_id','active','is_system_generated','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean','is_system_generated'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function projectTeam(): BelongsTo { return $this->belongsTo(ProjectTeam::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
