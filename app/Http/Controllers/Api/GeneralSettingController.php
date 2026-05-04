<?php

namespace App\Http\Controllers\Api;

use App\Models\GeneralSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class GeneralSettingController extends BaseCrudApiController
{
    protected string $modelClass = GeneralSetting::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['key', 'value', 'group'];

    protected array $filterable = ['group', 'key'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'key', 'group', 'created_at', 'updated_at'];

    protected string $defaultSort = 'key';

    protected array $storeRules = [
        'key' => ['required', 'string', 'max:120'],
        'value' => ['nullable', 'string'],
        'group' => ['nullable', 'string', 'max:80'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'key' => ['sometimes', 'required', 'string', 'max:120'],
            'value' => ['sometimes', 'nullable', 'string'],
            'group' => ['sometimes', 'nullable', 'string', 'max:80'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
