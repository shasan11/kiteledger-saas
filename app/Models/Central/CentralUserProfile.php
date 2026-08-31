<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CentralUserProfile extends CentralModel
{
    protected $table = 'central_user_profiles';

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'notification_preferences' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(CentralUser::class, 'central_user_id');
    }
}
