<?php

namespace App\Observers;

use App\Models\Contact;
use App\Services\AccountProvisioningService;
use App\Services\DocumentNumberingService;

class ContactObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected AccountProvisioningService $accountProvisioning,
    ) {}

    public function creating(Contact $contact): void
    {
        if (! $contact->code) {
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
        $purchaseRoleChanged = $contact->wasChanged('accept_purchase');

        if (
            ($typeChanged || $purchaseRoleChanged)
            && in_array($contact->contact_type, ['customer', 'supplier'], true)
            && (! $contact->account_id || ((bool) $contact->accept_purchase && ! $contact->payable_account_id))
        ) {
            $this->accountProvisioning->createForContact($contact);

            return;
        }

        if ($nameChanged && ($contact->account_id || $contact->payable_account_id)) {
            $this->accountProvisioning->syncContactAccount($contact);
        }
    }
}
