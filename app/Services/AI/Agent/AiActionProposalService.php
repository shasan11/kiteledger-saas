<?php

namespace App\Services\AI\Agent;

use App\Models\AiConversation;
use App\Models\AiPendingAction;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;

class AiActionProposalService
{
    public function __construct(protected BranchScopeService $scope) {}

    public function propose(Request $request, AiConversation $conversation, array $intent, string $message, array $payload = []): AiPendingAction
    {
        $module = $this->normalizeModule($intent['module'] ?? ($payload['module'] ?? 'records'));
        $actionType = $this->actionType($intent['name'] ?? 'create_record', $module);
        $branchId = $this->scope->selectedBranchId($request, $request->user());

        $targetId = $payload['record_id'] ?? $payload['id'] ?? null;
        $summary = $this->summary($intent['name'] ?? 'create_record', $module, $message, $targetId);

        return AiPendingAction::create([
            'ai_conversation_id' => $conversation->id,
            'user_id' => $request->user()?->id,
            'branch_id' => $branchId,
            'action_type' => $actionType,
            'module' => $module,
            'target_type' => $module,
            'target_id' => $targetId,
            'title' => $this->title($intent['name'] ?? 'create_record', $module),
            'summary' => $summary,
            'payload' => [
                'message' => $message,
                'module' => $module,
                'target_id' => $targetId,
                'requested_changes' => $this->extractRequestedChanges($message),
                'context_payload' => $payload,
            ],
            'risk_level' => $this->riskLevel($intent['name'] ?? 'create_record', $module),
            'risk_reasons' => $this->riskReasons($intent['name'] ?? 'create_record', $module),
            'status' => 'pending',
            'metadata' => [
                'intent' => $intent,
                'missing_fields' => [],
            ],
        ]);
    }

    private function actionType(string $intent, string $module): string
    {
        return match ($intent) {
            'update_record' => 'update_' . $module,
            default => 'create_' . $module . '_draft',
        };
    }

    private function title(string $intent, string $module): string
    {
        $label = ucwords(str_replace('_', ' ', $module));
        return match ($intent) {
            'update_record' => 'Update ' . $label,
            default => 'Create Draft ' . $label,
        };
    }

    private function summary(string $intent, string $module, string $message, mixed $targetId): string
    {
        $label = str_replace('_', ' ', $module);
        if ($intent === 'update_record') {
            return 'AI proposes to update ' . $label . ($targetId ? ' #' . $targetId : '') . ' based on: ' . $message;
        }
        return 'AI proposes to create a draft ' . $label . ' based on: ' . $message;
    }

    private function riskLevel(string $intent, string $module): string
    {
        $accountingModules = ['invoices', 'purchase_bills', 'customer_payments', 'supplier_payments', 'expenses', 'journal_vouchers', 'cash_transfers', 'credit_notes', 'debit_notes'];
        if ($intent === 'update_record') return 'medium';
        return in_array($module, $accountingModules, true) ? 'medium' : 'low';
    }

    private function riskReasons(string $intent, string $module): array
    {
        $reasons = ['Requires human approval before execution.'];
        if ($intent === 'update_record') {
            $reasons[] = 'Updates an existing record.';
        }
        if (in_array($module, ['invoices', 'purchase_bills', 'customer_payments', 'supplier_payments', 'expenses', 'journal_vouchers', 'cash_transfers', 'credit_notes', 'debit_notes'], true)) {
            $reasons[] = 'May affect accounting or business reports.';
        }
        return $reasons;
    }

    private function extractRequestedChanges(string $message): array
    {
        return ['raw_instruction' => $message];
    }

    private function normalizeModule(string $module): string
    {
        return str_replace('-', '_', trim($module));
    }
}
