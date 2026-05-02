<?php

namespace App\Services\Accounting;

use Illuminate\Support\Facades\DB;

class AccountCodeSequenceService
{
    public function nextCode(string $ownerType = 'coa', mixed $branchId = null): string
    {
        $table = $this->tableForOwnerType($ownerType);

        $codes = DB::table($table)
            ->whereNotNull('code')
            ->pluck('code')
            ->toArray();

        $max = 1000;

        foreach ($codes as $code) {
            $number = $this->extractNumber($code);

            if ($number > $max) {
                $max = $number;
            }
        }

        $next = $max + 1;

        while ($this->codeExists($table, (string) $next)) {
            $next++;
        }

        return (string) $next;
    }

    protected function tableForOwnerType(string $ownerType): string
    {
        return match ($ownerType) {
            'coa', 'chart_of_account', 'chart_of_accounts' => 'chart_of_accounts',
            'account', 'accounts' => 'accounts',
            default => 'chart_of_accounts',
        };
    }

    protected function extractNumber(string $code): int
    {
        preg_match_all('/\d+/', $code, $matches);

        if (empty($matches[0])) {
            return 0;
        }

        return (int) end($matches[0]);
    }

    protected function codeExists(string $table, string $code): bool
    {
        return DB::table($table)
            ->where('code', $code)
            ->exists();
    }
}