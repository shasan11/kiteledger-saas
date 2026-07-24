<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\Plan;
use App\Models\Central\PlatformSetting;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        $dynamicOptions = [
            'tenant_registration.default_plan' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name'])->map(fn (Plan $plan) => ['value' => $plan->id, 'label' => $plan->name])->values(),
            'tenant_registration.default_data_template' => DefaultDataTemplate::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])->map(fn (DefaultDataTemplate $template) => ['value' => $template->id, 'label' => $template->name])->values(),
        ];
        $groups = PlatformSetting::query()->with(['revisions', 'updatedBy:id,name'])->orderBy('group')->orderBy('sort_order')->get()->groupBy('group')->map(fn ($settings) => $settings->map(fn (PlatformSetting $setting) => [
            'id' => $setting->id, 'group' => $setting->group, 'key' => $setting->key, 'label' => $setting->label,
            'description' => $setting->description, 'help_text' => $setting->help_text, 'input_type' => $setting->input_type,
            'options' => $dynamicOptions[$setting->key] ?? $setting->options, 'validation_rules' => $setting->validation_rules,
            'environment' => $setting->environment, 'default_value' => $setting->is_encrypted ? null : $setting->default_value,
            'value' => $setting->safeValue(), 'has_secret' => $setting->is_encrypted && filled($setting->getRawOriginal('value')),
            'is_encrypted' => $setting->is_encrypted, 'is_required' => $setting->is_required, 'is_readonly' => $setting->is_readonly,
            'requires_confirmation' => $setting->requires_confirmation, 'requires_restart' => $setting->requires_restart,
            'last_tested_at' => $setting->last_tested_at, 'updated_at' => $setting->updated_at,
            'updated_by' => $setting->updatedBy?->name,
        ])->values())->toArray();
        $requestedGroup = (string) ($request->route('group') ?: $request->query('group', ''));

        return Inertia::render('Central/Settings/Index', ['groups' => $groups, 'activeGroup' => $requestedGroup ?: array_key_first($groups)]);
    }

    public function update(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        $data = $request->validate(['values' => ['required', 'array'], 'confirmation_password' => ['nullable', 'string', 'max:1000']]);
        $sensitive = PlatformSetting::where('group', $group)->whereIn('key', array_keys($data['values']))->where('requires_confirmation', true)->exists();
        abort_if($sensitive && ! Hash::check((string) ($data['confirmation_password'] ?? ''), $request->user('central')->password), 422, 'Your current administrator password is required for sensitive settings.');
        $settings->updateSection($group, $data['values'], $request->user('central')->id, $request->ip());
        $audit->log($request, 'settings.section_updated', null, [], ['group' => $group, 'keys' => array_keys($data['values'])]);

        return back()->with('success', 'Settings saved.');
    }

    public function reset(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        $data = $request->validate(['confirmation_password' => ['nullable', 'string', 'max:1000']]);
        $sensitive = PlatformSetting::where('group', $group)->where('requires_confirmation', true)->exists();
        abort_if($sensitive && ! Hash::check((string) ($data['confirmation_password'] ?? ''), $request->user('central')->password), 422, 'Your current administrator password is required to reset sensitive settings.');
        $settings->resetSection($group, $request->user('central')->id, $request->ip());
        $audit->log($request, 'settings.section_reset', null, [], ['group' => $group]);

        return back()->with('success', 'Section restored to safe defaults.');
    }

    public function test(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        abort_unless(in_array($group, ['email', 'storage', 'notifications'], true), 404);
        try {
            if ($group === 'email') {
                abort_unless($settings->get('email.email_enabled', false), 422, 'Email delivery is disabled.');
                $settings->applyMailConfiguration();
                $recipient = $settings->get('email.administrator_alert_address') ?: $request->user('central')->email;
                Mail::raw('KiteLedger successfully verified the central email configuration.', fn ($mail) => $mail->to($recipient)->subject('KiteLedger email configuration test'));
            } elseif ($group === 'storage') {
                $disk = (string) $settings->get('storage.storage_driver', 'public');
                abort_unless(config("filesystems.disks.{$disk}"), 422, 'The selected storage disk is not configured.');
                $path = 'central/health/'.Str::uuid().'.txt';
                abort_unless(Storage::disk($disk)->put($path, 'kiteledger-storage-check'), 422, 'The storage disk is not writable.');
                abort_unless(Storage::disk($disk)->get($path) === 'kiteledger-storage-check', 422, 'The storage disk could not read the verification object.');
                Storage::disk($disk)->delete($path);
            } else {
                $webhook = $settings->get('notifications.slack_webhook_url');
                abort_unless(filled($webhook), 422, 'Configure a Slack webhook URL before testing notifications.');
                Http::timeout(10)->post($webhook, ['text' => 'KiteLedger central notification webhook test succeeded.'])->throw();
            }
        } catch (\Throwable $exception) {
            report($exception);
            throw ValidationException::withMessages(['configuration' => 'Configuration test failed: '.Str::limit($exception->getMessage(), 300)]);
        }

        PlatformSetting::where('group', $group)->update(['last_tested_at' => now(), 'updated_by' => $request->user('central')->id]);
        $audit->log($request, 'settings.configuration_tested', null, [], ['group' => $group]);

        return back()->with('success', ucfirst($group).' configuration test succeeded.');
    }

    public function history(PlatformSetting $setting)
    {
        return response()->json($setting->revisions()->limit(50)->get()->map(fn ($revision) => [
            'id' => $revision->id, 'admin_id' => $revision->admin_id, 'changed_at' => $revision->created_at,
            'old_value' => $setting->is_encrypted ? null : $revision->getRawOriginal('old_value'),
            'new_value' => $setting->is_encrypted ? null : $revision->getRawOriginal('new_value'),
        ]));
    }
}
