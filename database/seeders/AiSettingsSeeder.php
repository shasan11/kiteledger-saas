<?php

namespace Database\Seeders;

use App\Models\Central\PlatformSetting;
use App\Services\AI\AiSettingsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AiSettingsSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->settings() as $name => $default) {
            $key = AiSettingsService::GROUP.'.'.$name;
            $setting = PlatformSetting::firstOrNew(['key' => $key]);
            $setting->fill([
                'group' => AiSettingsService::GROUP,
                'label' => $this->label($name),
                'description' => 'Controls '.$this->label($name).' for KiteLedger Copilot.',
                'input_type' => $this->inputType($name, $default),
                'type' => $this->storageType($name, $default),
                'help_text' => $name === 'ai_api_key' ? 'Stored encrypted; leave blank to keep the current secret.' : null,
                'options' => $this->options($name),
                'validation_rules' => $this->validationRules($name, $default),
                'is_encrypted' => $name === 'ai_api_key',
                'is_public' => false,
                'is_required' => false,
                'requires_confirmation' => $name === 'ai_api_key',
                'sort_order' => $this->sortOrder($name),
                'environment' => 'all',
            ]);

            if (! $setting->exists) {
                $setting->default_value = $this->encode($default);
                $setting->value = $default;
            } elseif ($setting->default_value === null || $setting->default_value === '') {
                $setting->default_value = $this->encode($default);
            }

            $setting->save();
        }
    }

    private function settings(): array
    {
        return AiSettingsService::DEFAULTS + [
            'ai_api_key' => null,
            'ai_rag_enabled' => true,
            'ai_financial_tools_enabled' => true,
        ];
    }

    private function label(string $name): string
    {
        return (string) Str::of($name)
            ->replace('_', ' ')
            ->title()
            ->replace(['Ai ', 'Api ', 'Rag ', 'Url ', 'Ttl '], ['AI ', 'API ', 'RAG ', 'URL ', 'TTL ']);
    }

    private function inputType(string $name, mixed $default): string
    {
        if ($name === 'ai_api_key') {
            return 'secret';
        }
        if ($name === 'ai_base_url') {
            return 'url';
        }
        if (is_bool($default)) {
            return 'switch';
        }
        if (in_array($name, ['ai_provider', 'ai_copilot_engine', 'ai_embedding_provider', 'ai_default_financial_date_scope', 'ai_assistant_mode'], true)) {
            return 'select';
        }
        if (is_int($default) || str_ends_with($name, '_seconds') || str_ends_with($name, '_tokens') || str_ends_with($name, '_rows') || str_ends_with($name, '_chars') || str_ends_with($name, '_ttl') || str_contains($name, '_pool') || str_contains($name, '_dimensions')) {
            return 'number';
        }
        if (is_float($default) || str_contains($name, '_temperature') || str_contains($name, '_score')) {
            return 'decimal';
        }

        return 'text';
    }

    private function storageType(string $name, mixed $default): string
    {
        return match ($this->inputType($name, $default)) {
            'switch' => 'boolean',
            'number' => 'integer',
            'decimal' => 'decimal',
            default => 'string',
        };
    }

    private function validationRules(string $name, mixed $default): string
    {
        return match ($this->inputType($name, $default)) {
            'url' => 'nullable|url',
            'switch' => 'nullable|boolean',
            'number' => 'nullable|integer',
            'decimal' => 'nullable|numeric',
            default => 'nullable|string',
        };
    }

    private function options(string $name): ?array
    {
        return match ($name) {
            'ai_provider' => ['openai', 'groq', 'gemini', 'anthropic', 'openrouter', 'ollama'],
            'ai_copilot_engine' => ['neuron', 'legacy'],
            'ai_embedding_provider' => ['openai', 'gemini', 'openrouter', 'ollama'],
            'ai_default_financial_date_scope' => ['current_fiscal_year', 'current_month', 'last_30_days'],
            'ai_assistant_mode' => ['full', 'reports_only'],
            default => null,
        };
    }

    private function sortOrder(string $name): int
    {
        $keys = array_keys($this->settings());

        return (int) array_search($name, $keys, true);
    }

    private function encode(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if ($value === null) {
            return '';
        }

        return (string) $value;
    }
}
