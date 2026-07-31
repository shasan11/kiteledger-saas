<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\Plan;
use App\Models\Central\PlatformSetting;
use App\Services\AI\AiProviderManager;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function operationsGuide(PlatformSettingsService $settings)
    {
        $status = ['queued_jobs' => null, 'failed_jobs' => null, 'scheduler_last_seen_at' => null, 'queue_last_seen_at' => null];
        try {
            $connection = DB::connection(config('tenancy.database.central_connection'));
            $status['queued_jobs'] = $connection->table('jobs')->count();
            $status['failed_jobs'] = $connection->table('failed_jobs')->count();
            $heartbeats = $connection->table('saas_heartbeats')->whereIn('name', ['scheduler', 'queue'])->pluck('last_seen_at', 'name');
            $status['scheduler_last_seen_at'] = $heartbeats->get('scheduler');
            $status['queue_last_seen_at'] = $heartbeats->get('queue');
        } catch (\Throwable) {
            // The guide remains available during first-run setup and before queue tables exist.
        }

        return Inertia::render('Central/Settings/OperationsGuide', [
            'runtime' => [
                'queue_enabled' => (bool) $settings->get('queue_scheduler.queue_enabled', true),
                'scheduler_enabled' => (bool) $settings->get('queue_scheduler.scheduler_enabled', true),
                'queue_connection' => $settings->get('queue_scheduler.queue_connection', config('queue.default')),
                'default_queue' => $settings->get('queue_scheduler.default_queue', 'default'),
            ],
            'status' => $status,
            'commands' => [
                'worker' => 'php artisan queue:work central --queue=provisioning,billing,communication,notifications,mail,default --tries=3 --timeout=1800',
                'worker_once' => 'php artisan queue:work central --queue=provisioning,billing,communication,notifications,mail,default --stop-when-empty --tries=3 --timeout=1800',
                'scheduler' => '* * * * * cd /absolute/path/to/kiteledger && php artisan schedule:run >> /dev/null 2>&1',
                'windows_scheduler' => 'php artisan schedule:run',
                'inspect_schedule' => 'php artisan schedule:list',
                'failed_jobs' => 'php artisan queue:failed',
                'retry_failed' => 'php artisan queue:retry all',
            ],
            'scheduledTasks' => [
                ['name' => 'Customer subscription checks', 'frequency' => 'Daily at 00:15', 'effect' => 'Expires ended subscriptions, suspends expired customers, and resumes pauses whose resume time has arrived.'],
                ['name' => 'Usage collection', 'frequency' => 'Daily at 01:00', 'effect' => 'Refreshes customer usage metrics.'],
                ['name' => 'Upcoming invoices', 'frequency' => 'Daily at 02:00', 'effect' => 'Creates upcoming subscription invoices idempotently.'],
                ['name' => 'Scheduled website publishing', 'frequency' => 'Every minute', 'effect' => 'Publishes due website pages and blog posts.'],
                ['name' => 'Support SLA checks', 'frequency' => 'Every five minutes', 'effect' => 'Updates overdue support response and resolution states.'],
                ['name' => 'Notifications and cleanup', 'frequency' => 'Every fifteen minutes', 'effect' => 'Creates platform alerts and clears stale quota reservations.'],
                ['name' => 'Approved customer deletions', 'frequency' => 'Daily at 03:00', 'effect' => 'Executes approved deletion requests after their waiting period.'],
            ],
        ]);
    }

    public function index(Request $request)
    {
        $dynamicOptions = [
            'tenant_registration.default_plan' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name'])->map(fn (Plan $plan) => ['value' => $plan->id, 'label' => $plan->name])->values(),
            'tenant_registration.default_data_template' => DefaultDataTemplate::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])->map(fn (DefaultDataTemplate $template) => ['value' => $template->id, 'label' => $template->name])->values(),
        ];
        $groups = PlatformSetting::query()->orderBy('group')->orderBy('sort_order')->get()->groupBy('group')->map(fn ($settings) => $settings->map(fn (PlatformSetting $setting) => [
            'id' => $setting->id, 'group' => $setting->group, 'key' => $setting->key, 'label' => $setting->label,
            'description' => $setting->description, 'help_text' => $setting->help_text, 'updated_at' => $setting->updated_at?->toIso8601String(),
            'input_type' => $setting->input_type,
            'options' => $dynamicOptions[$setting->key] ?? $setting->options, 'validation_rules' => $setting->validation_rules,
            'environment' => $setting->environment, 'default_value' => $setting->is_encrypted ? null : $setting->default_value,
            'value' => $setting->safeValue(), 'has_secret' => $setting->is_encrypted && filled($setting->getRawOriginal('value')),
            'preview_url' => $this->previewUrl($setting),
            'is_encrypted' => $setting->is_encrypted, 'is_required' => $setting->is_required, 'is_readonly' => $setting->is_readonly,
            'requires_confirmation' => $setting->requires_confirmation, 'requires_restart' => $setting->requires_restart,
        ])->values())->toArray();
        $requestedGroup = (string) ($request->route('group') ?: $request->query('group', ''));

        return Inertia::render('Central/Settings/Index', ['groups' => $groups, 'activeGroup' => $requestedGroup ?: array_key_first($groups)]);
    }

    public function update(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        $data = $request->validate(['confirmation_password' => ['nullable', 'string', 'max:1000']]);
        $values = $this->settingValues($request);
        if ($values === []) {
            throw ValidationException::withMessages(['values' => 'No settings were submitted.']);
        }

        $sensitive = PlatformSetting::where('group', $group)->whereIn('key', array_keys($values))->where('requires_confirmation', true)->exists();
        if ($sensitive && ! Hash::check((string) ($data['confirmation_password'] ?? ''), $request->user('central')->password)) {
            throw ValidationException::withMessages(['confirmation_password' => 'Your current administrator password is incorrect.']);
        }
        $result = $settings->updateSection($group, $values, $request->user('central')->id, $request->ip());
        $audit->log($request, 'settings.section_updated', null, [], ['group' => $group, 'keys' => array_keys($values)]);

        return back()->with('success', $result['saved'] === [] ? 'No settings changed.' : 'Settings saved.')
            ->with('settings_result', $result);
    }

    private function settingValues(Request $request): array
    {
        $values = $request->input('values', []);
        if (! is_array($values)) {
            return [];
        }

        return array_replace($values, Arr::dot($request->file('values', [])));
    }

    public function reset(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        $data = $request->validate(['confirmation_password' => ['nullable', 'string', 'max:1000']]);
        $sensitive = PlatformSetting::where('group', $group)->where('requires_confirmation', true)->exists();
        if ($sensitive && ! Hash::check((string) ($data['confirmation_password'] ?? ''), $request->user('central')->password)) {
            throw ValidationException::withMessages(['confirmation_password' => 'Your current administrator password is incorrect.']);
        }
        $settings->resetSection($group, $request->user('central')->id, $request->ip());
        $audit->log($request, 'settings.section_reset', null, [], ['group' => $group]);

        return back()->with('success', 'Section restored to safe defaults.');
    }

    public function test(Request $request, string $group, PlatformSettingsService $settings, CentralAuditService $audit)
    {
        abort_unless(in_array($group, ['email', 'storage', 'notifications', 'ai'], true), 404);
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
            } elseif ($group === 'notifications') {
                $webhook = $settings->get('notifications.slack_webhook_url');
                abort_unless(filled($webhook), 422, 'Configure a Slack webhook URL before testing notifications.');
                Http::timeout(10)->post($webhook, ['text' => 'KiteLedger central notification webhook test succeeded.'])->throw();
            } else {
                $result = app(AiProviderManager::class)->testConnection();
                abort_unless($result['success'] ?? false, 422, (string) ($result['message'] ?? 'The AI provider connection failed.'));
            }
        } catch (\Throwable $exception) {
            report($exception);
            throw ValidationException::withMessages(['configuration' => 'Configuration test failed: '.Str::limit($exception->getMessage(), 300)]);
        }

        PlatformSetting::where('group', $group)->update(['last_tested_at' => now(), 'updated_by' => $request->user('central')->id]);
        $audit->log($request, 'settings.configuration_tested', null, [], ['group' => $group]);

        return back()->with('success', ucfirst($group).' configuration test succeeded.');
    }

    private function previewUrl(PlatformSetting $setting): ?string
    {
        if (! in_array($setting->input_type, ['image', 'file'], true)) {
            return null;
        }

        $value = $setting->safeValue();
        if (! is_string($value) || blank($value)) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, '/')) {
            return $value;
        }

        return Storage::disk('public')->url(ltrim($value, '/'));
    }
}
