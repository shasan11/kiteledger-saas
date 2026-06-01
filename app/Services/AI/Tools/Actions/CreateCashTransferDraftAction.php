<?php

namespace App\Services\AI\Tools\Actions;

class CreateCashTransferDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_cash_transfer_draft';
    protected string $module = 'cash_transfers';
    protected string $title = 'Create draft cash transfer';
    protected string $riskLevel = 'high';
    protected array $riskReasons = ['Creates a cash movement draft.', 'Requires human approval before execution.'];
}
