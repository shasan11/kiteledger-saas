<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\DocumentExtractionNormalizerV2;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Runs the golden document extraction dataset.
 *
 * Deterministic by construction: each case supplies raw model output and
 * asserts what normalization must produce. This measures the parts KiteLedger
 * controls — origin tracking, required-field rules, totals validation — not
 * model accuracy, which would need a provider and real documents.
 */
class DocumentExtractionEvaluationTest extends TestCase
{
    private const DATASET = __DIR__.'/../../Evaluations/Documents/extraction_cases.json';

    public static function extractionCases(): array
    {
        if (! is_readable(self::DATASET)) {
            return [];
        }

        $data = json_decode((string) file_get_contents(self::DATASET), true, 512, JSON_THROW_ON_ERROR);

        $cases = [];

        foreach ($data['cases'] ?? [] as $case) {
            $cases[$case['id']] = [$case];
        }

        return $cases;
    }

    #[DataProvider('extractionCases')]
    public function test_extraction_case(array $case): void
    {
        $normalizer = new DocumentExtractionNormalizerV2(new DocumentSchemaRegistry());

        $result = $normalizer->normalize($case['raw']);
        $payload = $result->toArray(includeDebug: true);

        $expect = $case['expect'] ?? [];
        $id = $case['id'];

        if (array_key_exists('document_type', $expect)) {
            $this->assertSame($expect['document_type'], $payload['document_type'], "[{$id}] document type");
        }

        if (array_key_exists('is_convertible', $expect)) {
            $this->assertSame($expect['is_convertible'], $payload['is_convertible'], "[{$id}] convertibility");
        }

        if (array_key_exists('conversion_target', $expect)) {
            $this->assertSame($expect['conversion_target'], $payload['conversion_target'], "[{$id}] conversion target");
        }

        if (array_key_exists('review_issue_count', $expect)) {
            $this->assertSame($expect['review_issue_count'], $payload['review_issue_count'], "[{$id}] issue count");
        }

        if (array_key_exists('has_blocking_issues', $expect)) {
            $this->assertSame(
                $expect['has_blocking_issues'],
                $payload['has_blocking_issues'],
                "[{$id}] blocking state",
            );
        }

        foreach ($expect['field_origin'] ?? [] as $key => $origin) {
            $this->assertSame($origin, $payload['fields'][$key]['origin'] ?? null, "[{$id}] origin of {$key}");
        }

        foreach ($expect['field_state'] ?? [] as $key => $state) {
            $this->assertSame($state, $payload['fields'][$key]['state'] ?? null, "[{$id}] state of {$key}");
        }

        foreach ($expect['field_value'] ?? [] as $key => $value) {
            $this->assertEquals($value, $payload['fields'][$key]['value'] ?? null, "[{$id}] value of {$key}");
        }

        foreach ($expect['line_origin'] ?? [] as $index => $origin) {
            $this->assertSame(
                $origin,
                $payload['lines'][(int) $index]['amount_origin'] ?? null,
                "[{$id}] line {$index} amount origin",
            );
        }
    }

    /**
     * Guards the invariant the whole contract rests on: a value KiteLedger
     * calculated must never claim to have been read from the page.
     */
    public function test_no_case_presents_a_derived_value_as_extracted(): void
    {
        $normalizer = new DocumentExtractionNormalizerV2(new DocumentSchemaRegistry());

        foreach (self::extractionCases() as [$case]) {
            $payload = $normalizer->normalize($case['raw'])->toArray();

            foreach ($payload['fields'] as $key => $field) {
                if (($field['origin'] ?? null) !== 'derived') {
                    continue;
                }

                $this->assertSame(
                    'Calculated',
                    $field['origin_label'],
                    "[{$case['id']}] {$key} is derived but not labelled as calculated",
                );

                $this->assertSame(
                    [],
                    $field['evidence'],
                    "[{$case['id']}] {$key} is derived but claims document evidence",
                );
            }
        }
    }
}
