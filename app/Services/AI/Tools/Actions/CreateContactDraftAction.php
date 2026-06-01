<?php

namespace App\Services\AI\Tools\Actions;

class CreateContactDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_contact_draft';
    protected string $module = 'contacts';
    protected string $title = 'Create contact draft';
    protected string $riskLevel = 'low';
}
