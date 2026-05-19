<?php

namespace App\Observers;

use App\Models\Branch;
use App\Models\Warehouse;
use Illuminate\Support\Str;

class BranchObserver
{
    public function created(Branch $branch): void
    {
        $this->ensureSystemWarehouse($branch);
    }

    public function ensureSystemWarehouse(Branch $branch): Warehouse
    {
        $existing = $branch->warehouses()
            ->where('is_system_generated', true)
            ->first();

        if ($existing) {
            return $existing;
        }

        return $branch->warehouses()->create([
            'code' => $this->warehouseCode($branch),
            'name' => Str::limit(trim($branch->name . ' Warehouse'), 150, ''),
            'address' => $branch->address,
            'active' => true,
            'is_system_generated' => true,
            'user_add_id' => $branch->user_add_id,
        ]);
    }

    private function warehouseCode(Branch $branch): string
    {
        $base = $branch->code ?: $branch->name ?: 'BRANCH';
        $code = Str::upper(Str::slug($base, '-'));
        $code = $code !== '' ? $code : 'BRANCH';

        return Str::limit($code, 27, '') . '-WH';
    }
}
