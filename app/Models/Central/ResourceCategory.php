<?php
namespace App\Models\Central;
use Illuminate\Database\Eloquent\SoftDeletes;
class ResourceCategory extends CentralModel { use SoftDeletes; public function articles(){ return $this->hasMany(ResourceArticle::class, 'category_id'); } }
