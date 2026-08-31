<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Matching\AccountMatcher;
use App\Services\Documents\Matching\MatchCandidate;
use App\Services\Documents\Matching\ProductMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Product and ledger-account matching: identifiers bind, descriptions suggest.
 */
class DocumentProductAccountMatchingTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attributes): string
    {
        $id = (string) Str::uuid();

        DB::table('products')->insert(array_merge([
            'id' => $id,
            'name' => 'Unnamed',
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));

        return $id;
    }

    private function account(array $attributes): string
    {
        $id = (string) Str::uuid();

        DB::table('accounts')->insert(array_merge([
            'id' => $id,
            'name' => 'Unnamed',
            'nature' => 'coa',
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));

        return $id;
    }

    // ---------- Products ----------

    public function test_barcode_outranks_a_similar_description(): void
    {
        $correct = $this->product(['name' => 'Something Else Entirely', 'barcode' => '8901234567890']);
        $this->product(['name' => 'Blue Widget']);

        $matches = app(ProductMatcher::class)->match([
            'name' => 'Blue Widget',
            'barcode' => '8901234567890',
        ]);

        $this->assertSame($correct, $matches[0]->publicId);
        $this->assertSame('Matched by barcode', $matches[0]->reason);
    }

    public function test_sku_and_product_code_are_matched(): void
    {
        $bySku = $this->product(['name' => 'Alpha', 'sku' => 'SKU-001']);
        $byCode = $this->product(['name' => 'Beta', 'code' => 'PRD-002']);

        $this->assertSame($bySku, app(ProductMatcher::class)->match(['code' => 'sku 001'])[0]->publicId);
        $this->assertSame($byCode, app(ProductMatcher::class)->match(['code' => 'PRD-002'])[0]->publicId);
    }

    public function test_packaging_words_do_not_prevent_an_exact_name_match(): void
    {
        $id = $this->product(['name' => 'Blue Widget']);

        $matches = app(ProductMatcher::class)->match(['name' => 'Blue Widget (10 pcs)']);

        $this->assertNotEmpty($matches);
        $this->assertSame($id, $matches[0]->publicId);
    }

    /**
     * Suppliers reword line descriptions constantly, so a description match can
     * never bind a product on its own.
     */
    public function test_a_description_match_is_never_auto_selected(): void
    {
        $this->product(['name' => 'Blue Widget Large']);

        $best = app(ProductMatcher::class)->bestMatch(['name' => 'Blu Widgit Larg']);

        $this->assertNull($best, 'A reworded description must require confirmation.');
    }

    public function test_a_barcode_match_may_be_auto_selected(): void
    {
        $this->product(['name' => 'Blue Widget', 'barcode' => '8901234567890']);

        $best = app(ProductMatcher::class)->bestMatch(['barcode' => '8901234567890']);

        $this->assertNotNull($best);
        $this->assertTrue($best->isAutoSelectable());
    }

    public function test_unrelated_lines_produce_no_product_match(): void
    {
        $this->product(['name' => 'Blue Widget']);

        $this->assertSame([], app(ProductMatcher::class)->match(['name' => 'Zzz Qqq']));
        $this->assertSame([], app(ProductMatcher::class)->match([]));
    }

    // ---------- Accounts ----------

    public function test_account_code_matches_exactly(): void
    {
        $id = $this->account(['name' => 'Office Expenses', 'code' => '5100']);

        $matches = app(AccountMatcher::class)->match('5100');

        $this->assertSame($id, $matches[0]->publicId);
        $this->assertSame('Matched by account code', $matches[0]->reason);
    }

    public function test_account_name_matches_ignoring_noise_words(): void
    {
        $id = $this->account(['name' => 'Office Expenses Account']);

        $matches = app(AccountMatcher::class)->match('Office Expenses');

        $this->assertNotEmpty($matches);
        $this->assertSame($id, $matches[0]->publicId);
    }

    /**
     * Choosing a ledger account is an accounting decision. A similar name must
     * never post to an account on its own.
     */
    public function test_a_similar_account_name_is_never_auto_selected(): void
    {
        $this->account(['name' => 'Office Expenses']);

        $best = app(AccountMatcher::class)->bestMatch('Ofice Expence');

        $this->assertNull($best);

        $matches = app(AccountMatcher::class)->match('Ofice Expence');

        foreach ($matches as $match) {
            $this->assertLessThan(MatchCandidate::autoSelectThreshold(), $match->score);
        }
    }

    public function test_account_suggestions_explain_themselves(): void
    {
        $this->account(['name' => 'Office Expenses', 'code' => '5100']);

        $payload = app(AccountMatcher::class)->match('5100')[0]->toArray();

        $this->assertSame('Matched by account code', $payload['reason']);
        $this->assertArrayNotHasKey('score', $payload);
    }

    public function test_empty_hints_produce_no_account_match(): void
    {
        $this->account(['name' => 'Office Expenses']);

        $this->assertSame([], app(AccountMatcher::class)->match(null));
        $this->assertSame([], app(AccountMatcher::class)->match('   '));
    }
}
