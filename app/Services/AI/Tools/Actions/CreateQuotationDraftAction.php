<?php

namespace App\Services\AI\Tools\Actions;

class CreateQuotationDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_quotation_draft';
    protected string $module = 'quotations';
    protected string $title = 'Create draft quotation';
    protected string $riskLevel = 'medium';
}
