<?php
namespace App\Models\Central;
class CommunicationDelivery extends CentralModel { protected function casts(): array { return ['sent_at'=>'datetime']; } public function recipient(){ return $this->belongsTo(CommunicationRecipient::class); } }
