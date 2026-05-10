<?php

namespace App\Http\Controllers\Api;

use App\Models\MasterData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class MasterDataController extends BaseCrudApiController
{
    protected string $modelClass = MasterData::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = [
        'type',
        'group',
        'key',
        'value',
        'meta',
    ];

    protected array $filterable = [
        'type',
        'group',
        'key',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'type',
        'group',
        'key',
        'value',
        'active',
        'is_system_generated',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'value';

    protected array $storeRules = [
        'type' => ['nullable', 'string', 'max:120'],
        'group' => ['nullable', 'string', 'max:80'],
        'key' => ['required', 'string', 'max:120'],
        'value' => ['required', 'string', 'max:180'],
        'meta' => ['nullable'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'type' => ['sometimes', 'nullable', 'string', 'max:120'],
            'group' => ['sometimes', 'nullable', 'string', 'max:80'],
            'key' => ['sometimes', 'required', 'string', 'max:120'],
            'value' => ['sometimes', 'required', 'string', 'max:180'],
            'meta' => ['sometimes', 'nullable'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        return $this->normalizeMasterData($parentData);
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $parentData = parent::mutateParentDataBeforeUpdate(
            $parentData,
            $nestedData,
            $record
        );

        return $this->normalizeMasterData($parentData);
    }

    protected function normalizeMasterData(array $data): array
    {
        if (array_key_exists('key', $data)) {
            $data['key'] = $this->normalizeSlugLikeValue($data['key']);
        }

        if (array_key_exists('type', $data)) {
            $data['type'] = $this->normalizeSlugLikeValue($data['type']);
        }

        if (empty($data['type']) && !empty($data['key'])) {
            $data['type'] = $data['key'];
        }

        if (array_key_exists('group', $data) && is_string($data['group'])) {
            $data['group'] = trim($data['group']) ?: null;
        }

        if (array_key_exists('value', $data) && is_string($data['value'])) {
            $data['value'] = trim($data['value']);
        }

        if (array_key_exists('meta', $data)) {
            if (is_array($data['meta']) || is_object($data['meta'])) {
                $data['meta'] = json_encode($data['meta']);
            }

            if (is_string($data['meta'])) {
                $data['meta'] = trim($data['meta']) ?: null;
            }
        }

        return $data;
    }

    protected function normalizeSlugLikeValue(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $value = trim($value);
        $value = strtolower($value);
        $value = str_replace([' ', '-'], '_', $value);

        return $value ?: null;
    }
}