<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class RolePermission extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','role_id','permission_id','active','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function role(): BelongsTo { return $this->belongsTo(Role::class); }
    public function permission(): BelongsTo { return $this->belongsTo(Permission::class); }
}
