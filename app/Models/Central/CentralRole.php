<?php

namespace App\Models\Central;

class CentralRole extends CentralModel
{
    public function permissions()
    {
        return $this->belongsToMany(CentralPermission::class, 'central_permission_role', 'role_id', 'permission_id');
    }
    public function admins(){ return $this->belongsToMany(CentralAdmin::class,'central_admin_role','role_id','admin_id'); }
}
