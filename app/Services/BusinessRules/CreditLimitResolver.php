<?php

namespace App\Services\BusinessRules;

use App\Models\Contact;

class CreditLimitResolver
{
    public function contact(?string $contactId): ?Contact
    {
        return $contactId ? Contact::query()->with('account')->find($contactId) : null;
    }

    public function creditLimit(?Contact $contact): ?float
    {
        if (!$contact || $contact->credit_limit === null || $contact->credit_limit === '') {
            return null;
        }

        return (float) $contact->credit_limit;
    }

    public function outstanding(?Contact $contact): float
    {
        return (float) ($contact?->account?->balance ?? 0);
    }
}
