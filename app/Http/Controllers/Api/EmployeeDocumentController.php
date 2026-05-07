<?php

namespace App\Http\Controllers\Api;

use App\Models\EmployeeDocument;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EmployeeDocumentController extends BaseCrudApiController
{
    protected string $modelClass = EmployeeDocument::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['user', 'branch', 'userAdd'];
    protected array $relationDetails = [
        'user'    => 'user_id',
        'branch'  => 'branch_id',
        'userAdd' => 'user_add_id',
    ];

    protected array $searchable = [
        'title',
        'document_type',
        'notes',
        'user.first_name',
        'user.last_name',
        'user.email',
    ];

    protected array $filterable = ['user_id', 'branch_id', 'document_type'];
    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'issue_date'  => ['from' => 'issue_date_from',  'to' => 'issue_date_to'],
        'expiry_date' => ['from' => 'expiry_date_from', 'to' => 'expiry_date_to'],
    ];

    protected array $sortable = [
        'id', 'user_id', 'title', 'document_type', 'issue_date', 'expiry_date', 'active', 'created_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'user_id'       => ['required', 'integer', 'exists:users,id'],
        'branch_id'     => ['nullable', 'uuid', 'exists:branches,id'],
        'title'         => ['required', 'string', 'max:180'],
        'document_type' => ['nullable', 'string', 'max:80'],
        'file_path'     => ['nullable', 'string', 'max:500'],
        'issue_date'    => ['nullable', 'date'],
        'expiry_date'   => ['nullable', 'date'],
        'notes'         => ['nullable', 'string'],
        'active'        => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id'       => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'branch_id'     => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'title'         => ['sometimes', 'required', 'string', 'max:180'],
            'document_type' => ['sometimes', 'nullable', 'string', 'max:80'],
            'file_path'     => ['sometimes', 'nullable', 'string', 'max:500'],
            'issue_date'    => ['sometimes', 'nullable', 'date'],
            'expiry_date'   => ['sometimes', 'nullable', 'date'],
            'notes'         => ['sometimes', 'nullable', 'string'],
            'active'        => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
