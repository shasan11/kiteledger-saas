<?php

namespace App\Policies\Central;

use App\Models\Central\CentralAdmin;
use App\Models\Central\PaymentGateway;

class PaymentGatewayPolicy
{
    public function viewAny(CentralAdmin $admin): bool
    {
        return $admin->can('gateway.view');
    }

    public function view(CentralAdmin $admin, PaymentGateway $gateway): bool
    {
        return $admin->can('gateway.view');
    }

    public function update(CentralAdmin $admin, PaymentGateway $gateway): bool
    {
        return $admin->can('gateway.manage');
    }
}
