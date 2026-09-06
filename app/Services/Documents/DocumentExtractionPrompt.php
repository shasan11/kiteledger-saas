<?php

namespace App\Services\Documents;

class DocumentExtractionPrompt
{
    public static function system(): string
    {
        return <<<'PROMPT'
You are an accounting document extraction engine for an ERP system.
Extract the document into strict JSON only.
Do not include markdown.
Do not explain.
Do not invent missing values.

UNKNOWN VERSUS ZERO — this distinction is critical and must never be blurred:
- If a value is not shown on the document, or you cannot read it, return null.
- Return 0 only when the document itself shows a zero, a dash, or explicitly states "no discount", "nil", "exempt" or equivalent.
- Never substitute 0 for a value you could not find. A missing tax amount reported as 0 becomes an under-declared tax liability that nobody is warned about, whereas null tells KiteLedger to ask a person.
- The same rule applies inside every line item: an unstated discount, tax rate or tax amount is null, not 0.

Do not compute totals that are not printed on the document. If a total is absent, return null and let KiteLedger calculate it; a figure you derive is indistinguishable from one you read.
If totals do not match line items, add a warning rather than adjusting either.
Cite the page number each value came from wherever the page is known.
Classify the document type.
Return only valid JSON matching the required schema.
PROMPT;
    }

    /**
     * Generic extraction schema.
     *
     * Used when the document type is not yet known. Once classification has
     * happened, DocumentTypePrompt narrows this to the fields the type actually
     * has, which is both shorter and less error-prone.
     */
    public static function user(): string
    {
        return <<<'PROMPT'
Extract this document into the following JSON schema.

Use null for anything not shown on the document. Use 0 ONLY where the document shows an explicit zero.

{
  "document_type": "purchase_bill|sales_invoice|expense_receipt|customer_payment_slip|supplier_payment_slip|credit_note|debit_note|journal_voucher|purchase_order|sales_order|quotation|warehouse_transfer|inventory_adjustment|bank_statement|other",
  "confidence": 0.0,
  "language": null,
  "document_number": null,
  "document_date": null,
  "due_date": null,
  "currency_code": null,
  "party": { "role": "supplier|customer|vendor|other", "name": null, "tax_number": null, "email": null, "phone": null, "address": null },
  "counterparty": { "name": null, "tax_number": null, "address": null },
  "lines": [
    { "description": null, "product_code": null, "product_name": null, "quantity": null, "unit": null, "rate": null, "discount": null, "tax_rate": null, "tax_amount": null, "amount": null, "account_hint": null }
  ],
  "totals": { "subtotal": null, "discount_total": null, "tax_total": null, "shipping": null, "grand_total": null, "paid_amount": null, "balance_due": null },
  "payment": { "method": null, "bank_name": null, "reference_no": null, "paid_amount": null, "payment_date": null },
  "inventory": { "source_warehouse": null, "destination_warehouse": null, "movement_type": null },
  "journal_entry": { "narration": null, "lines": [{ "account_name": null, "debit": null, "credit": null, "description": null }] },
  "terms_and_conditions": null,
  "field_confidence": { "document_number": 0.0 },
  "evidence": { "document_number": { "page": 1, "text": null } },
  "warnings": [],
  "missing_fields": []
}

"field_confidence" holds your own certainty per field key, 0.0 to 1.0.
"evidence" holds, per field key, the page number the value appeared on and the surrounding text you read it from.

Return ONLY the JSON object, no preamble.
PROMPT;
    }
}
