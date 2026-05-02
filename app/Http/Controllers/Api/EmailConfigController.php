<?php

namespace App\Http\Controllers\Api;

use App\Models\EmailConfig;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EmailConfigController extends BaseCrudApiController
{
    protected string $modelClass = EmailConfig::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch'];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'email_config_name',
        'email_host',
        'email_user',
        'branch.name',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = ['active'];

    protected array $sortable = [
        'id', 'email_config_name', 'email_host', 'email_port',
        'email_user', 'branch_id', 'active', 'created_at', 'updated_at',
    ];

    protected string $defaultSort = 'email_config_name';

    protected array $storeRules = [
        'branch_id'         => ['nullable', 'uuid', 'exists:branches,id'],
        'email_config_name' => ['required', 'string', 'max:120'],
        'email_host'        => ['required', 'string', 'max:180'],
        'email_port'        => ['required', 'integer', 'min:1', 'max:65535'],
        'email_user'        => ['required', 'string', 'max:180'],
        'email_pass'        => ['required', 'string', 'max:255'],
        'active'            => ['nullable', 'boolean'],
        'user_add_id'       => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'         => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'email_config_name' => ['sometimes', 'required', 'string', 'max:120'],
            'email_host'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_port'        => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'email_user'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_pass'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'active'            => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'       => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        unset($data['email_pass']);
        return $data;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (array_key_exists('email_pass', $parentData) && empty($parentData['email_pass'])) {
            unset($parentData['email_pass']);
        }
        return $parentData;
    }
}
