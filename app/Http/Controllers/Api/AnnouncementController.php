<?php

namespace App\Http\Controllers\Api;

use App\Models\Announcement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AnnouncementController extends BaseCrudApiController
{
    protected string $modelClass = Announcement::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['title', 'description'];

    protected array $filterable = [];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'title', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'title' => ['required', 'string', 'max:200'],
        'description' => ['required', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['sometimes', 'required', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
