<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Support\Installer\FroidenEnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EnvironmentController extends Controller
{
    public function __invoke(Request $request, FroidenEnvironmentManager $environment): array
    {
        $payload = $request->all();
        if (($payload['provisioning_mode'] ?? null) === 'pool' && empty($payload['pool_databases']) && filled($payload['pool_database_name'] ?? null)) {
            $payload['pool_databases'] = [[
                'database_name' => $payload['pool_database_name'],
                'username' => $payload['pool_database_username'] ?? null,
                'password' => $payload['pool_database_password'] ?? null,
            ]];
            $request->merge(['pool_databases' => $payload['pool_databases']]);
        }

        $validator = Validator::make($payload, [
            'hostname' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'database' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'username' => ['required', 'string', 'max:128'],
            'password' => ['nullable', 'string', 'max:1024'],
            'app_url' => ['required', 'url:http,https', 'max:255'],
            'central_domains' => ['required', 'string', 'max:1000'],
            'saas_base_domain' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9.-]+$/'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email:rfc', 'max:255'],
            'admin_password' => ['required', 'string', 'min:12', 'max:255', 'confirmed'],
            'provisioning_mode' => ['required', 'in:automatic,cpanel_uapi,pool'],
            'cpanel_host' => ['nullable', 'required_if:provisioning_mode,cpanel_uapi', 'url:http,https', 'max:255'],
            'cpanel_port' => ['nullable', 'required_if:provisioning_mode,cpanel_uapi', 'integer', 'between:1,65535'],
            'cpanel_username' => ['nullable', 'required_if:provisioning_mode,cpanel_uapi', 'string', 'max:128'],
            'cpanel_api_token' => ['nullable', 'required_if:provisioning_mode,cpanel_uapi', 'string', 'max:1024'],
            'cpanel_database_user' => ['nullable', 'required_if:provisioning_mode,cpanel_uapi', 'string', 'max:128'],
            'cpanel_database_password' => ['nullable', 'string', 'max:1024'],
            'pool_databases' => ['nullable', 'required_if:provisioning_mode,pool', 'array', 'min:1', 'max:50'],
            'pool_databases.*.database_name' => ['required_with:pool_databases', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', 'distinct'],
            'pool_databases.*.username' => ['nullable', 'string', 'max:128'],
            'pool_databases.*.password' => ['nullable', 'string', 'max:1024'],
            'pool_database_name' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'pool_database_username' => ['nullable', 'string', 'max:128'],
            'pool_database_password' => ['nullable', 'string', 'max:1024'],
        ]);

        if ($validator->fails()) {
            return Reply::formErrors($validator);
        }

        return $environment->save($request);
    }
}
