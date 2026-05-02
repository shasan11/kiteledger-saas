<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class EmailConfig extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','email_config_name','email_host','email_port','email_user','email_pass','active','user_add_id'];
    protected $hidden = ['email_pass'];
    protected function casts(): array { return ['active'=>'boolean','email_port'=>'integer']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
}
