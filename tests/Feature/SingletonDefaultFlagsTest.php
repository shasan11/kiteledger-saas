<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SingletonDefaultFlagsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_one_branch_can_be_head_office(): void
    {
        $first = Branch::factory()->create(['is_head_office' => true]);
        $second = Branch::factory()->create(['is_head_office' => true]);

        $this->assertFalse($first->fresh()->is_head_office);
        $this->assertTrue($second->fresh()->is_head_office);
        $this->assertSame(1, Branch::query()->where('is_head_office', true)->count());
    }

    public function test_updating_a_branch_to_head_office_clears_the_previous_one(): void
    {
        $first = Branch::factory()->create(['is_head_office' => true]);
        $second = Branch::factory()->create(['is_head_office' => false]);

        $second->update(['is_head_office' => true]);

        $this->assertFalse($first->fresh()->is_head_office);
        $this->assertTrue($second->fresh()->is_head_office);
        $this->assertSame(1, Branch::query()->where('is_head_office', true)->count());
    }

    public function test_only_one_currency_can_be_base_currency(): void
    {
        $first = Currency::factory()->create(['is_base' => true]);
        $second = Currency::factory()->create(['is_base' => true]);

        $this->assertFalse($first->fresh()->is_base);
        $this->assertTrue($second->fresh()->is_base);
        $this->assertSame(1, Currency::query()->where('is_base', true)->count());
    }

    public function test_updating_a_currency_to_base_currency_clears_the_previous_one(): void
    {
        $first = Currency::factory()->create(['is_base' => true]);
        $second = Currency::factory()->create(['is_base' => false]);

        $second->update(['is_base' => true]);

        $this->assertFalse($first->fresh()->is_base);
        $this->assertTrue($second->fresh()->is_base);
        $this->assertSame(1, Currency::query()->where('is_base', true)->count());
    }
}
