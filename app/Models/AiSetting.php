<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AiSetting extends Model
{
    use HasUuids;

    protected $fillable = [
        'enabled',
        'provider',
        'model',
        'fallback_provider',
        'fallback_model',
        'api_key_encrypted',
        'base_url',
        'temperature',
        'max_tokens',
        'daily_request_limit',
        'monthly_token_limit',
        'enabled_modules',
        'safety_mode',
        'log_prompts',
        'log_responses',
        'active',
        'created_by_id',
        'updated_by_id',
    ];

    protected $casts = [
        'enabled'         => 'boolean',
        'enabled_modules' => 'array',
        'log_prompts'     => 'boolean',
        'log_responses'   => 'boolean',
        'active'          => 'boolean',
        'temperature'     => 'float',
        'max_tokens'      => 'integer',
    ];

    protected $hidden = ['api_key_encrypted'];

    /** Encrypt API key before persisting. */
    public function setApiKeyRawAttribute(string $key): void
    {
        $this->attributes['api_key_encrypted'] = Crypt::encryptString($key);
    }

    /** Decrypt stored API key. Returns null if none stored. */
    public function getDecryptedApiKey(): ?string
    {
        if (empty($this->api_key_encrypted)) {
            return null;
        }

        try {
            return Crypt::decryptString($this->api_key_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    /** Return masked key like sk-****abcd for display. */
    public function getMaskedApiKey(): ?string
    {
        $key = $this->getDecryptedApiKey();

        if (!$key) {
            return null;
        }

        $len = mb_strlen($key);

        if ($len <= 8) {
            return str_repeat('*', $len);
        }

        return substr($key, 0, 3) . '****' . substr($key, -4);
    }

    /** Get the singleton settings row (creates default if missing). */
    public static function current(): static
    {
        return static::firstOrCreate(
            ['active' => true],
            [
                'enabled'         => false,
                'provider'        => config('ai.default_provider', 'openai'),
                'model'           => config('ai.default_model', 'gpt-4o-mini'),
                'temperature'     => config('ai.temperature', 0.2),
                'max_tokens'      => config('ai.max_tokens', 1200),
                'enabled_modules' => config('ai.default_modules_enabled', []),
                'safety_mode'     => 'strict',
                'log_prompts'     => true,
                'log_responses'   => true,
            ]
        );
    }

    /** Check if a module is enabled. */
    public function isModuleEnabled(string $module): bool
    {
        if (!$this->enabled) {
            return false;
        }

        $modules = $this->enabled_modules ?? [];

        return (bool) ($modules[$module] ?? false);
    }
}
