<?php

namespace App\Services\SaaS;

use App\Models\Central\PlatformSetting;
use App\Models\Central\PlatformSettingRevision;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PlatformSettingsService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember('platform-setting:'.$key, now()->addHour(), fn () => PlatformSetting::query()->where('key', $key)->first()?->value ?? $default);
    }

    public function set(string $group, string $key, mixed $value, string $type = 'string', bool $encrypted = false): PlatformSetting
    {
        $setting = PlatformSetting::firstOrNew(['key' => $key]);
        $setting->fill(compact('group', 'type') + ['is_encrypted' => $encrypted]);
        $setting->value = $value;
        $setting->save();
        Cache::forget('platform-setting:'.$key);
        Cache::forget('platform-settings:group:'.$group);
        if ($setting->is_public) {
            Cache::forget('platform-settings:public');
        }

        return $setting;
    }

    public function getGroup(string $group): array
    {
        return Cache::remember('platform-settings:group:'.$group, now()->addHour(), fn () => PlatformSetting::query()
            ->where('group', $group)->get()->mapWithKeys(fn (PlatformSetting $setting) => [$setting->key => $setting->safeValue()])->all());
    }

    /** @return array{saved:array<int,string>,unchanged:array<int,string>} */
    public function updateSection(string $group, array $values, ?int $adminId = null, ?string $ip = null): array
    {
        $all = PlatformSetting::query()->whereIn('key', array_keys($values))->get()->keyBy('key');
        $errors = [];
        foreach ($values as $key => $value) {
            $setting = $all->get($key);
            if (! $setting) {
                $errors['values.'.$key] = 'This setting does not exist.';
            } elseif ($setting->group !== $group) {
                $errors['values.'.$key] = 'This setting belongs to another section.';
            } elseif ($setting->is_readonly) {
                $errors['values.'.$key] = 'This setting is read-only.';
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $storedFiles = [];
        try {
            $result = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($group, $values, $adminId, $ip, &$storedFiles): array {
                $settings = PlatformSetting::where('group', $group)->whereIn('key', array_keys($values))->lockForUpdate()->get()->keyBy('key');
                $saved = [];
                $unchanged = [];
                foreach ($values as $key => $submitted) {
                    $setting = $settings->get($key);
                    if ($setting->is_encrypted && ($submitted === null || $submitted === '')) {
                        $unchanged[] = $key;

                        continue;
                    }
                    $value = $this->prepareValue($setting, $submitted, $storedFiles);
                    $value = $this->normalizeValue($setting, $value);
                    $this->validateValue($setting, $value);
                    $old = $setting->value;
                    if ($this->encode($old) === $this->encode($value)) {
                        $unchanged[] = $key;

                        continue;
                    }
                    $setting->updated_by = $adminId;
                    $setting->value = $value;
                    $setting->save();
                    PlatformSettingRevision::create([
                        'setting_id' => $setting->id, 'admin_id' => $adminId,
                        'old_value' => $setting->is_encrypted ? null : $this->encode($old),
                        'new_value' => $setting->is_encrypted ? null : $this->encode($value), 'ip_address' => $ip,
                    ]);
                    $saved[] = $key;
                }

                return compact('saved', 'unchanged');
            });
        } catch (\Throwable $exception) {
            foreach ($storedFiles as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $exception;
        }

        foreach (array_unique([...$result['saved'], ...$result['unchanged']]) as $key) {
            Cache::forget('platform-setting:'.$key);
        }
        Cache::forget('platform-settings:group:'.$group);
        if (collect($result['saved'])->contains(fn (string $key) => (bool) $all->get($key)?->is_public)) {
            Cache::forget('platform-settings:public');
        }

        return $result;
    }

    public function resetSection(string $group, ?int $adminId = null, ?string $ip = null): void
    {
        $values = PlatformSetting::where('group', $group)->where('is_readonly', false)->get()->mapWithKeys(function (PlatformSetting $setting): array {
            $value = match ($setting->type) {
                'boolean' => filter_var($setting->default_value, FILTER_VALIDATE_BOOL),
                'integer' => (int) $setting->default_value, 'decimal' => (float) $setting->default_value,
                'json' => json_decode((string) $setting->default_value, true) ?? [], default => $setting->default_value,
            };

            return [$setting->key => $value];
        })->all();
        $this->updateSection($group, $values, $adminId, $ip);
    }

    public function publicSettings(): array
    {
        return Cache::remember('platform-settings:public', now()->addHour(), fn () => PlatformSetting::where('is_public', true)->get()->mapWithKeys(fn ($setting) => [$setting->key => $setting->safeValue()])->all());
    }

    public function applyMailConfiguration(): string
    {
        $driver = strtolower((string) $this->get('email.driver', config('mail.default', 'log')));
        $allowed = ['smtp', 'sendmail', 'mailgun', 'ses', 'ses-v2', 'postmark', 'resend', 'log', 'array'];
        if (! in_array($driver, $allowed, true) || ! config("mail.mailers.{$driver}")) {
            $driver = 'smtp';
        }
        config([
            'mail.default' => $driver,
            'mail.from.name' => $this->get('email.sender_name', config('mail.from.name')),
            'mail.from.address' => $this->get('email.sender_address', config('mail.from.address')),
            "mail.mailers.{$driver}.host" => $this->get('email.host', config("mail.mailers.{$driver}.host")),
            "mail.mailers.{$driver}.port" => $this->get('email.port', config("mail.mailers.{$driver}.port")),
            "mail.mailers.{$driver}.username" => $this->get('email.username', config("mail.mailers.{$driver}.username")),
            "mail.mailers.{$driver}.password" => $this->get('email.password', config("mail.mailers.{$driver}.password")),
            "mail.mailers.{$driver}.scheme" => match ((string) $this->get('email.encryption')) {
                'ssl' => 'smtps', 'tls' => 'smtp', default => null
            },
            "mail.mailers.{$driver}.timeout" => (int) $this->get('email.timeout', 30),
        ]);
        Mail::purge($driver);

        return $driver;
    }

    private function prepareValue(PlatformSetting $setting, mixed $value, array &$storedFiles = []): mixed
    {
        if (! $value instanceof UploadedFile) {
            return $value;
        }

        if ($setting->input_type !== 'image') {
            throw ValidationException::withMessages([$setting->key => 'This setting does not accept file uploads.']);
        }

        validator(
            ['value' => $value],
            ['value' => ['file', 'mimes:jpg,jpeg,png,gif,webp,svg,ico', 'max:5120']]
        )->validate();

        $path = $value->store('central/settings/'.now()->format('Y/m'), 'public');
        $storedFiles[] = $path;

        return Storage::disk('public')->url($path);
    }

    private function normalizeValue(PlatformSetting $setting, mixed $value): mixed
    {
        return match ($setting->type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? $value,
            'integer' => is_numeric($value) ? (int) $value : $value,
            'decimal' => is_numeric($value) ? (float) $value : $value,
            'json' => is_string($value) ? json_decode($value, true) : $value,
            default => $value,
        };
    }

    private function validateValue(PlatformSetting $setting, mixed $value): void
    {
        if ($setting->is_required && ($value === null || $value === '')) {
            throw ValidationException::withMessages([$setting->key => 'This setting is required.']);
        }
        $valid = match ($setting->type) {
            'boolean' => is_bool($value) || in_array($value, [0, 1, '0', '1'], true),
            'integer' => filter_var($value, FILTER_VALIDATE_INT) !== false,
            'decimal' => is_numeric($value), 'json' => is_array($value), default => is_scalar($value) || $value === null,
        };
        if (! $valid) {
            throw ValidationException::withMessages([$setting->key => 'The setting value has an invalid type.']);
        }
        if (filled($setting->validation_rules)) {
            try {
                Validator::make(['value' => $value], ['value' => explode('|', $setting->validation_rules)])->validate();
            } catch (ValidationException $exception) {
                throw ValidationException::withMessages([$setting->key => $exception->validator->errors()->first('value')]);
            }
        }
    }

    private function encode(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return is_scalar($value) ? (string) $value : json_encode($value, JSON_THROW_ON_ERROR);
    }
}
