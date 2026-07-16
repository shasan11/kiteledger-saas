<?php

namespace App\Services\SaaS;

use App\Enums\TenantStatus;
use App\Models\Central\BackupManifest;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDeletionRequest;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantDeletionService
{
    public function __construct(
        private TenantLifecycleService $lifecycle,
        private DatabaseProvisionerManager $databases,
        private TenantFileDeletionService $files,
    ) {}

    public function request(Tenant $tenant, int $adminId, string $reason, ?BackupManifest $backup, bool $waived): TenantDeletionRequest
    {
        if (! $waived && (! $backup || $backup->tenant_id !== $tenant->id || $backup->status !== 'verified')) {
            throw new \RuntimeException('verified_backup_required');
        }

        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant, $adminId, $reason, $backup, $waived) {
            $this->lifecycle->transition($tenant, TenantStatus::DeletionPending, $reason);

            return TenantDeletionRequest::create(['id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'status' => 'pending', 'requested_by' => $adminId, 'execute_after' => now()->addDays((int) config('saas.deletion_wait_days', 14)), 'backup_manifest_id' => $backup?->id, 'backup_waived' => $waived, 'reason' => $reason]);
        });
    }

    public function approve(TenantDeletionRequest $request, int $adminId): void
    {
        abort_if($request->execute_after->isFuture(), 409, 'The deletion waiting period has not elapsed.');
        $request->update(['status' => 'approved', 'approved_by' => $adminId]);
    }

    public function execute(TenantDeletionRequest $request): void
    {
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($request): void {
            $locked = TenantDeletionRequest::lockForUpdate()->findOrFail($request->id);
            if ($locked->status !== 'approved') {
                return;
            } $locked->update(['status' => 'running']);
        });
        $tenant = Tenant::withTrashed()->findOrFail($request->tenant_id);
        $this->databases->driver($tenant->database_provisioning_mode)->destroy($tenant);
        $this->files->delete($tenant);
        $tenant->domains()->update(['status' => 'disabled', 'disabled_at' => now()]);
        $tenant->delete();
        $request->update(['status' => 'completed']);
    }
}
