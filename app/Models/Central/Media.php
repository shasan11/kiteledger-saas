<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Media extends CentralModel
{
    use SoftDeletes;

    protected $table = 'central_media';

    protected $appends = ['url'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function blogPosts()
    {
        return $this->hasMany(BlogPost::class, 'featured_media_id');
    }

    public function websitePages()
    {
        return $this->hasMany(WebsitePage::class, 'featured_media_id');
    }
}
