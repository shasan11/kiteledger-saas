<?php

namespace App\Services\AI\Tools\Actions;

class CreateProductDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_product_draft';
    protected string $module = 'products';
    protected string $title = 'Create product draft';
    protected string $riskLevel = 'low';
}
