<?php

namespace App\Policies\Central;

use App\Models\Central\CentralAdmin;
use App\Models\Central\WebsitePage;

class WebsitePagePolicy
{
    public function viewAny(CentralAdmin $admin): bool
    {
        return $admin->can('cms.view');
    }

    public function view(CentralAdmin $admin, WebsitePage $page): bool
    {
        return $admin->can('cms.view');
    }

    public function create(CentralAdmin $admin): bool
    {
        return $admin->can('cms.manage');
    }

    public function update(CentralAdmin $admin, WebsitePage $page): bool
    {
        return $admin->can('cms.manage');
    }

    public function delete(CentralAdmin $admin, WebsitePage $page): bool
    {
        return $admin->can('cms.manage');
    }
}
