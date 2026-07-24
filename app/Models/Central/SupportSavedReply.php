<?php

namespace App\Models\Central;

class SupportSavedReply extends CentralModel
{
    protected $table = 'support_saved_replies';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function category()
    {
        return $this->belongsTo(SupportCategory::class);
    }
}
