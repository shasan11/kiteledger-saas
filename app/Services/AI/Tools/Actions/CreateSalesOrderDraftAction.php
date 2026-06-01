<?php

namespace App\Services\AI\Tools\Actions;

class CreateSalesOrderDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_sales_order_draft';
    protected string $module = 'sales_orders';
    protected string $title = 'Create draft sales order';
    protected string $riskLevel = 'medium';
}
