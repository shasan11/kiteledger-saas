<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BackupManifest;
use App\Models\Central\Tenant;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\NativeBackupManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BackupController extends Controller
{
    public function index(Request $request)
    {
        $query = BackupManifest::with('tenant:id,company_name');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->string('tenant_id'));
        }

        return Inertia::render('Central/Infrastructure/Backups', [
            'backups' => $query->latest()->paginate(25)->withQueryString(),
            'tenants' => Tenant::orderBy('company_name')->get(['id', 'company_name']),
            'filters' => $request->only('status', 'tenant_id'),
        ]);
    }

    public function store(Request $request, NativeBackupManager $backups, CentralAuditService $audit)
    {
        $tenant = Tenant::findOrFail($request->validate(['tenant_id' => ['required', 'exists:tenants,id']])['tenant_id']);
        $manifest = $backups->backupTenant($tenant);
        $audit->log($request, 'backup.created', $manifest, [], $manifest->only(['tenant_id', 'type', 'status', 'size_bytes', 'checksum']));

        return back()->with('success', 'Tenant backup created and verified.');
    }

    public function verify(Request $request, BackupManifest $backup, NativeBackupManager $backups, CentralAuditService $audit)
    {
        $valid = $backups->verify($backup);
        $audit->log($request, 'backup.verified', $backup, [], ['valid' => $valid]);

        return back()->with($valid ? 'success' : 'error', $valid ? 'Backup checksum verified.' : 'Backup verification failed.');
    }

    public function download(BackupManifest $backup)
    {
        abort_unless(in_array($backup->status, ['completed', 'verified'], true) && filled($backup->path) && is_file($backup->path), 404);

        return response()->download($backup->path, 'kiteledger-'.$backup->tenant_id.'-'.$backup->id.'.sql');
    }

    public function destroy(Request $request, BackupManifest $backup, CentralAuditService $audit)
    {
        $audit->log($request, 'backup.deleted', $backup, $backup->only(['tenant_id', 'type', 'status', 'size_bytes', 'checksum']));
        if (filled($backup->path) && is_file($backup->path)) {
            unlink($backup->path);
        }
        $backup->delete();

        return back()->with('success', 'Backup file and manifest deleted.');
    }
}
