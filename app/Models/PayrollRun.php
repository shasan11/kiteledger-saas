<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;

/**
 * Backward-compatible alias for older code paths.
 *
 * New payroll code should type-hint Payroll and use payroll_id/payroll_number.
 */
class PayrollRun extends Payroll
{
    use RequiresTenantConnection;
}
