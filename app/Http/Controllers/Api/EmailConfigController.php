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
        'mailer'            => ['nullable', 'string', 'max:40'],
        'email_host'        => ['required', 'string', 'max:180'],
        'email_port'        => ['required', 'integer', 'min:1', 'max:65535'],
        'encryption'        => ['nullable', 'string', 'max:20'],
        'email_user'        => ['required', 'string', 'max:180'],
        'email_pass'        => ['required', 'string', 'max:255'],
        'from_name'         => ['nullable', 'string', 'max:120'],
        'from_address'      => ['nullable', 'email', 'max:180'],
        'active'            => ['nullable', 'boolean'],
        'user_add_id'       => ['nullable', 'integer', 'exists:users,id'],
    ];

    public function index(Request $request)
    {
        $this->checkAccess($request, 'index');

        $record = $this->singleConfig();

        return response()->json($record ? $this->serializeRecord($record) : null);
    }

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $record = $this->singleConfig();
        $rules = $record ? $this->makeRulesPartial($this->storeRules) : $this->storeRules;
        $validated = $this->validateCompat($request->all(), $rules);

        if ($record && array_key_exists('email_pass', $validated) && empty($validated['email_pass'])) {
            unset($validated['email_pass']);
        }

        $record = $record ?: new EmailConfig();
        $record->fill($validated);
        $record->save();
        $record->load($this->eagerLoadRelations());

        return response()->json($this->serializeRecord($record), $record->wasRecentlyCreated ? 201 : 200);
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'         => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'email_config_name' => ['sometimes', 'required', 'string', 'max:120'],
            'mailer'            => ['sometimes', 'nullable', 'string', 'max:40'],
            'email_host'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_port'        => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'encryption'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'email_user'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_pass'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'from_name'         => ['sometimes', 'nullable', 'string', 'max:120'],
            'from_address'      => ['sometimes', 'nullable', 'email', 'max:180'],
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

    protected function singleConfig(): ?EmailConfig
    {
        return EmailConfig::query()
            ->with($this->eagerLoadRelations())
            ->orderByDesc('active')
            ->orderBy('created_at')
            ->first();
    }
}
