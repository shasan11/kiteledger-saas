<?php

namespace App\Http\Controllers\Api;

use App\Models\SmsConfig;
use App\Services\SmsService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsConfigController extends BaseCrudApiController
{
    protected string $modelClass = SmsConfig::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = false;

    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];

    protected array $searchable = ['name', 'provider', 'from_number', 'sender_id'];
    protected array $filterable = ['provider', 'active', 'is_default', 'branch_id'];
    protected array $booleanFilters = ['active', 'is_default'];
    protected array $sortable = ['id', 'name', 'provider', 'active', 'is_default', 'created_at', 'updated_at'];
    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:120'],
        'provider' => ['required', 'in:twilio,infobip'],
        'account_sid' => ['nullable', 'string', 'max:255'],
        'auth_token' => ['nullable', 'string', 'max:255'],
        'from_number' => ['nullable', 'string', 'max:60'],
        'api_key' => ['nullable', 'string', 'max:255'],
        'base_url' => ['nullable', 'url', 'max:255'],
        'sender_id' => ['nullable', 'string', 'max:60'],
        'active' => ['nullable', 'boolean'],
        'is_default' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        return $this->stripBlankSecrets($parentData);
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        return $this->stripBlankSecrets($parentData);
    }

    /**
     * Empty-string secret fields on update should never overwrite a stored
     * credential — that lets the UI re-save a row without re-typing the token.
     * A non-empty string is treated as an explicit replacement.
     */
    private function stripBlankSecrets(array $data): array
    {
        foreach (['auth_token', 'api_key'] as $secret) {
            if (array_key_exists($secret, $data) && ($data[$secret] === '' || $data[$secret] === null)) {
                unset($data[$secret]);
            }
        }

        return $data;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        // Only one row may be is_default=true at a time.
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

        $data['has_auth_token'] = !empty($record->getAttribute('auth_token'));
        $data['has_api_key'] = !empty($record->getAttribute('api_key'));
        $data['auth_token_masked'] = $data['has_auth_token'] ? '••••••••' : null;
        $data['api_key_masked'] = $data['has_api_key'] ? '••••••••' : null;

        return $data;
    }

    public function testSend(Request $request, string $id, SmsService $smsService): JsonResponse
    {
        $config = SmsConfig::query()->findOrFail($id);

        $data = $request->validate([
            'to' => ['required', 'string', 'max:60'],
            'message' => ['nullable', 'string', 'max:480'],
        ]);

        $result = $smsService->send(
            $data['to'],
            $data['message'] ?? 'KiteLedger SMS test message.',
            $config
        );

        return response()->json([
            'success' => $result->success,
            'provider' => $result->provider,
            'provider_message_id' => $result->providerMessageId,
            'error' => $result->error,
        ], $result->success ? 200 : 422);
    }
}
