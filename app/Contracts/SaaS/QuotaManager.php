<?php

namespace App\Contracts\SaaS;

use App\Models\Central\Tenant;

interface QuotaManager
{
    public function reserve(Tenant $tenant, string $metric, int $quantity = 1): ?string;

    public function finalize(string $reservationId): void;

    public function release(string $reservationId): void;
}
