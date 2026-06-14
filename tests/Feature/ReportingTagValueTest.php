<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ReportingTag;
use App\Models\ReportingTagLine;
use App\Models\ReportingTagValue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportingTagValueTest extends TestCase
{
    use RefreshDatabase;

    public function test_reporting_tags_persist_across_create_update_and_reload(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $cash = $this->account('Cash Main', '1000', 'cash');
        $capital = $this->account('Capital', '3000', 'coa');

        $deptTag = ReportingTag::query()->create([
            'name' => 'Department', 'type' => 'select', 'active' => true,
        ]);
        $sales = ReportingTagLine::query()->create([
            'reporting_tag_id' => $deptTag->id, 'name' => 'Sales', 'value' => 'sales', 'active' => true,
        ]);
        $support = ReportingTagLine::query()->create([
            'reporting_tag_id' => $deptTag->id, 'name' => 'Support', 'value' => 'support', 'active' => true,
        ]);

        $regionTag = ReportingTag::query()->create([
            'name' => 'Regions', 'type' => 'multi_select', 'active' => true,
        ]);
        $east = ReportingTagLine::query()->create([
            'reporting_tag_id' => $regionTag->id, 'name' => 'East', 'value' => 'east', 'active' => true,
        ]);
        $west = ReportingTagLine::query()->create([
            'reporting_tag_id' => $regionTag->id, 'name' => 'West', 'value' => 'west', 'active' => true,
        ]);

        $noteTag = ReportingTag::query()->create([
            'name' => 'Memo', 'type' => 'text', 'active' => true,
        ]);

        $payload = fn (array $tags) => [
            'branch_id' => $branch->id,
            'voucher_date' => '2026-06-14',
            'exchange_rate' => 1,
            'items' => [
                ['account_id' => $cash->id, 'description' => 'Dr', 'debit' => 100, 'credit' => 0],
                ['account_id' => $capital->id, 'description' => 'Cr', 'debit' => 0, 'credit' => 100],
            ],
            'reporting_tags' => $tags,
        ];

        // CREATE with select + multi_select + text tags.
        $created = $this->postJson('/api/journal-vouchers', $payload([
            ['reporting_tag_id' => $deptTag->id, 'value' => $sales->id],
            ['reporting_tag_id' => $regionTag->id, 'value' => [$east->id, $west->id]],
            ['reporting_tag_id' => $noteTag->id, 'value' => 'Quarterly accrual'],
        ]))->assertCreated();

        $voucherId = $created->json('id');
        $this->assertCount(3, $created->json('reporting_tags'));
        $this->assertSame(3, ReportingTagValue::where('taggable_id', $voucherId)->count());

        // RELOAD: values are present.
        $show = $this->getJson("/api/journal-vouchers/{$voucherId}")->assertOk();
        $tags = collect($show->json('reporting_tags'))->keyBy('reporting_tag_id');
        $this->assertSame($sales->id, $tags[$deptTag->id]['value']);
        $this->assertEqualsCanonicalizing([$east->id, $west->id], $tags[$regionTag->id]['value']);
        $this->assertSame('Quarterly accrual', $tags[$noteTag->id]['value']);

        // UPDATE: change select, shrink multi_select, drop text tag.
        $this->patchJson("/api/journal-vouchers/{$voucherId}", $payload([
            ['reporting_tag_id' => $deptTag->id, 'value' => $support->id],
            ['reporting_tag_id' => $regionTag->id, 'value' => [$east->id]],
        ]))->assertOk();

        $this->assertSame(2, ReportingTagValue::where('taggable_id', $voucherId)->count());
        $reload = collect($this->getJson("/api/journal-vouchers/{$voucherId}")->json('reporting_tags'))->keyBy('reporting_tag_id');
        $this->assertSame($support->id, $reload[$deptTag->id]['value']);
        $this->assertEqualsCanonicalizing([$east->id], $reload[$regionTag->id]['value']);
        $this->assertArrayNotHasKey($noteTag->id, $reload);

        // UPDATE with empty array clears everything.
        $this->patchJson("/api/journal-vouchers/{$voucherId}", $payload([]))->assertOk();
        $this->assertSame(0, ReportingTagValue::where('taggable_id', $voucherId)->count());
    }

    public function test_invalid_reporting_tag_option_is_rejected(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $cash = $this->account('Cash Main', '1000', 'cash');
        $capital = $this->account('Capital', '3000', 'coa');

        $deptTag = ReportingTag::query()->create(['name' => 'Department', 'type' => 'select', 'active' => true]);
        ReportingTagLine::query()->create([
            'reporting_tag_id' => $deptTag->id, 'name' => 'Sales', 'value' => 'sales', 'active' => true,
        ]);

        $this->postJson('/api/journal-vouchers', [
            'branch_id' => $branch->id,
            'voucher_date' => '2026-06-14',
            'exchange_rate' => 1,
            'items' => [
                ['account_id' => $cash->id, 'description' => 'Dr', 'debit' => 100, 'credit' => 0],
                ['account_id' => $capital->id, 'description' => 'Cr', 'debit' => 0, 'credit' => 100],
            ],
            'reporting_tags' => [
                ['reporting_tag_id' => $deptTag->id, 'value' => '00000000-0000-0000-0000-000000000000'],
            ],
        ])->assertStatus(422);
    }

    protected function account(string $name, string $code, string $nature): Account
    {
        return Account::query()->create([
            'name' => $name, 'code' => $code, 'nature' => $nature,
            'dr_amount' => 0, 'cr_amount' => 0, 'balance' => 0,
            'active' => true, 'is_system_generated' => false,
        ]);
    }
}
