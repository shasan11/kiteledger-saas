<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class DocumentIntelligenceUiContractTest extends TestCase
{
    public function test_page_level_scan_never_targets_an_implicit_first_row(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/Documents/Upload/Index.jsx');

        $this->assertStringNotContainsString('documentRows[0] && scanDoc(documentRows[0])', $source);
        $this->assertStringContainsString('const primaryAction = (record)', $source);
        $this->assertStringContainsString('onClick={next.onClick}', $source);
        $this->assertStringContainsString('Review & continue', $source);
    }

    public function test_review_workspace_exposes_working_correction_and_conversion_actions(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/Documents/Review/Show.jsx');

        $this->assertStringContainsString('Discard unsaved corrections and scan again?', $source);
        $this->assertStringContainsString('onClick={rescan}', $source);
        $this->assertStringContainsString('title="Line items"', $source);
        $this->assertStringContainsString('handleLineChange', $source);
        $this->assertStringContainsString('Create or update proposal', $source);
        $this->assertStringContainsString('onClick={() => createProposal()}', $source);
        $this->assertStringContainsString('Create draft transaction', $source);
        $this->assertStringContainsString('onClick={() => createDraft(false)}', $source);
        $this->assertStringContainsString('Open created draft', $source);
        $this->assertStringContainsString('ERP record matches', $source);
        $this->assertStringContainsString('Match records', $source);
        $this->assertStringContainsString('Create missing record', $source);
        $this->assertStringContainsString('/choose', $source);
        $upload = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/Documents/Upload/Index.jsx');
        $this->assertStringContainsString('isMobile ? (', $upload);
        $this->assertStringContainsString('<List', $upload);
        $this->assertStringContainsString('Workflow:', $upload);
        $this->assertStringContainsString('AI:', $upload);
        $this->assertStringContainsString('<DocumentPreview', $upload);
        $this->assertStringNotContainsString('<iframe', $upload);
        $this->assertStringContainsString('readiness.blockers', $source);
    }

    public function test_every_review_issue_field_is_rendered_in_an_editable_section(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/Documents/Review/Show.jsx');

        foreach ([
            'document_type', 'document_number', 'document_date', 'due_date', 'currency_code',
            'party.name', 'party.tax_number', 'party.email', 'party.phone',
            'totals.subtotal', 'totals.discount_total', 'totals.tax_total', 'totals.shipping',
            'totals.grand_total', 'totals.paid_amount', 'totals.balance_due',
        ] as $field) {
            $this->assertStringContainsString("'{$field}'", $source);
        }

        $this->assertStringContainsString('ref={(node)', $source);
        $this->assertStringContainsString('node?.querySelector(\'input\')?.focus()', $source);
    }
}
