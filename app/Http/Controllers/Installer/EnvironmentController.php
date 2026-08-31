<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Support\Installer\FroidenEnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EnvironmentController extends Controller
{
    public function __invoke(Request $request, FroidenEnvironmentManager $environment): array|RedirectResponse
    {
        $payload = $request->all();

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
        ]);

        if ($validator->fails()) {
            if ($request->boolean('_browser_submit')) {
                return back()
                    ->withErrors($validator)
                    ->withInput($this->nonSecretInput($request));
            }

            return Reply::formErrors($validator);
        }

        $result = $environment->save($request);

        if (! $request->boolean('_browser_submit')) {
            return $result;
        }

        if (($result['status'] ?? null) === 'success' && ($result['action'] ?? null) === 'redirect') {
            return redirect()->to((string) $result['url'])->with('success', $result['message'] ?? null);
        }

        $errors = $result['errors'] ?? ['environment' => $result['message'] ?? 'Could not save the installation settings.'];

        return back()
            ->withErrors($errors)
            ->withInput($this->nonSecretInput($request));
    }

    private function nonSecretInput(Request $request): array
    {
        return $request->except([
            '_token',
            'password',
            'admin_password',
            'admin_password_confirmation',
        ]);
    }
}
