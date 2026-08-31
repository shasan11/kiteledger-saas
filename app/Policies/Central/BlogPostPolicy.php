<?php

namespace App\Policies\Central;

use App\Models\Central\BlogPost;
use App\Models\Central\CentralAdmin;

class BlogPostPolicy
{
    public function viewAny(CentralAdmin $admin): bool
    {
        return $admin->can('blog.view');
    }

    public function view(CentralAdmin $admin, BlogPost $post): bool
    {
        return $admin->can('blog.view');
    }

    public function create(CentralAdmin $admin): bool
    {
        return $admin->can('blog.manage');
    }

    public function update(CentralAdmin $admin, BlogPost $post): bool
    {
        return $admin->can('blog.manage');
    }

    public function delete(CentralAdmin $admin, BlogPost $post): bool
    {
        return $admin->can('blog.manage');
    }
}
