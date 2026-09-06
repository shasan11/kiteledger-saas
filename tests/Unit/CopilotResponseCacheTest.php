<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotResponse;
use App\Services\AI\Copilot\CopilotResponseType;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class CopilotResponseCacheTest extends TestCase
{
    public function test_reusable_payload_round_trips_without_turn_specific_data(): void
    {
        $response = new CopilotResponse(
            type: CopilotResponseType::VerifiedToolAnswer,
            message: 'Sales were AED 125.50.',
            sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
            answer: ['headline' => 'Sales'],
            cards: [['label' => 'Sales', 'value' => 125.5]],
            toolsUsed: ['sales.summary'],
            filters: ['date_range' => ['from' => '2026-09-01', 'to' => '2026-09-30']],
            currency: 'AED',
            currencyDisplay: ['code' => 'AED', 'symbol' => 'AED', 'decimal_places' => 2],
            branchScopeLabel: 'Selected branch',
            asOf: Carbon::parse('2026-09-06T12:00:00+04:00'),
            verified: true,
        );

        $payload = $response->toCacheArray();
        $restored = CopilotResponse::fromCacheArray($payload);

        $this->assertNotNull($restored);
        $this->assertTrue($restored->cached);
        $this->assertSame($response->message, $restored->message);
        $this->assertSame($response->type, $restored->type);
        $this->assertSame($response->sourcePolicy, $restored->sourcePolicy);
        $this->assertSame($response->cards, $restored->cards);
        $this->assertSame($response->filters, $restored->filters);
        $this->assertSame($response->currencyDisplay, $restored->currencyDisplay);
        $this->assertArrayNotHasKey('conversation_id', $payload);
        $this->assertArrayNotHasKey('request_id', $payload);
        $this->assertArrayNotHasKey('debug', $payload);
    }

    public function test_invalid_cache_payload_is_ignored(): void
    {
        $this->assertNull(CopilotResponse::fromCacheArray([
            'schema' => 1,
            'type' => 'not-a-response-type',
            'source_policy' => 'general_model_allowed',
            'message' => 'Invalid',
        ]));
    }
}
