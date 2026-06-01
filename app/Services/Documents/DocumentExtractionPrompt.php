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
If a value is not visible, return null.
If unsure, add a warning.
If totals do not match line items, add a warning.
Classify the document type.
Extract parties, dates, document number, currency, line items, taxes, totals, payment details, warehouse movement, and journal entry data if present.
Return only valid JSON matching the required schema.
PROMPT;
    }

    public static function user(): string
    {
        return <<<'PROMPT'
Extract this document into the following JSON schema. Use null where unknown.

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
    { "description": null, "product_code": null, "product_name": null, "quantity": null, "unit": null, "rate": null, "discount": 0, "tax_rate": 0, "tax_amount": 0, "amount": null, "account_hint": null }
  ],
  "totals": { "subtotal": null, "discount_total": 0, "tax_total": 0, "shipping": 0, "grand_total": null, "paid_amount": 0, "balance_due": null },
  "payment": { "method": null, "bank_name": null, "reference_no": null, "paid_amount": null, "payment_date": null },
  "inventory": { "source_warehouse": null, "destination_warehouse": null, "movement_type": null },
  "journal_entry": { "narration": null, "lines": [{ "account_name": null, "debit": 0, "credit": 0, "description": null }] },
  "terms_and_conditions": null,
  "warnings": [],
  "missing_fields": []
}

Return ONLY the JSON object, no preamble.
PROMPT;
    }
}
