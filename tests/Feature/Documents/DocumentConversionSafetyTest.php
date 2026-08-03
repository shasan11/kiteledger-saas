<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Models\DocumentTransactionProposal;
use App\Models\DocumentUpload;
use App\Models\PurchaseBill;
use App\Services\Documents\DocumentTransactionConverter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/**
 * Milestone 6: conversion creates exactly one draft, exactly once.
 */
class DocumentConversionSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function proposal(array $overrides = []): DocumentTransactionProposal
    {
        $doc = DocumentUpload::create([
            'label' => 'ABC bill',
            'original_file_name' => 'bill.pdf',
            'file_path' => 'documents/2026/bill.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'needs_review',
            'document_type' => 'purchase_bill',
        ]);

        $contactId = (string) Str::uuid();

        DB::table('contacts')->insert([
            'id' => $contactId,
            'name' => 'ABC Trading',
            'contact_type' => 'supplier',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DocumentTransactionProposal::create(array_merge([
            'document_upload_id' => $doc->id,
            'transaction_type' => 'purchase_bill',
            'status' => 'ready',
            'payload' => [
                'contact_id' => $contactId,
                'bill_date' => '2026-08-01',
                'total' => 220,
                'sub_total' => 200,
                // A line as the extractor produces it: no discount fields.
                // This is exactly the shape that used to break conversion.
                'lines' => [
                    ['description' => 'Widget', 'qty' => 2, 'unit_price' => 100],
                ],
            ],
            'missing_fields' => [],
        ], $overrides));
    }

    public function test_conversion_creates_a_draft_and_marks_the_proposal(): void
    {
        $proposal = $this->proposal();

        $result = app(DocumentTransactionConverter::class)->convert($proposal);

        $this->assertNotEmpty($result['record_id']);
        $this->assertSame('converted', $proposal->fresh()->status);
        $this->assertSame(1, PurchaseBill::count());
    }

    /**
     * The guard used to run outside the transaction, so a second call could
     * create a second bill from the same document.
     */
    public function test_a_second_conversion_is_refused_and_creates_no_extra_record(): void
    {
        $proposal = $this->proposal();
        $converter = app(DocumentTransactionConverter::class);

        $converter->convert($proposal);
        $this->assertSame(1, PurchaseBill::count());

        try {
            $converter->convert($proposal->fresh());
            $this->fail('A second conversion should have been refused.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('already converted', strtolower($e->getMessage()));
        }

        $this->assertSame(1, PurchaseBill::count(), 'No duplicate draft may be created.');
    }

    /**
     * A stale in-memory model must not be able to bypass the guard: the status
     * is re-read under the lock, not trusted from the caller's copy.
     */
    public function test_a_stale_proposal_instance_cannot_bypass_the_guard(): void
    {
        $proposal = $this->proposal();
        $converter = app(DocumentTransactionConverter::class);

        // Capture an instance that still believes it is unconverted.
        $stale = DocumentTransactionProposal::find($proposal->getKey());

        $converter->convert($proposal);

        try {
            $converter->convert($stale);
            $this->fail('A stale instance should not be able to convert again.');
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame(1, PurchaseBill::count());
    }

    public function test_a_proposal_with_missing_fields_is_refused(): void
    {
        $proposal = $this->proposal(['missing_fields' => ['contact_id']]);

        $this->expectException(RuntimeException::class);

        app(DocumentTransactionConverter::class)->convert($proposal);
    }

    public function test_an_unsupported_transaction_type_is_refused(): void
    {
        $proposal = $this->proposal(['transaction_type' => 'bank_statement']);

        $this->expectException(RuntimeException::class);

        app(DocumentTransactionConverter::class)->convert($proposal);

        $this->assertSame(0, PurchaseBill::count());
    }

    public function test_the_created_record_is_a_draft_and_is_not_approved(): void
    {
        $proposal = $this->proposal();

        app(DocumentTransactionConverter::class)->convert($proposal);

        $bill = PurchaseBill::first();

        $this->assertNotNull($bill);

        // The invariant the whole feature rests on: AI never posts or approves.
        foreach (['approved', 'is_approved', 'posted', 'is_posted'] as $flag) {
            if (array_key_exists($flag, $bill->getAttributes())) {
                $this->assertFalse((bool) $bill->{$flag}, "{$flag} must be false on a generated draft");
            }
        }

        if (array_key_exists('status', $bill->getAttributes())) {
            $this->assertContains(strtolower((string) $bill->status), ['draft', 'pending', 'unapproved']);
        }
    }
}
