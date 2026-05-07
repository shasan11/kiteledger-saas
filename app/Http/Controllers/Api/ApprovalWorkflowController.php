<?php

namespace App\Http\Controllers\Api;

use App\Models\ApprovalWorkflow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ApprovalWorkflowController extends BaseCrudApiController
{
    protected string $modelClass = ApprovalWorkflow::class;
    protected array $relations = ['approverRole', 'approverUser'];
    protected array $relationDetails = ['approverRole' => 'approver_role_id', 'approverUser' => 'approver_user_id'];
    protected array $searchable = ['module', 'document_type'];
    protected array $filterable = ['module', 'document_type', 'approval_mode'];
    protected array $booleanFilters = ['active', 'approval_required', 'is_system_generated'];
    protected array $sortable = ['module', 'document_type', 'approval_required', 'created_at'];
    protected string $defaultSort = 'module';

    protected array $storeRules = [
        'module' => ['required', 'string', 'max:80'],
        'document_type' => ['required', 'string', 'max:80'],
        'approval_required' => ['nullable', 'boolean'],
        'approval_mode' => ['nullable', 'in:SINGLE,MULTI_STEP'],
        'minimum_amount' => ['nullable', 'numeric', 'min:0'],
        'approver_role_id' => ['nullable', 'uuid', 'exists:roles,id'],
        'approver_user_id' => ['nullable', 'integer', 'exists:users,id'],
        'steps' => ['nullable', 'array'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }
}
