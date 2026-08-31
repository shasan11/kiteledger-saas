<?php
namespace App\Models\Central;
class WebsitePopup extends CentralModel { protected function casts(): array { return ['is_active'=>'boolean','is_dismissible'=>'boolean','starts_at'=>'datetime','ends_at'=>'datetime']; } public function media(){ return $this->belongsTo(Media::class); } }
