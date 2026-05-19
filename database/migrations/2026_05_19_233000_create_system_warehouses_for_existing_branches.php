<?php

use App\Models\Branch;
use App\Observers\BranchObserver;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $observer = app(BranchObserver::class);

        Branch::query()
            ->with('warehouses')
            ->orderBy('name')
            ->each(fn (Branch $branch) => $observer->ensureSystemWarehouse($branch));
    }

    public function down(): void
    {
        //
    }
};
