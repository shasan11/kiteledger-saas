<?php
namespace App\Models\Central;
class CommunicationRecipient extends CentralModel { protected function casts(): array { return ['consented_at'=>'datetime']; } public function campaign(){ return $this->belongsTo(CommunicationCampaign::class); } }
