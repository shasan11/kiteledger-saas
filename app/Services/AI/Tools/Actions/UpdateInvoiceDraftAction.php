<?php

namespace App\Services\AI\Tools\Actions;

use Illuminate\Http\Request;

class UpdateInvoiceDraftAction extends BaseDraftAction
{
    protected string $actionType = 'update_invoice_draft';
    protected string $module = 'invoices';
    protected string $title = 'Update draft invoice';
    protected string $riskLevel = 'medium';
    protected array $riskReasons = ['Updates an existing draft transaction.', 'Requires human approval before execution.'];

    protected function payload(Request $request, string $message, array $contextPayload): array
    {
        $changes = [];
        if (str_contains(mb_strtolower($message), 'due date') && str_contains(mb_strtolower($message), 'tomorrow')) {
            $changes['due_date'] = now()->addDay()->toDateString();
        }

        return [
            'target_id' => $contextPayload['record_id'] ?? $contextPayload['id'] ?? null,
            'context_payload' => ['changes' => $changes],
            'requested_changes' => $changes ?: ['raw_instruction' => $message],
        ];
    }

    protected function missingFields(array $payload, string $message): array
    {
        $missing = [];
        if (empty($payload['target_id'])) {
            $missing[] = ['field' => 'target_id', 'reason' => 'No invoice record was selected for update.', 'options' => []];
        }
        if (empty($payload['context_payload']['changes'])) {
            $missing[] = ['field' => 'changes', 'reason' => 'No safe invoice draft changes were detected.', 'options' => []];
        }
        return $missing;
    }
}
