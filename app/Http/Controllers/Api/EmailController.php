<?php

namespace App\Http\Controllers\Api;

use App\Models\Email;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EmailController extends BaseCrudApiController
{
    protected string $modelClass = Email::class;

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
        'sender_email',
        'receiver_email',
        'subject',
        'body',
        'branch.name',
    ];

    protected array $filterable = [
        'branch_id',
        'email_status',
    ];

    protected array $booleanFilters = ['active'];

    protected array $sortable = [
        'id', 'sender_email', 'receiver_email', 'subject',
        'email_status', 'branch_id', 'active', 'created_at', 'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id'      => ['nullable', 'uuid', 'exists:branches,id'],
        'sender_email'   => ['required', 'email', 'max:180'],
        'receiver_email' => ['required', 'email', 'max:180'],
        'subject'        => ['required', 'string', 'max:255'],
        'body'           => ['nullable', 'string'],
        'email_status'   => ['nullable', 'string', 'in:PENDING,SENT,FAILED'],
        'active'         => ['nullable', 'boolean'],
        'user_add_id'    => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'      => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'sender_email'   => ['sometimes', 'required', 'email', 'max:180'],
            'receiver_email' => ['sometimes', 'required', 'email', 'max:180'],
            'subject'        => ['sometimes', 'required', 'string', 'max:255'],
            'body'           => ['sometimes', 'nullable', 'string'],
            'email_status'   => ['sometimes', 'nullable', 'string', 'in:PENDING,SENT,FAILED'],
            'active'         => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'    => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
