<?php

namespace App\Services\AI\Tools\Actions;

use Illuminate\Http\Request;

class CreateInvoiceDraftAction extends BaseDraftAction
{
    protected string $actionType = 'create_invoice_draft';
    protected string $module = 'invoices';
    protected string $title = 'Create draft invoice';
    protected string $riskLevel = 'medium';
    protected array $riskReasons = ['Creates an accounting-impacting sales transaction.', 'Requires human approval before execution.'];

    protected function payload(Request $request, string $message, array $contextPayload): array
    {
        $contact = $this->resolveContact($message, 'customer');

        return array_filter([
            'contact_id' => $contact['contact_id'] ?? null,
            'contact_name' => $contact['contact_name'] ?? null,
            'invoice_date' => now()->toDateString(),
            'due_date' => str_contains(mb_strtolower($message), 'tomorrow') ? now()->addDay()->toDateString() : null,
            'total' => $this->extractAmount($message),
            'balance_due' => $this->extractAmount($message),
            'missing_contact' => $contact['missing'] ?? null,
        ], fn ($value) => $value !== null);
    }

    protected function missingFields(array $payload, string $message): array
    {
        $missing = [];
        if (isset($payload['missing_contact'])) {
            $missing[] = $payload['missing_contact'];
        }
        if (empty($payload['total'])) {
            $missing[] = ['field' => 'total', 'reason' => 'No invoice amount was provided.', 'options' => []];
        }
        return $missing;
    }

    protected function titleFor(string $message, array $payload): string
    {
        return 'Create draft invoice' . (!empty($payload['contact_name']) ? ' for ' . $payload['contact_name'] : '');
    }

    protected function summaryFor(string $message, array $payload): string
    {
        $amount = isset($payload['total']) ? ' for NPR ' . number_format((float) $payload['total'], 2) : '';
        return 'Create a draft invoice' . (!empty($payload['contact_name']) ? ' for ' . $payload['contact_name'] : '') . $amount . '.';
    }
}
