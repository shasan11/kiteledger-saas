<?php

namespace App\Policies\Central;

use App\Models\Central\CentralAdmin;
use App\Models\Central\TenantInvoice;

class TenantInvoicePolicy
{
    public function viewAny(CentralAdmin $admin): bool
    {
        return $admin->can('invoice.view');
    }

    public function view(CentralAdmin $admin, TenantInvoice $invoice): bool
    {
        return $admin->can('invoice.view');
    }

    public function update(CentralAdmin $admin, TenantInvoice $invoice): bool
    {
        return $admin->can('invoice.manage');
    }

    public function addPayment(CentralAdmin $admin, TenantInvoice $invoice): bool
    {
        return $admin->can('payment.add_manual');
    }
}
