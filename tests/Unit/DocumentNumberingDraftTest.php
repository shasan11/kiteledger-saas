<?php

namespace Tests\Unit;

use App\Services\DocumentNumberingService;
use PHPUnit\Framework\TestCase;

/**
 * Draft placeholder numbers are written straight into the document-number
 * columns, the smallest of which is varchar(40) on MySQL. SQLite (used by the
 * test/dev DB) silently ignores varchar length, so an over-long draft only blew
 * up in production with "1406 Data too long". These assertions lock the length
 * and format so the regression cannot return regardless of the DB driver.
 */
class DocumentNumberingDraftTest extends TestCase
{
    private DocumentNumberingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new DocumentNumberingService();
    }

    public function test_draft_number_fits_column_and_is_recognisable(): void
    {
        $models = [
            // Standard transactions routed through BaseCrudApiController.
            'Invoice',
            'Quotation',
            'SalesOrder',
            'PurchaseOrder',
            'PurchaseBill',
            'CustomerPayment',
            'SupplierPayment',
            'Expense',
            'DebitNote',
            'SalesReturn',
            'CashTransfer',
            'JournalVoucher',
            'WarehouseTransfer',
            // Longest document-type prefix (INVENTORY-ADJUSTMENT) — worst case.
            'InventoryAdjustment',
            // Manufacturing models generate drafts via the same service.
            'ProductionOrder',
            'ProductionJournal',
            'BillOfMaterial',
            // Unmapped models fall back to the generic "document" prefix.
            'SomethingUnmapped',
        ];

        foreach ($models as $model) {
            $draft = $this->service->generateDraft($model);

            $this->assertLessThanOrEqual(40, strlen($draft), "Draft for {$model} exceeds varchar(40): {$draft}");
            $this->assertTrue($this->service->looksLikeDraft($draft), "Draft for {$model} is not detectable as a draft: {$draft}");

            // The placeholder used to embed a raw 32-character UUID, which put an
            // internal identifier on screen and on anything printed from a draft.
            $this->assertDoesNotMatchRegularExpression('/[0-9a-f]{16,}/i', $draft, "Draft for {$model} still exposes a UUID-like token: {$draft}");
            $this->assertLessThanOrEqual(26, strlen($draft), "Draft for {$model} is longer than a person can read: {$draft}");
        }
    }

    public function test_legacy_and_real_numbers_are_classified_correctly(): void
    {
        // Documents drafted before the format changed must still be recognised.
        $this->assertTrue($this->service->looksLikeDraft('#draft-INVOICE-18f23a8e70e74dc29b2109a03'));
        $this->assertTrue($this->service->looksLikeDraft('draft-something'));
        $this->assertTrue($this->service->looksLikeDraft(''));
        $this->assertTrue($this->service->looksLikeDraft(null));

        // Issued numbers must never be mistaken for placeholders.
        $this->assertFalse($this->service->looksLikeDraft('INV-2026-00042'));
        $this->assertFalse($this->service->looksLikeDraft('TRX-INV-0127'));
    }

    public function test_draft_numbers_are_unique(): void
    {
        $drafts = array_map(fn () => $this->service->generateDraft('Invoice'), range(1, 50));

        $this->assertCount(50, array_unique($drafts), 'generateDraft produced a collision.');
    }

    public function test_draft_names_the_document_type(): void
    {
        $this->assertStringContainsString('INVOICE', $this->service->generateDraft('Invoice'));
        // Multi-word types collapse to initials so the token stays short.
        $this->assertStringStartsWith('DRAFT-PB-', $this->service->generateDraft('PurchaseBill'));
    }
}
