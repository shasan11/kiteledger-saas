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
}
