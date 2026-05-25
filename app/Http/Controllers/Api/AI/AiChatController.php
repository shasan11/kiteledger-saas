<?php

namespace App\Http\Controllers\Api\AI;

use App\Enums\Ai\AiIntentType;
use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiPendingAction;
use App\Services\AI\AiAccountingExplainer;
use App\Services\AI\AiActionPlanner;
use App\Services\AI\AiAuditLogger;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiIntentDetector;
use App\Services\AI\AiPermissionGuard;
use App\Services\AI\AiProviderService;
use App\Services\AI\AiReportAnalyzer;
use App\Services\AI\AiRiskAnalyzer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiChatController extends Controller
{
    public function __construct(
        protected AiIntentDetector      $detector,
        protected AiActionPlanner       $planner,
        protected AiPermissionGuard     $guard,
        protected AiAuditLogger         $audit,
        protected AiProviderService     $provider,
        protected AiContextBuilder      $context,
        protected AiAccountingExplainer $accounting,
        protected AiReportAnalyzer      $reports,
        protected AiRiskAnalyzer        $risk,
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message'         => 'required|string|max:2000',
            'conversation_id' => 'nullable|uuid',
            'module'          => 'nullable|string|max:60',
            'page_context'    => 'nullable|array',
        ]);

        $user        = $request->user();
        $message     = $data['message'];
        $pageContext = $data['page_context'] ?? [];

        $conversation = $this->resolveConversation($data['conversation_id'] ?? null, $user, $data['module'] ?? null);

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'user',
            'content'            => $message,
            'context'            => $pageContext,
        ]);

        // 1. Intent
        try {
            $intentData = $this->detector->detect($message, $pageContext);
        } catch (Throwable $e) {
            return $this->errorResponse($conversation->id, 'AI provider error: ' . $e->getMessage());
        }

        $intent = $intentData->intent;

        // 2. Permission to even consider this intent
        if (!$this->guard->userCanProposeIntent($intent)) {
            return $this->plainResponse($conversation->id, $intent, $this->guard->denialMessage());
        }

        // 3. Dispatch by intent
        $reply       = '';
        $actions     = [];
        $sources     = [];
        $suggestions = [];

        try {
            switch (true) {
                case $intent === AiIntentType::CREATE_INVOICE_DRAFT:
                case $intent === AiIntentType::CREATE_JOURNAL_VOUCHER_DRAFT:
                    $proposal = $this->planner->plan($intent, $message, $pageContext, $intentData->extracted);
                    if ($proposal) {
                        $pending = AiPendingAction::create([
                            'ai_conversation_id' => $conversation->id,
                            'user_id'            => $user->id,
                            'branch_id'          => $request->header('X-Branch-Id'),
                            'action_type'        => $proposal->actionType,
                            'module'             => $proposal->module,
                            'title'              => $proposal->title,
                            'summary'            => $proposal->summary,
                            'payload'            => $proposal->payload,
                            'risk_level'         => $proposal->riskLevel->value,
                            'risk_reasons'       => $proposal->riskReasons,
                            'status'             => 'pending',
                            'metadata'           => [
                                'missing_fields' => $proposal->missingFields,
                                'extracted'      => $intentData->extracted,
                            ],
                        ]);
                        $this->audit->recordProposal($pending, $message);

                        $reply     = 'I prepared a draft. Review and approve to execute.';
                        $actions[] = [
                            'id'                => $pending->id,
                            'action_type'       => $pending->action_type,
                            'title'             => $pending->title,
                            'summary'           => $pending->summary,
                            'module'            => $pending->module,
                            'risk_level'        => $pending->risk_level,
                            'risk_reasons'      => $pending->risk_reasons,
                            'payload'           => $pending->payload,
                            'missing_fields'    => $pending->metadata['missing_fields'] ?? [],
                            'requires_approval' => true,
                            'status'            => $pending->status,
                        ];
                    } else {
                        $reply = 'I could not prepare a draft from that request. Try adding more detail.';
                    }
                    break;

                case $intent === AiIntentType::EXPLAIN_ACCOUNTING_IMPACT:
                    $targetModule = $intentData->extracted['module']    ?? ($pageContext['module']    ?? null);
                    $targetId     = $intentData->extracted['record_id'] ?? ($pageContext['record_id'] ?? null);
                    if (!$targetModule || !$targetId) {
                        $reply = 'Open a specific invoice or journal voucher first, then ask me to explain.';
                        break;
                    }
                    $exp = $this->accounting->explain($targetModule, (string) $targetId);
                    $reply     = $exp['plain_english'] ?: $exp['summary'];
                    $sources[] = ['type' => $targetModule, 'id' => $targetId];
                    $suggestions = [['title' => 'Review risk on this record']];
                    break;

                case $intent === AiIntentType::RISK_REVIEW:
                    $targetModule = $intentData->extracted['module']    ?? ($pageContext['module']    ?? null);
                    $targetId     = $intentData->extracted['record_id'] ?? ($pageContext['record_id'] ?? null);
                    if (!$targetModule || !$targetId) {
                        $reply = 'Open the record you want me to review, or use POST /api/ai/risk-review with module and record_id.';
                        break;
                    }
                    $review    = $this->risk->reviewRecord($targetModule, (string) $targetId);
                    $reply     = 'Risk level: ' . strtoupper($review->riskLevel->value)
                        . ($review->reasons ? '. Reasons: ' . implode('; ', $review->reasons) : '. No issues found.');
                    $sources[] = ['type' => $targetModule, 'id' => $targetId, 'risk' => $review->toArray()];
                    break;

                case $intent === AiIntentType::ASK_REPORT:
                    $category  = $intentData->extracted['category']   ?? 'accounting';
                    $reportKey = $intentData->extracted['report_key'] ?? 'income-statement';
                    $filters   = $intentData->extracted['filters']    ?? [];
                    $res       = $this->reports->ask($message, $category, $reportKey, $filters);
                    $reply     = $res['answer'] ?: 'No data found for that question.';
                    $sources   = $res['sources'];
                    break;

                case $intent === AiIntentType::GENERAL_QUESTION:
                case $intent === AiIntentType::UNKNOWN:
                default:
                    $reply = $this->generalAnswer($message);
                    if (!$intent->isImplemented()) {
                        $reply = 'That capability is coming soon. For now, try drafting an invoice, a journal voucher, asking about a report, or reviewing risk on a record.';
                    }
                    break;
            }
        } catch (Throwable $e) {
            return $this->errorResponse($conversation->id, $e->getMessage(), $intent);
        }

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role'               => 'assistant',
            'content'            => $reply,
            'context'            => ['intent' => $intent->value, 'actions' => count($actions)],
        ]);

        return response()->json([
            'conversation_id' => $conversation->id,
            'message'         => ['role' => 'assistant', 'content' => $reply],
            'intent'          => $intent->value,
            'actions'         => $actions,
            'suggestions'     => $suggestions,
            'sources'         => $sources,
        ]);
    }

    private function resolveConversation(?string $id, $user, ?string $module): AiConversation
    {
        if ($id) {
            $existing = AiConversation::where('id', $id)->where('user_id', $user->id)->first();
            if ($existing) {
                return $existing;
            }
        }
        return AiConversation::create([
            'user_id' => $user->id,
            'module'  => $module,
            'status'  => 'active',
        ]);
    }

    private function generalAnswer(string $message): string
    {
        try {
            $r = $this->provider->text(
                module: 'global_command',
                systemPrompt: 'You are Kite AI, a concise accounting and ERP copilot. Answer briefly. Never claim to have created or changed records — you only draft and explain.',
                userPrompt: $message,
            );
            return trim($r['text'] ?? '');
        } catch (Throwable $e) {
            return 'I could not reach the AI provider right now. Please try again later.';
        }
    }

    private function plainResponse(string $convId, AiIntentType $intent, string $reply): JsonResponse
    {
        return response()->json([
            'conversation_id' => $convId,
            'message'         => ['role' => 'assistant', 'content' => $reply],
            'intent'          => $intent->value,
            'actions'         => [],
            'suggestions'     => [],
            'sources'         => [],
        ]);
    }

    private function errorResponse(string $convId, string $error, ?AiIntentType $intent = null): JsonResponse
    {
        return response()->json([
            'conversation_id' => $convId,
            'message'         => ['role' => 'assistant', 'content' => $error],
            'intent'          => $intent?->value ?? AiIntentType::UNKNOWN->value,
            'actions'         => [],
            'suggestions'     => [],
            'sources'         => [],
            'error'           => true,
        ], 200);
    }
}
