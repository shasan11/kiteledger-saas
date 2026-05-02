<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Email extends Model
{
    use HasFactory;
    protected $fillable = ['branch_id','sender_email','receiver_email','subject','body','email_status','active','user_add_id'];
    protected function casts(): array { return ['active'=>'boolean']; }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
}
