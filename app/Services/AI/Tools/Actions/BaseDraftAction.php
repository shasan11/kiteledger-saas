<?php

namespace App\Services\AI\Tools\Actions;

use App\Models\AiConversation;
use App\Models\AiPendingAction;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class BaseDraftAction
{
    protected string $actionType;
    protected string $module;
    protected string $title;
    protected string $riskLevel = 'medium';
    protected array $riskReasons = ['Requires human approval before execution.'];

    public function __construct(protected BranchScopeService $scope)
    {
    }

    public function propose(Request $request, AiConversation $conversation, string $message, array $contextPayload = []): AiPendingAction
    {
        $branchId = $this->scope->selectedBranchId($request, $request->user());
        $payload = $this->payload($request, $message, $contextPayload);
        $missing = $this->missingFields($payload, $message);

        return AiPendingAction::create([
            'ai_conversation_id' => $conversation->id,
            'user_id' => $request->user()?->id,
            'branch_id' => $branchId,
            'action_type' => $this->actionType,
            'module' => $this->module,
            'target_type' => $this->module,
            'target_id' => $payload['target_id'] ?? null,
            'title' => $this->titleFor($message, $payload),
            'summary' => $this->summaryFor($message, $payload),
            'payload' => array_merge([
                'message' => $message,
                'module' => $this->module,
                'context_payload' => $contextPayload,
            ], $payload),
            'risk_level' => $this->riskLevel,
            'risk_reasons' => $this->riskReasons,
            'status' => 'pending',
            'metadata' => array_merge([
                'missing_fields' => $missing,
                'requires_approval' => true,
                'requires_confirmation' => $this->requiresConfirmation(),
                'preview' => $this->previewData($message, $payload),
            ], $this->requiresConfirmation() ? ['confirmation_text' => $this->confirmationText($payload)] : []),
        ]);
    }

    /**
     * High/critical-risk actions require the user to type an explicit phrase
     * before they can be executed (spec §12).
     */
    protected function requiresConfirmation(): bool
    {
        return in_array($this->riskLevel, ['high', 'critical'], true);
    }

    protected function confirmationText(array $payload): string
    {
        $verb = strtoupper(trim(str_replace(['create_', 'update_', '_draft', '_'], ['', '', '', ' '], $this->actionType)));

        return 'CONFIRM ' . $verb;
    }

    /**
     * Structured, human-reviewable preview of the proposed record. Surfaced to
     * the approval UI; numbers shown are the planner's calculations, recomputed
     * server-side on execution.
     *
     * @return array<string, mixed>
     */
    protected function previewData(string $message, array $payload): array
    {
        return array_filter([
            'action_type' => $this->actionType,
            'module' => $this->module,
            'risk_level' => $this->riskLevel,
            'summary' => $this->summaryFor($message, $payload),
            'customer' => $payload['contact_name'] ?? null,
            'amount' => $payload['amount'] ?? null,
            'items' => $payload['items'] ?? null,
            'subtotal' => $payload['subtotal'] ?? null,
            'tax' => $payload['tax'] ?? null,
            'total' => $payload['total'] ?? null,
        ], fn ($value) => $value !== null && $value !== []);
    }

    protected function payload(Request $request, string $message, array $contextPayload): array
    {
        return [
            'target_id' => $contextPayload['record_id'] ?? $contextPayload['id'] ?? null,
            'amount' => $this->extractAmount($message),
            'requested_changes' => ['raw_instruction' => $message],
        ];
    }

    protected function missingFields(array $payload, string $message): array
    {
        return [];
    }

    protected function titleFor(string $message, array $payload): string
    {
        return $this->title;
    }

    protected function summaryFor(string $message, array $payload): string
    {
        return $this->title . ' based on: ' . $message;
    }

    protected function extractAmount(string $message): ?float
    {
        if (preg_match('/(?:npr|rs\.?|रु)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i', $message, $match)) {
            return (float) str_replace(',', '', $match[1]);
        }

        return null;
    }

    protected function resolveContact(string $message, ?string $type = null): array
    {
        if (!Schema::hasTable('contacts')) {
            return ['missing' => ['field' => 'contact_id', 'reason' => 'Contacts table is not available.', 'options' => []]];
        }

        $name = $this->extractNameAfterFor($message);
        if (!$name) {
            return ['missing' => ['field' => 'contact_id', 'reason' => 'No contact name was provided.', 'options' => []]];
        }

        $query = DB::table('contacts')->where('name', 'like', '%' . $name . '%');
        if ($type && Schema::hasColumn('contacts', 'contact_type')) {
            $query->where('contact_type', $type);
        }
        if (Schema::hasColumn('contacts', 'active')) {
            $query->where('active', true);
        }

        $matches = $query->limit(6)->get(['id', 'name', 'code', 'contact_type'])
            ->map(fn ($row) => ['id' => (string) $row->id, 'name' => $row->name, 'code' => $row->code, 'contact_type' => $row->contact_type])
            ->all();

        if (count($matches) === 1) {
            return ['contact_id' => $matches[0]['id'], 'contact_name' => $matches[0]['name']];
        }

        return [
            'missing' => [
                'field' => 'contact_id',
                'reason' => count($matches) ? 'Multiple contacts matched ' . $name . '.' : 'No contact matched ' . $name . '.',
                'options' => $matches,
            ],
        ];
    }

    private function extractNameAfterFor(string $message): ?string
    {
        if (preg_match('/\bfor\s+([a-zA-Z][a-zA-Z ._-]*?)(?:\s+(?:for|of|amount|npr|rs|रु|\d)|$)/i', $message, $match)) {
            return trim($match[1]);
        }

        return null;
    }
}
