<?php

namespace App\Observers;

use App\Models\Contact;
use App\Services\DocumentNumberingService;
use App\Services\AccountProvisioningService;

class ContactObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected AccountProvisioningService $accountProvisioning,
    ) {
    }

    public function creating(Contact $contact): void
    {
        if (!$contact->code) {
            $code = $this->numberingService->generate('contact');
            if ($code) {
                $contact->code = $code;
            }
        }
    }

    public function created(Contact $contact): void
    {
        $this->accountProvisioning->createForContact($contact);
    }

    public function updated(Contact $contact): void
    {
        $typeChanged = $contact->wasChanged('contact_type');
        $nameChanged = $contact->wasChanged('name');

        if ($typeChanged && in_array($contact->contact_type, ['customer', 'supplier']) && !$contact->account_id) {
            $this->accountProvisioning->createForContact($contact);
            return;
        }

        if ($nameChanged && $contact->account_id) {
            $this->accountProvisioning->syncContactAccount($contact);
        }
    }
}
