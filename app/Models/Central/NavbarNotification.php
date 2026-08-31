<?php
namespace App\Models\Central;
class NavbarNotification extends CentralModel { protected function casts(): array { return ['is_active'=>'boolean','is_dismissible'=>'boolean','starts_at'=>'datetime','ends_at'=>'datetime']; } }
