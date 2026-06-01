<?php

namespace App\Services\AI\Tools\Actions;

class CreateSupplierPaymentDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_supplier_payment_draft';
    protected string $module = 'supplier_payments';
    protected string $title = 'Create draft supplier payment';
    protected string $riskLevel = 'medium';
}
