<?php

namespace App\Models\Central;

class CentralRole extends CentralModel
{
    public function permissions()
    {
        return $this->belongsToMany(CentralPermission::class, 'central_permission_role', 'role_id', 'permission_id');
    }
}
