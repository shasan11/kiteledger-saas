<?php

namespace App\Http\Controllers\Api;

use App\Models\Contact;
use App\Models\ContactGroup;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ContactController extends BaseCrudApiController
{
    protected string $modelClass = Contact::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'contactGroup',
        'creditTerm',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contactGroup' => 'contact_group_id',
        'creditTerm' => 'credit_term_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'phone',
        'email',
        'pan',
        'branch.name',
        'branch.code',
        'contactGroup.name',
        'creditTerm.name',
    ];

    protected array $filterable = [
        'branch_id',
        'contact_group_id',
        'contact_type',
        'credit_term_id',
    ];

    protected array $booleanFilters = [
        'active',
        'accept_purchase',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'contact_type',
        'credit_limit',
        'branch_id',
        'contact_group_id',
        'credit_term_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
        'contact_type' => ['required', 'in:customer,supplier,lead'],
        'name' => ['required', 'string', 'max:180'],
        'code' => ['nullable', 'string', 'max:50'],
        'address' => ['nullable', 'string'],
        'pan' => ['nullable', 'string', 'max:80'],
        'phone' => ['nullable', 'string', 'max:40'],
        'accept_purchase' => ['nullable', 'boolean'],
        'email' => ['nullable', 'email', 'max:120'],
        'credit_term_id' => ['nullable', 'uuid', 'exists:credit_terms,id'],
        'credit_limit' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'contact_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'contact_type' => ['sometimes', 'required', 'in:customer,supplier,lead'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string'],
            'pan' => ['sometimes', 'nullable', 'string', 'max:80'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'accept_purchase' => ['sometimes', 'nullable', 'boolean'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'credit_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        $this->validateContactGroupBranch($parentData);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $data = $parentData;

        if (!array_key_exists('branch_id', $data)) {
            $data['branch_id'] = $record->branch_id;
        }

        $this->validateContactGroupBranch($data);

        return $parentData;
    }

    protected function validateContactGroupBranch(array $data): void
    {
        if (empty($data['contact_group_id'])) {
            return;
        }

        $contactGroup = ContactGroup::query()->find($data['contact_group_id']);

        if (!$contactGroup) {
            return;
        }

        if (
            !empty($data['branch_id'])
            && !empty($contactGroup->branch_id)
            && (string) $contactGroup->branch_id !== (string) $data['branch_id']
        ) {
            abort(422, 'Contact group must belong to the same branch.');
        }
    }
}