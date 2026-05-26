<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;

class AiReportInsightService
{
    protected const MODULE     = 'report_explainer';
    protected const PERMISSION = 'ai.report_explainer.use';

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    public function explain(array $input): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $category   = $input['category']    ?? 'unknown';
        $reportKey  = $input['report_key']  ?? 'unknown';
        $reportData = $input['report_data'] ?? [];
        $filters    = $input['filters']     ?? [];

        $context = $this->contextBuilder->reportContext($reportData);

        $userPrompt = "Explain the following ERP report to a business owner.\n"
            . "Category: {$category}, Report: {$reportKey}\n"
            . "Filters applied: " . json_encode($filters) . "\n\n"
            . "Report data:\n" . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, key_findings (array), risks (array), opportunities (array), recommended_actions (array), plain_english_explanation.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->reportExplainerPrompt(),
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'                   => '',
            'key_findings'              => [],
            'risks'                     => [],
            'opportunities'             => [],
            'recommended_actions'       => [],
            'plain_english_explanation' => '',
        ], $data);
    }
}
