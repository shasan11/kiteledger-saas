<?php
namespace App\Models\Central;
use Illuminate\Database\Eloquent\SoftDeletes;
class WebsiteFeature extends CentralModel { use SoftDeletes; protected function casts(): array { return ['published_at'=>'datetime']; } public function featuredMedia(){ return $this->belongsTo(Media::class, 'featured_media_id'); } }
