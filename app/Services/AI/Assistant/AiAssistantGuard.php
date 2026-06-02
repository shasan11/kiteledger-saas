<?php

namespace App\Services\AI\Assistant;

class AiAssistantGuard
{
    public const MAX_ROWS = 20;
    public const MAX_CONTEXT_CHARS = 6000;
    public const LEDGER_MAX_LINES = 50;
    public const TABLE_MAX_ROWS = 25;

    public function isBroadUnsafeQuestion(string $message): bool
    {
        $text = mb_strtolower($message);

        return str_contains($text, 'all transactions')
            || str_contains($text, 'entire database')
            || str_contains($text, 'everything')
            || str_contains($text, 'all records')
            || str_contains($text, 'whole database');
    }

    public function broadQuestionClarification(): array
    {
        return [
            'ok' => true,
            'intent' => 'unsupported',
            'answer_type' => 'clarification',
            'message' => 'Please choose a date range, account, customer, supplier, or transaction type so I can prepare a focused answer.',
            'cards' => [],
            'tables' => [],
            'warnings' => ['Broad requests are limited to protect speed, accuracy, and financial privacy.'],
            'source_note' => null,
            'followups' => [
                'Show Profit & Loss',
                'Show receivables summary',
                'Show cash and bank balance',
                'Show unpaid purchase bills',
            ],
        ];
    }

    public function trimRows(array $rows, ?int $limit = null): array
    {
        return array_slice(array_values($rows), 0, $limit ?? self::MAX_ROWS);
    }
}
