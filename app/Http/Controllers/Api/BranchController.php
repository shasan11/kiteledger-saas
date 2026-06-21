<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BranchController extends BaseCrudApiController
{
    protected string $modelClass = Branch::class;

    protected ?string $permissionPrefix = 'system.branch';

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['code', 'name', 'phone', 'email', 'address'];

    protected array $filterable = [];

    protected array $booleanFilters = [
        'active',
        'is_head_office',
        'is_transaction_enabled',
        'is_pos_enabled',
        'is_warehouse_enabled',
        'is_ai_enabled',
        'is_billing_location_enabled',
        'abbreviated_tax_enabled',
        'track_location',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'code',
        'name',
        'is_head_office',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'code' => ['nullable', 'string', 'max:30', 'unique:branches,code'],
        'name' => ['required', 'string', 'max:120'],
        'phone' => ['nullable', 'string', 'max:40'],
        'email' => ['nullable', 'email', 'max:120'],
        'address' => ['nullable', 'string'],
        'is_head_office' => ['nullable', 'boolean'],
        'is_transaction_enabled' => ['nullable', 'boolean'],
        'is_pos_enabled' => ['nullable', 'boolean'],
        'is_warehouse_enabled' => ['nullable', 'boolean'],
        'is_ai_enabled' => ['nullable', 'boolean'],
        'is_billing_location_enabled' => ['nullable', 'boolean'],
        'abbreviated_tax_enabled' => ['nullable', 'boolean'],
        'track_location' => ['nullable', 'boolean'],
        'logo' => ['nullable', 'string', 'max:255'],
        'favicon' => ['nullable', 'string', 'max:255'],
        'language_id' => ['nullable', 'uuid', 'exists:languages,id'],
        'enabled_languages' => ['nullable', 'array'],
        'enabled_languages.*' => ['string', 'exists:languages,code'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'code' => ['sometimes', 'required', 'string', 'max:30', 'unique:branches,code,' . $record->id . ',id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string'],
            'is_head_office' => ['sometimes', 'nullable', 'boolean'],
            'is_transaction_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_pos_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_warehouse_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_ai_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_billing_location_enabled' => ['sometimes', 'nullable', 'boolean'],
            'abbreviated_tax_enabled' => ['sometimes', 'nullable', 'boolean'],
            'track_location' => ['sometimes', 'nullable', 'boolean'],
            'logo' => ['sometimes', 'nullable', 'string', 'max:255'],
            'favicon' => ['sometimes', 'nullable', 'string', 'max:255'],
            'language_id' => ['sometimes', 'nullable', 'uuid', 'exists:languages,id'],
            'enabled_languages' => ['sometimes', 'nullable', 'array'],
            'enabled_languages.*' => ['string', 'exists:languages,code'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $code = isset($parentData['code']) ? trim((string) $parentData['code']) : '';

        if ($code === '') {
            $parentData['code'] = $this->generateBranchCode();
        }

        return $parentData;
    }

    /**
     * Generate a BR-001 style branch code. Uses the current max numeric suffix
     * on rows matching the BR-### shape and retries on the unlikely event of a
     * race-condition collision (the code column has a unique index).
     */
    private function generateBranchCode(): string
    {
        $highest = Branch::query()
            ->where('code', 'like', 'BR-%')
            ->get(['code'])
            ->map(function ($row) {
                if (preg_match('/^BR-(\d+)$/', (string) $row->code, $m)) {
                    return (int) $m[1];
                }
                return 0;
            })
            ->max();

        $next = (int) ($highest ?? 0) + 1;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $candidate = sprintf('BR-%03d', $next + $attempt);
            if (!Branch::query()->where('code', $candidate)->exists()) {
                return $candidate;
            }
        }

        return 'BR-' . str_pad((string) ($next + 10), 3, '0', STR_PAD_LEFT);
    }
}
