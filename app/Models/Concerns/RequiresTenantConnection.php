<?php

namespace App\Models\Concerns;

use LogicException;

trait RequiresTenantConnection
{
    public function getConnectionName()
    {
        if (! tenancy()->initialized && ! config('saas.allow_uninitialized_tenant_models', false)) {
            throw new LogicException(sprintf(
                'Tenant model %s cannot be used before tenancy is initialized.',
                static::class,
            ));
        }

        return parent::getConnectionName();
    }
}
