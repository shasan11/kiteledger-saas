<?php
namespace App\Models\Central;
use Illuminate\Database\Eloquent\SoftDeletes;
class CommunicationCampaign extends CentralModel { use SoftDeletes; protected function casts(): array { return ['scheduled_at'=>'datetime','started_at'=>'datetime','completed_at'=>'datetime','metadata'=>'array']; } public function recipients(){ return $this->hasMany(CommunicationRecipient::class, 'campaign_id'); } public function deliveries(){ return $this->hasMany(CommunicationDelivery::class, 'campaign_id'); } }
