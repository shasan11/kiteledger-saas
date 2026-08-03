<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Models\Contact;
use App\Services\Documents\Matching\MatchCandidate;
use App\Services\Documents\Matching\PartyMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Milestone 5: matching must be explainable, ordered by evidence strength, and
 * must never auto-select a guess.
 */
class DocumentEntityMatchingTest extends TestCase
{
    use RefreshDatabase;

    private function contact(array $attributes): string
    {
        $id = (string) Str::uuid();

        DB::table('contacts')->insert(array_merge([
            'id' => $id,
            'name' => 'Unnamed',
            'contact_type' => 'supplier',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));

        return $id;
    }

    private function matcher(): PartyMatcher
    {
        return app(PartyMatcher::class);
    }

    // ---------- Evidence ordering ----------

    public function test_tax_number_beats_a_similar_name(): void
    {
        $correct = $this->contact([
            'name' => 'Completely Different Name',
            'tax_registration_no' => '600123456',
        ]);

        $this->contact(['name' => 'ABC Trading Pvt Ltd']);

        $matches = $this->matcher()->match([
            'name' => 'ABC Trading',
            'tax_number' => '600123456',
        ]);

        $this->assertSame($correct, $matches[0]->publicId, 'An identifier must outrank a name guess.');
        $this->assertSame('Matched by tax number', $matches[0]->reason);
    }

    public function test_tax_number_matching_ignores_formatting(): void
    {
        $id = $this->contact(['name' => 'ABC', 'tax_registration_no' => '600-123-456']);

        $matches = $this->matcher()->match(['tax_number' => '600123456']);

        $this->assertSame($id, $matches[0]->publicId);
    }

    public function test_email_and_phone_are_usable_identifiers(): void
    {
        $byEmail = $this->contact(['name' => 'Alpha', 'email' => 'ap@abc.com']);
        $byPhone = $this->contact(['name' => 'Beta', 'phone' => '+977 9812345678']);

        $this->assertSame($byEmail, $this->matcher()->match(['email' => 'AP@abc.com'])[0]->publicId);
        $this->assertSame($byPhone, $this->matcher()->match(['phone' => '9812345678'])[0]->publicId);
    }

    public function test_short_phone_fragments_are_not_treated_as_identity(): void
    {
        $this->contact(['name' => 'Alpha', 'phone' => '12345']);

        $this->assertSame([], $this->matcher()->match(['phone' => '12345']));
    }

    // ---------- Name normalization ----------

    public function test_legal_form_suffixes_do_not_prevent_an_exact_match(): void
    {
        $id = $this->contact(['name' => 'ABC Trading Pvt. Ltd.']);

        $matches = $this->matcher()->match(['name' => 'ABC Trading']);

        $this->assertNotEmpty($matches);
        $this->assertSame($id, $matches[0]->publicId);
    }

    public function test_exact_contact_code_is_authoritative(): void
    {
        $id = $this->contact(['name' => 'Something Else', 'code' => 'SUP-001']);

        $matches = $this->matcher()->match(['name' => 'SUP-001']);

        $this->assertSame($id, $matches[0]->publicId);
        $this->assertSame('Matched by contact code', $matches[0]->reason);
    }

    // ---------- Safety: never auto-select a guess ----------

    public function test_a_fuzzy_name_match_is_offered_but_never_auto_selected(): void
    {
        $this->contact(['name' => 'ABC Trading Company']);

        $matches = $this->matcher()->match(['name' => 'ABD Trding Compny']);

        if ($matches !== []) {
            $this->assertLessThan(
                MatchCandidate::autoSelectThreshold(),
                $matches[0]->score,
                'A fuzzy name match must always require confirmation.',
            );
            $this->assertFalse($matches[0]->isAutoSelectable());
        }

        $this->assertNull(
            $this->matcher()->bestMatch(['name' => 'ABD Trding Compny']),
            'bestMatch must return nothing when only a guess is available.',
        );
    }

    public function test_a_tax_number_match_may_be_auto_selected(): void
    {
        $this->contact(['name' => 'ABC Trading', 'tax_registration_no' => '600123456']);

        $best = $this->matcher()->bestMatch(['tax_number' => '600123456']);

        $this->assertNotNull($best);
        $this->assertTrue($best->isAutoSelectable());
    }

    public function test_no_match_returns_nothing_rather_than_a_weak_guess(): void
    {
        $this->contact(['name' => 'Totally Unrelated Business']);

        $this->assertSame([], $this->matcher()->match(['name' => 'Zzz Qqq Xyz']));
        $this->assertNull($this->matcher()->bestMatch(['name' => 'Zzz Qqq Xyz']));
    }

    public function test_empty_party_details_produce_no_matches(): void
    {
        $this->contact(['name' => 'ABC Trading']);

        $this->assertSame([], $this->matcher()->match([]));
        $this->assertSame([], $this->matcher()->match(['name' => '   ']));
    }

    // ---------- Role scoping ----------

    public function test_supplier_matching_ignores_customer_only_contacts(): void
    {
        $this->contact(['name' => 'ABC Trading', 'contact_type' => 'customer']);

        $this->assertSame([], $this->matcher()->match(['name' => 'ABC Trading'], 'supplier'));
        $this->assertNotEmpty($this->matcher()->match(['name' => 'ABC Trading'], 'customer'));
    }

    public function test_both_type_contacts_are_available_to_either_role(): void
    {
        $this->contact(['name' => 'ABC Trading', 'contact_type' => 'both']);

        $this->assertNotEmpty($this->matcher()->match(['name' => 'ABC Trading'], 'supplier'));
        $this->assertNotEmpty($this->matcher()->match(['name' => 'ABC Trading'], 'customer'));
    }

    // ---------- Output safety ----------

    public function test_suggestions_explain_themselves_without_exposing_raw_scores(): void
    {
        $this->contact(['name' => 'ABC Trading', 'tax_registration_no' => '600123456']);

        $payload = $this->matcher()->match(['tax_number' => '600123456'])[0]->toArray();

        $this->assertArrayHasKey('reason', $payload);
        $this->assertArrayNotHasKey('score', $payload, 'Raw scores must not reach the client.');
        $this->assertArrayHasKey('auto_selectable', $payload);
    }

    public function test_results_are_ranked_and_limited(): void
    {
        foreach (range(1, 8) as $i) {
            $this->contact(['name' => "ABC Trading {$i}"]);
        }

        $matches = $this->matcher()->match(['name' => 'ABC Trading'], null, 3);

        $this->assertLessThanOrEqual(3, count($matches));

        for ($i = 1; $i < count($matches); $i++) {
            $this->assertGreaterThanOrEqual($matches[$i]->score, $matches[$i - 1]->score);
        }
    }
}
