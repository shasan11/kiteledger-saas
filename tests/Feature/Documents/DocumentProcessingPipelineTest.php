<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Pipeline\DocumentErrorCode;
use App\Services\Documents\Pipeline\DocumentProcessingStage;
use App\Services\Documents\Pipeline\StructuredOutputValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Milestone 2: structured-output validation with one controlled repair pass,
 * honest processing stages, and actionable error codes.
 */
class DocumentProcessingPipelineTest extends TestCase
{
    private function validator(): StructuredOutputValidator
    {
        return new StructuredOutputValidator();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'document_type' => 'purchase_bill',
            'document_number' => 'INV-1042',
            'document_date' => '2026-08-01',
            'party' => ['name' => 'ABC Trading'],
            'totals' => ['grand_total' => 220],
        ], $overrides);
    }

    // ---------- Clean parsing ----------

    public function test_valid_json_is_accepted_without_repair(): void
    {
        $result = $this->validator()->validate(json_encode($this->payload()));

        $this->assertTrue($result->ok);
        $this->assertFalse($result->repaired);
        $this->assertSame('INV-1042', $result->data['document_number']);
        $this->assertSame([], $result->warnings());
    }

    // ---------- Controlled repair ----------

    public function test_markdown_fenced_json_is_repaired(): void
    {
        $raw = "```json\n".json_encode($this->payload())."\n```";

        $result = $this->validator()->validate($raw);

        $this->assertTrue($result->ok);
        $this->assertTrue($result->repaired);
        $this->assertSame('ABC Trading', $result->data['party']['name']);
    }

    public function test_prose_around_the_object_is_stripped(): void
    {
        $raw = "Here is the extraction:\n".json_encode($this->payload())."\nHope that helps!";

        $result = $this->validator()->validate($raw);

        $this->assertTrue($result->ok);
        $this->assertTrue($result->repaired);
    }

    public function test_trailing_commas_are_repaired(): void
    {
        $raw = '{"document_type":"purchase_bill","document_number":"INV-1","totals":{"grand_total":10,},}';

        $result = $this->validator()->validate($raw);

        $this->assertTrue($result->ok);
        $this->assertSame('INV-1', $result->data['document_number']);
    }

    public function test_a_truncated_response_is_closed_and_flagged_rather_than_dropped(): void
    {
        // Cut off mid-object, as happens when a token limit is reached.
        $raw = '{"document_type":"purchase_bill","document_number":"INV-1042","party":{"name":"ABC Trading"';

        $result = $this->validator()->validate($raw);

        $this->assertTrue($result->ok);
        $this->assertTrue($result->repaired);
        $this->assertSame('ABC Trading', $result->data['party']['name']);
        $this->assertNotEmpty($result->warnings(), 'The user must be told the read was difficult.');
    }

    public function test_braces_inside_string_values_do_not_confuse_the_repair(): void
    {
        $raw = '{"document_type":"purchase_bill","document_number":"INV-{1042}","totals":{"grand_total":5}';

        $result = $this->validator()->validate($raw);

        $this->assertTrue($result->ok);
        $this->assertSame('INV-{1042}', $result->data['document_number']);
    }

    // ---------- Failing closed ----------

    public function test_unrecoverable_output_fails_instead_of_being_accepted(): void
    {
        $result = $this->validator()->validate('I could not read this document at all.');

        $this->assertFalse($result->ok);
        $this->assertSame(DocumentErrorCode::ExtractionInvalid, $result->errorCode);
        $this->assertSame([], $result->data);
    }

    public function test_output_missing_the_document_type_is_rejected(): void
    {
        $result = $this->validator()->validate('{"document_number":"INV-1"}');

        $this->assertFalse($result->ok);
        $this->assertSame(DocumentErrorCode::ExtractionInvalid, $result->errorCode);
    }

    public function test_a_shell_with_no_readable_content_is_rejected(): void
    {
        // Parses cleanly but contains nothing usable — must not present as a
        // successful extraction of an empty document.
        $result = $this->validator()->validate('{"document_type":"purchase_bill"}');

        $this->assertFalse($result->ok);
    }

    public function test_empty_output_is_rejected(): void
    {
        $this->assertFalse($this->validator()->validate('')->ok);
        $this->assertFalse($this->validator()->validate('   ')->ok);
    }

    public function test_malformed_line_items_mark_the_result_partial(): void
    {
        $result = $this->validator()->validate(json_encode($this->payload([
            'lines' => ['not-an-object'],
        ])));

        $this->assertTrue($result->ok);
        $this->assertTrue($result->partial);
        $this->assertNotEmpty($result->warnings());
    }

    // ---------- Stages ----------

    public function test_stages_have_user_friendly_labels_without_jargon(): void
    {
        $this->assertSame('Reading pages', DocumentProcessingStage::Reading->label());
        $this->assertSame('Checking totals', DocumentProcessingStage::Validating->label());
        $this->assertSame('Matching KiteLedger records', DocumentProcessingStage::Matching->label());

        foreach (DocumentProcessingStage::cases() as $stage) {
            $label = strtolower($stage->label());

            foreach (['json', 'api', 'provider', 'model', 'token', 'schema'] as $jargon) {
                $this->assertStringNotContainsString($jargon, $label, "Stage label leaks jargon: {$jargon}");
            }
        }
    }

    public function test_terminal_stages_are_identified(): void
    {
        $this->assertTrue(DocumentProcessingStage::ReadyForReview->isTerminal());
        $this->assertTrue(DocumentProcessingStage::Failed->isTerminal());
        $this->assertFalse(DocumentProcessingStage::Extracting->isTerminal());
        $this->assertTrue(DocumentProcessingStage::Extracting->isActive());
    }

    public function test_timeline_positions_advance(): void
    {
        $this->assertGreaterThan(
            DocumentProcessingStage::Preparing->position(),
            DocumentProcessingStage::Validating->position(),
        );
    }

    // ---------- Error codes ----------

    public static function providerFailures(): array
    {
        return [
            'timeout' => ['Document scan timed out.', DocumentErrorCode::AiTimeout],
            'rate limit' => ['gemini rate limit or quota was reached', DocumentErrorCode::AiRateLimit],
            'overloaded' => ['the service is overloaded right now', DocumentErrorCode::AiUnavailable],
            'missing key' => ['AI provider key is missing, not configured', DocumentErrorCode::AiNotConfigured],
            'bad type' => ['Invalid file type. Only PDF supported.', DocumentErrorCode::TypeUnsupported],
            'encrypted' => ['the pdf is password protected', DocumentErrorCode::PasswordProtected],
            'bad json' => ['response was not valid json', DocumentErrorCode::ExtractionInvalid],
        ];
    }

    #[DataProvider('providerFailures')]
    public function test_provider_failures_map_to_public_codes(string $raw, DocumentErrorCode $expected): void
    {
        $this->assertSame($expected, DocumentErrorCode::fromThrowableMessage($raw));
    }

    public function test_error_messages_are_actionable_and_free_of_technical_detail(): void
    {
        foreach (DocumentErrorCode::cases() as $code) {
            $message = $code->message();

            $this->assertNotEmpty($code->actions(), "{$code->value} offers the user no way forward");

            foreach (['http', 'json', 'exception', 'stack', 'sql', 'null', 'api key', 'gemini', 'openai'] as $leak) {
                $this->assertStringNotContainsString(
                    $leak,
                    strtolower($message),
                    "{$code->value} leaks technical detail: {$leak}",
                );
            }
        }
    }

    public function test_only_genuinely_transient_failures_are_retryable(): void
    {
        $this->assertTrue(DocumentErrorCode::AiTimeout->isTransient());
        $this->assertTrue(DocumentErrorCode::AiRateLimit->isTransient());

        // Retrying these unchanged would just fail again.
        $this->assertFalse(DocumentErrorCode::PasswordProtected->isTransient());
        $this->assertFalse(DocumentErrorCode::TypeUnsupported->isTransient());
        $this->assertFalse(DocumentErrorCode::AiNotConfigured->isTransient());
    }

    public function test_configuration_problems_direct_the_user_to_an_administrator(): void
    {
        $this->assertContains('contact_administrator', DocumentErrorCode::AiNotConfigured->actions());
        $this->assertContains('replace_file', DocumentErrorCode::PasswordProtected->actions());
    }
}
