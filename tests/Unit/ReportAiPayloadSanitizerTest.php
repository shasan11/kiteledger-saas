<?php

namespace Tests\Unit;

use App\Services\AI\AiSettingsService;
use App\Services\Reports\ReportAiPayloadSanitizer;
use PHPUnit\Framework\TestCase;

class ReportAiPayloadSanitizerTest extends TestCase
{
    public function test_it_samples_rows_and_removes_internal_and_sensitive_fields(): void
    {
        $settings = $this->createStub(AiSettingsService::class);
        $settings->method('reportSummaryMaxRows')->willReturn(2);
        $sanitizer = new ReportAiPayloadSanitizer($settings);

        $context = $sanitizer->sanitize([
            'category' => 'sales',
            'report_key' => 'sales-summary',
            'report_title' => 'Sales Summary',
            'filters' => ['branch_id' => 'private-id', 'status' => 'paid'],
            'columns' => [
                ['key' => 'customer_id', 'title' => 'Internal Customer ID'],
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'paid_amount', 'title' => 'Paid Amount'],
                ['key' => 'api_key', 'title' => 'API Key'],
            ],
            'rows' => [
                ['customer_id' => '1', 'customer' => 'Alpha', 'paid_amount' => 10, 'api_key' => 'secret'],
                ['customer_id' => '2', 'customer' => 'Beta', 'paid_amount' => 20, 'api_key' => 'secret'],
                ['customer_id' => '3', 'customer' => 'Gamma', 'paid_amount' => 30, 'api_key' => 'secret'],
            ],
            'metadata' => ['row_count' => 3, 'currency' => 'NPR'],
        ]);

        $this->assertSame(['Status' => 'paid'], $context['filters']);
        $this->assertCount(2, $context['rows']);
        $this->assertSame(['Customer' => 'Alpha', 'Paid Amount' => 10], $context['rows'][0]);
        $this->assertTrue($context['metadata']['sampled']);
        $this->assertSame(1, $context['metadata']['omitted_row_count']);
    }
}
