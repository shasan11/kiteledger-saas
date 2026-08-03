<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Knowledge;

/**
 * Authority class of an indexed chunk.
 *
 * Application documentation and an embedded copy of an invoice are not the same
 * kind of evidence, and pooling them in one relevance model is how a stale
 * vector of last quarter's invoice ends up quoted as a current balance. Every
 * candidate is classified here so the two can be governed separately.
 */
enum KnowledgeSourceClass: string
{
    /** KiteLedger's own documentation, help, routes, report and permission metadata. */
    case ApplicationKnowledge = 'application_knowledge';

    /** Tenant-uploaded policies, SOPs and contracts. */
    case TenantDocument = 'tenant_document';

    /** An embedded snapshot of a transactional record. Never authoritative. */
    case BusinessRecord = 'business_record';

    private const APPLICATION_TYPES = [
        'documentation', 'app_help', 'route', 'permission', 'template', 'knowledge',
    ];

    /**
     * Domain permission required to see each business-record type.
     *
     * Mirrors the map in BusinessKnowledgeIndexer. A source type missing from
     * this list is treated as unauthorized rather than public.
     */
    private const BUSINESS_RECORD_PERMISSIONS = [
        'invoice' => 'sales.invoice.view',
        'quotation' => 'sales.quotation.view',
        'sales_order' => 'sales.sales_order.view',
        'purchase_bill' => 'purchase.purchase_bill.view',
        'purchase_order' => 'purchase.purchase_order.view',
        'expense' => 'accounting.expense.view',
        'customer_payment' => 'receivable.customer_payment.view',
        'supplier_payment' => 'payable.supplier_payment.view',
        'journal_voucher' => 'accounting.journal_voucher.view',
        'account' => 'accounting.chart_of_account.view',
        'contact' => 'master.contact.view',
        'product' => 'master.product.view',
        'product_variant' => 'master.product.view',
        'warehouse' => 'master.warehouse.view',
        'warehouse_stock' => 'master.product.view',
        'pos_sale' => 'pos.sale.view',
    ];

    public static function classify(?string $sourceType): self
    {
        $sourceType = strtolower(trim((string) $sourceType));

        if ($sourceType === 'tenant_document') {
            return self::TenantDocument;
        }

        return in_array($sourceType, self::APPLICATION_TYPES, true)
            ? self::ApplicationKnowledge
            : self::BusinessRecord;
    }

    /**
     * Business-record chunks are snapshots taken at index time, so they may be
     * arbitrarily stale. They can support navigation ("this invoice exists")
     * but never a figure — that must come from a live tool.
     */
    public function isAuthoritative(): bool
    {
        return $this !== self::BusinessRecord;
    }

    /**
     * Final relevance floor, distinct from the much lower candidate-generation
     * threshold. A candidate scoring 0.05 is worth retrieving and ranking; it is
     * not worth grounding an answer on.
     */
    public function minRelevanceScore(): float
    {
        $configured = config('ai.rag.min_final_score', []);

        if (is_array($configured) && isset($configured[$this->value])) {
            return (float) $configured[$this->value];
        }

        return match ($this) {
            self::ApplicationKnowledge => 0.30,
            self::TenantDocument => 0.35,
            // Held to a higher bar precisely because it is the risky class.
            self::BusinessRecord => 0.50,
        };
    }

    /** Permission required for a business-record source type, if known. */
    public static function permissionForBusinessRecord(?string $sourceType): ?string
    {
        return self::BUSINESS_RECORD_PERMISSIONS[strtolower(trim((string) $sourceType))] ?? null;
    }

    /** True when the type is a business record whose permission we cannot determine. */
    public static function isUnmappedBusinessRecord(?string $sourceType): bool
    {
        return self::classify($sourceType) === self::BusinessRecord
            && self::permissionForBusinessRecord($sourceType) === null;
    }

    public function evidenceLabel(): string
    {
        return match ($this) {
            self::ApplicationKnowledge => 'KiteLedger documentation',
            self::TenantDocument => 'Company document',
            self::BusinessRecord => 'Indexed record (unverified)',
        };
    }
}
