<?php

namespace App\Services\AI\Tools\Actions;

class CreateExpenseDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_expense_draft';
    protected string $module = 'expenses';
    protected string $title = 'Create draft expense';
    protected string $riskLevel = 'medium';
}
