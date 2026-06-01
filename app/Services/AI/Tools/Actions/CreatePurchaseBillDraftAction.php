<?php

namespace App\Services\AI\Tools\Actions;

class CreatePurchaseBillDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_purchase_bill_draft';
    protected string $module = 'purchase_bills';
    protected string $title = 'Create draft purchase bill';
    protected string $riskLevel = 'medium';
}
