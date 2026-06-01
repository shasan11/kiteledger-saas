<?php

namespace App\Http\Controllers\Api;

use App\Models\SmsConfig;
use App\Models\SmsLog;
use App\Services\Sms\SmsPhoneNormalizer;
use App\Services\Sms\SmsSender;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsConfigController extends BaseCrudApiController
{
    protected string $modelClass = SmsConfig::class;

    protected ?string $permissionPrefix = 'sms_config';
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = false;

    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $searchable = ['name', 'provider', 'from_number', 'sender_id'];
    protected array $filterable = ['provider', 'active', 'is_active', 'is_default', 'branch_id'];
    protected array $booleanFilters = ['active', 'is_active', 'is_default'];
    protected array $sortable = ['id', 'name', 'provider', 'active', 'is_active', 'is_default', 'created_at', 'updated_at'];
    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:120'],
        'provider' => ['required', 'in:twilio,sparrow_sms,sms_global,message_bird,vonage,custom_http,custom_post,custom_get,infobip'],
        'sender_id' => ['nullable', 'string', 'max:60'],
        'api_base_url' => ['nullable', 'string', 'max:500'],
        'api_secret' => ['nullable', 'string', 'max:2000'],
        'username' => ['nullable', 'string', 'max:255'],
        'password' => ['nullable', 'string', 'max:2000'],
        'route' => ['nullable', 'string', 'max:80'],
        'country_code' => ['nullable', 'string', 'max:12'],
        'default_country_code' => ['nullable', 'string', 'max:12'],
        'webhook_url' => ['nullable', 'url', 'max:500'],
        'callback_url' => ['nullable', 'url', 'max:500'],
        'test_phone' => ['nullable', 'string', 'max:80'],
        'test_message' => ['nullable', 'string', 'max:1600'],
        'metadata' => ['nullable', 'array'],
        'account_sid' => ['nullable', 'string', 'max:255'],
        'auth_token' => ['nullable', 'string', 'max:2000'],
        'from_number' => ['nullable', 'string', 'max:60'],
        'api_key' => ['nullable', 'string', 'max:2000'],
        'base_url' => ['nullable', 'string', 'max:500'],
        'active' => ['nullable', 'boolean'],
        'is_active' => ['nullable', 'boolean'],
        'is_default' => ['nullable', 'boolean'],
    ];

    protected function rulesForStore(Request $request): array
    {
        return $this->withProviderRules($this->storeRules, $request);
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->withProviderRules($this->makeRulesPartial($this->storeRules), $request, true);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = $this->stripBlankSecrets($parentData);
        $parentData['created_by'] = auth()->id();
        $parentData['updated_by'] = auth()->id();
        $parentData['user_add_id'] = auth()->id();

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = $this->stripBlankSecrets($parentData);
        $parentData['updated_by'] = auth()->id();

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        if ($record instanceof SmsConfig && $record->is_default) {
            SmsConfig::query()
                ->where('id', '!=', $record->getKey())
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        return $record;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        if (!$record instanceof SmsConfig) {
            return $data;
        }

        foreach (['auth_token', 'api_key', 'api_secret', 'password'] as $secret) {
            unset($data[$secret]);
            $data["has_{$secret}"] = !empty($record->getAttribute($secret));
            $data["{$secret}_masked"] = $data["has_{$secret}"] ? '********' : null;
        }

        $data['api_base_url'] = $record->api_base_url;
        $data['is_active'] = $record->is_active;

        return $data;
    }

    public function setDefault(Request $request, string $id): JsonResponse
    {
        $this->checkAccess($request, 'set_default');
        $record = SmsConfig::query()->findOrFail($id);
        SmsConfig::query()->where('id', '!=', $record->id)->update(['is_default' => false]);
        $record->update(['is_default' => true, 'is_active' => true, 'active' => true]);

        return response()->json($this->serializeRecord($record->refresh()));
    }

    public function activate(Request $request, string $id): JsonResponse
    {
        $this->checkAccess($request, 'update');
        $record = SmsConfig::query()->findOrFail($id);
        $record->update(['is_active' => true, 'active' => true]);

        return response()->json($this->serializeRecord($record->refresh()));
    }

    public function deactivate(Request $request, string $id): JsonResponse
    {
        $this->checkAccess($request, 'update');
        $record = SmsConfig::query()->findOrFail($id);
        $record->update(['is_active' => false, 'active' => false, 'is_default' => false]);

        return response()->json($this->serializeRecord($record->refresh()));
    }

    public function testSend(Request $request, string $id, SmsSender $smsSender): JsonResponse
    {
        $this->checkAccess($request, 'test');
        $config = SmsConfig::query()->findOrFail($id);
        $data = $request->validate([
            'to' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:80'],
            'message' => ['nullable', 'string', 'max:1600'],
        ]);

        $result = $smsSender->test(
            $config,
            $data['phone'] ?? $data['to'] ?? $config->test_phone ?? '',
            $data['message'] ?? $config->test_message ?? 'KiteLedger SMS test message.'
        );

        return response()->json([
            'success' => $result->success,
            'provider' => $result->provider,
            'provider_message_id' => $result->providerMessageId,
            'provider_response' => $result->providerResponse,
            'error' => $result->error,
        ], $result->success ? 200 : 422);
    }

    public function summary(): JsonResponse
    {
        $this->checkAccess(request(), 'index');

        return response()->json([
            'total_configs' => SmsConfig::query()->count(),
            'active_configs' => SmsConfig::query()->where(function ($query) {
                $query->where('is_active', true)->orWhere('active', true);
            })->count(),
            'default_provider' => SmsConfig::query()->where('is_default', true)->value('provider'),
            'failed_sms_today' => SmsLog::query()->where('status', 'failed')->whereDate('created_at', today())->count(),
        ]);
    }

    public function validatePhone(Request $request, SmsPhoneNormalizer $normalizer): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:80'],
            'default_country_code' => ['nullable', 'string', 'max:12'],
        ]);
        $normalized = $normalizer->normalize($data['phone'], $data['default_country_code'] ?? null);

        return response()->json([
            'phone' => $data['phone'],
            'normalized_phone' => $normalized,
            'valid' => $normalizer->isValid($normalized),
        ]);
    }

    private function stripBlankSecrets(array $data): array
    {
        foreach (['auth_token', 'api_key', 'api_secret', 'password'] as $secret) {
            if (array_key_exists($secret, $data) && ($data[$secret] === '' || $data[$secret] === null)) {
                unset($data[$secret]);
            }
        }

        if (array_key_exists('api_base_url', $data) && !array_key_exists('base_url', $data)) {
            $data['base_url'] = $data['api_base_url'];
        }
        if (array_key_exists('is_active', $data)) {
            $data['active'] = $data['is_active'];
        } elseif (array_key_exists('active', $data)) {
            $data['is_active'] = $data['active'];
        }

        return $data;
    }

    private function withProviderRules(array $rules, Request $request, bool $partial = false): array
    {
        $provider = (string) $request->input('provider');
        $required = $partial ? 'sometimes' : 'required';

        if (in_array($provider, ['custom_http', 'custom_post', 'custom_get'], true)) {
            $rules['api_base_url'] = [$required, 'string', 'max:500'];
        }
        if ($provider === 'twilio') {
            $rules['account_sid'] = [$required, 'string', 'max:255'];
            $rules['auth_token'] = [$required, 'string', 'max:2000'];
            $rules['from_number'] = [$required, 'string', 'max:80'];
        }
        if ($provider === 'vonage') {
            $rules['api_key'] = [$required, 'string', 'max:2000'];
            $rules['api_secret'] = [$required, 'string', 'max:2000'];
        }

        return $rules;
    }
}
