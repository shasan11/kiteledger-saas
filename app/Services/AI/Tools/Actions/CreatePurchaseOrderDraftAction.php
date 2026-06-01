<?php

namespace App\Services\AI\Tools\Actions;

class CreatePurchaseOrderDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_purchase_order_draft';
    protected string $module = 'purchase_orders';
    protected string $title = 'Create draft purchase order';
    protected string $riskLevel = 'medium';
}
