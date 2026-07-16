<?php

namespace App\Services\SaaS\DatabaseProvisioning;

class CpanelIdentifierNormalizer
{
    public function normalizeDatabase(string $database): string
    {
        return $this->normalize($database);
    }

    public function normalizeUser(string $username): string
    {
        return $this->normalize($username);
    }

    private function normalize(string $identifier): string
    {
        $account = (string) config('saas.database.cpanel.username');
        $prefix = $account !== '' ? $account.'_' : '';

        if ($prefix !== '' && ! str_starts_with($identifier, $prefix)) {
            return $prefix.$identifier;
        }

        return $identifier;
    }
}
