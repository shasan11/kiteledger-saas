<?php

namespace App\Services\Documents;

use App\Models\DocumentTransactionProposal;
use App\Models\DocumentUpload;

class DocumentTransactionProposalService
{
    public const SUPPORTED_TYPES = [
        'customer_payment', 'invoice', 'expense', 'supplier_payment',
        'purchase_bill', 'credit_note', 'debit_note',
        'purchase_order', 'sales_order', 'quotation',
    ];

    public function __construct(
        protected DocumentTransactionInitialValueMapper $mapper,
        protected DocumentTransactionPayloadValidator $validator,
    ) {}

    public function buildPayload(DocumentUpload $doc, string $transactionType, array $normalized): array
    {
        return $this->mapper->map($doc, $transactionType, $normalized)['mapped_payload'];
    }

    public function buildReview(DocumentUpload $doc, string $transactionType, array $normalized, array $reviewValues = []): array
    {
        return $this->mapper->map($doc, $transactionType, $normalized, [], $reviewValues);
    }

    public function detectMissingFields(string $type, array $payload): array
    {
        return $this->validator->missingFields($type, $payload);
    }

    public function create(DocumentUpload $doc, string $transactionType, array $payload, array $warnings = [], ?string $extractionId = null): DocumentTransactionProposal
    {
        $missing = $this->detectMissingFields($transactionType, $payload);
        $status = $missing ? 'needs_review' : 'ready';

        return DocumentTransactionProposal::create([
            'document_upload_id' => $doc->id,
            'document_extraction_id' => $extractionId,
            'transaction_type' => $transactionType,
            'status' => $status,
            'payload' => $payload,
            'missing_fields' => $missing,
            'warnings' => $warnings,
            'confidence_score' => null,
            'created_by' => auth()->id(),
        ]);
    }

    public function update(DocumentTransactionProposal $proposal, array $payload, array $warnings = []): DocumentTransactionProposal
    {
        $missing = $this->detectMissingFields($proposal->transaction_type, $payload);
        $proposal->update([
            'payload' => $payload,
            'missing_fields' => $missing,
            'warnings' => $warnings,
            'status' => $missing ? 'needs_review' : 'ready',
        ]);
        return $proposal->refresh();
    }

    public function refreshProposalMatches(DocumentTransactionProposal $proposal): DocumentTransactionProposal
    {
        $doc = $proposal->documentUpload()->with('extraction')->firstOrFail();
        $normalized = $doc->extraction?->normalized_json ?? [];
        $review = $this->buildReview($doc, $proposal->transaction_type, $normalized, $proposal->payload ?? []);

        return $this->update($proposal, $review['mapped_payload'], $review['warnings']);
    }
}
