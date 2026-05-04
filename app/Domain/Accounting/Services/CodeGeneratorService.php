<?php

namespace App\Domain\Accounting\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class CodeGeneratorService
{
    public function nextPrefixedCode(
        string $modelClass,
        string $column,
        string $prefix,
        int $pad = 5,
        ?string $branchId = null
    ): string {
        /** @var Model $model */
        $model = new $modelClass();
        $table = $model->getTable();

        $query = $modelClass::query()
            ->where($column, 'like', $prefix . '%')
            ->lockForUpdate();

        if (
            $branchId &&
            Schema::hasColumn($table, 'branch_id')
        ) {
            $query->where('branch_id', $branchId);
        }

        $lastCode = $query
            ->orderByDesc($column)
            ->value($column);

        $number = 1;

        if ($lastCode) {
            $number = ((int) preg_replace('/\D/', '', str_replace($prefix, '', $lastCode))) + 1;
        }

        return $prefix . str_pad((string) $number, $pad, '0', STR_PAD_LEFT);
    }

    public function nextNumericCodeFromRange(
        string $modelClass,
        string $column,
        int $start,
        int $end,
        ?string $branchId = null
    ): string {
        /** @var Model $model */
        $model = new $modelClass();
        $table = $model->getTable();

        $query = $modelClass::query()
            ->whereNotNull($column)
            ->lockForUpdate();

        if (
            $branchId &&
            Schema::hasColumn($table, 'branch_id')
        ) {
            $query->where('branch_id', $branchId);
        }

        $codes = $query->pluck($column)->toArray();

        $max = $start - 1;

        foreach ($codes as $code) {
            if (!is_numeric($code)) {
                continue;
            }

            $num = (int) $code;

            if ($num >= $start && $num <= $end && $num > $max) {
                $max = $num;
            }
        }

        $next = $max + 1;

        if ($next > $end) {
            throw new \RuntimeException("No available code left in range {$start}-{$end}.");
        }

        return (string) $next;
    }

    public function nextDocumentNumber(
        string $modelClass,
        string $column,
        string $prefix,
        ?string $branchId = null
    ): string {
        $year = now()->format('Y');

        return $this->nextPrefixedCode(
            modelClass: $modelClass,
            column: $column,
            prefix: "{$prefix}-{$year}-",
            pad: 5,
            branchId: $branchId
        );
    }
}