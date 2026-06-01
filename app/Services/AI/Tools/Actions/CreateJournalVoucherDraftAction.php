<?php

namespace App\Services\AI\Tools\Actions;

class CreateJournalVoucherDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_journal_voucher_draft';
    protected string $module = 'journal_vouchers';
    protected string $title = 'Create draft journal voucher';
    protected string $riskLevel = 'high';
    protected array $riskReasons = ['Creates an accounting-impacting journal voucher draft.', 'Requires human approval before execution.'];
}
