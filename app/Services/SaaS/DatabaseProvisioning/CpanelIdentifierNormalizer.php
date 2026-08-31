<?php

namespace App\Services\SaaS\DatabaseProvisioning;

class CpanelIdentifierNormalizer
{
    public function normalizeDatabase(string $database, ?string $account = null): string
    {
        return $this->normalize($database, $account);
    }

    public function normalizeUser(string $username, ?string $account = null): string
    {
        return $this->normalize($username, $account);
    }

    private function normalize(string $identifier, ?string $account = null): string
    {
        $account ??= (string) config('saas.database.cpanel.username');
        $prefix = $account !== '' ? $account.'_' : '';

        if ($prefix !== '' && ! str_starts_with($identifier, $prefix)) {
            return $prefix.$identifier;
        }

        return $identifier;
    }
}
