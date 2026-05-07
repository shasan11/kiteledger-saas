<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomTemplate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CustomTemplateController extends BaseCrudApiController
{
    protected string $modelClass = CustomTemplate::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'purpose', 'template_key'];

    protected array $filterable = ['purpose'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'purpose', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'purpose' => ['nullable', 'string', 'max:80'],
        'template_key' => ['nullable', 'string', 'max:120'],
        'content' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'purpose' => ['sometimes', 'nullable', 'string', 'max:80'],
            'template_key' => ['sometimes', 'nullable', 'string', 'max:120'],
            'content' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
