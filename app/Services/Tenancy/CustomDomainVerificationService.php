<?php

namespace App\Services\Tenancy;

use App\Models\Domain;
use Illuminate\Support\Str;

class CustomDomainVerificationService
{
    public function issue(Domain $domain): string
    {
        $token = Str::random(48);
        $domain->update(['verification_token' => $token, 'verification_status' => 'pending', 'last_verification_error' => null]);

        return $token;
    }

    public function verify(Domain $domain, string $token): bool
    {
        $valid = filled($domain->verification_token) && hash_equals((string) $domain->verification_token, $token);
        $domain->update($valid
            ? ['verification_status' => 'verified', 'status' => 'active', 'verified_at' => now(), 'last_verification_error' => null]
            : ['verification_status' => 'failed', 'last_verification_error' => 'Domain verification failed.']);

        return $valid;
    }
}
