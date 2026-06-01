<?php

namespace App\Services\AI\Tools\Actions;

class CreateCustomerPaymentDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_customer_payment_draft';
    protected string $module = 'customer_payments';
    protected string $title = 'Create draft customer payment';
    protected string $riskLevel = 'medium';
}
