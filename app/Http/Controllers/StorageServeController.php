<?php

namespace App\Http\Controllers;

use Illuminate\Filesystem\ServeFile;
use Illuminate\Http\Request;

/**
 * Serves the "public" disk ourselves instead of relying on Laravel's
 * automatic `serve => true` route.
 *
 * That automatic route is registered globally by FilesystemServiceProvider
 * with no middleware at all, so it never runs behind
 * InitializeTenancyByVerifiedDomain. Stancl's FilesystemTenancyBootstrapper
 * only repoints the "public" disk root once tenancy is bootstrapped - so the
 * automatic route always resolved files from the central, un-suffixed
 * storage/app/public, even for a request on a tenant subdomain. Every file a
 * tenant uploaded (profile photos, tenant-branded logos, ...) physically
 * lives under storage/tenant{id}/app/public/... and was therefore never
 * reachable over HTTP - uploads "succeeded" but the image never showed.
 *
 * Registering this controller inside the tenant-wrapped route group (and,
 * separately, inside the central domain group) means the disk root is
 * already correctly resolved - tenant-scoped on a tenant domain, central on
 * the central domain - by the time this runs.
 */
class StorageServeController extends Controller
{
    public function __invoke(Request $request, string $path)
    {
        $config = config('filesystems.disks.public');

        return (new ServeFile('public', $config, app()->isProduction()))($request, $path);
    }
}
