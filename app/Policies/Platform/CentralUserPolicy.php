<?php

namespace App\Policies\Platform;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralUser;

/**
 * Central operators managing customer accounts. A platform user may always
 * read and edit their own record, and nothing else.
 */
class CentralUserPolicy
{
    public function viewAny($user): bool
    {
        return $user instanceof CentralAdmin && $user->can('platform-users.view');
    }

    public function view($user, CentralUser $target): bool
    {
        return ($user instanceof CentralAdmin && $user->can('platform-users.view')) || ($user instanceof CentralUser && $user->is($target));
    }

    public function create($user): bool
    {
        return $user instanceof CentralAdmin && $user->can('platform-users.create');
    }

    public function update($user, CentralUser $target): bool
    {
        return ($user instanceof CentralAdmin && $user->can('platform-users.update')) || ($user instanceof CentralUser && $user->is($target));
    }

    public function suspend($user, CentralUser $target): bool
    {
        return $user instanceof CentralAdmin && $user->can('platform-users.suspend');
    }
}
