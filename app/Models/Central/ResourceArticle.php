<?php
namespace App\Models\Central;
use Illuminate\Database\Eloquent\SoftDeletes;
class ResourceArticle extends CentralModel { use SoftDeletes; protected function casts(): array { return ['gallery_media_ids'=>'array','published_at'=>'datetime']; } public function category(){ return $this->belongsTo(ResourceCategory::class); } public function featuredMedia(){ return $this->belongsTo(Media::class, 'featured_media_id'); } }
