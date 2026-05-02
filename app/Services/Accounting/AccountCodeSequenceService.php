<?php

namespace App\Services\Accounting;

use Illuminate\Support\Facades\DB;

class AccountCodeSequenceService
{
    public function nextCode(string $ownerType, ?string $branchId): string
    {
        return DB::transaction(function () use ($ownerType, $branchId): string {
            $sequence = DB::table('account_code_sequences')
                ->where('owner_type', $ownerType)
                ->where('branch_id', $branchId)
                ->lockForUpdate()
                ->first();

            if ($sequence === null) {
                DB::table('account_code_sequences')->insert([
                    'owner_type' => $ownerType,
                    'branch_id' => $branchId,
                    'current_value' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return $this->formatCode($ownerType, 1);
            }

            $nextValue = ((int) $sequence->current_value) + 1;

            DB::table('account_code_sequences')
                ->where('id', $sequence->id)
                ->update([
                    'current_value' => $nextValue,
                    'updated_at' => now(),
                ]);

            return $this->formatCode($ownerType, $nextValue);
        });
    }

    protected function formatCode(string $ownerType, int $value): string
    {
        $prefix = strtoupper(substr($ownerType, 0, 3));

        return sprintf('%s-%05d', $prefix, $value);
    }
}
