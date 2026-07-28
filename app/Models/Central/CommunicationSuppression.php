<?php
namespace App\Models\Central;
class CommunicationSuppression extends CentralModel { protected function casts(): array { return ['suppressed_at'=>'datetime']; } }
