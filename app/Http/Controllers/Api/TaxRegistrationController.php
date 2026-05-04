<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxRegistration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxRegistrationController extends BaseCrudApiController
{
    protected string $modelClass = TaxRegistration::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['taxJurisdiction'];

    protected array $relationDetails = [
        'taxJurisdiction' => 'tax_jurisdiction_id',
    ];

    protected array $searchable = ['registration_no', 'legal_name'];

    protected array $filterable = ['tax_jurisdiction_id', 'registration_type'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'effective_from' => ['from' => 'effective_from_start', 'to' => 'effective_from_end'],
    ];

    protected array $sortable = ['id', 'registration_no', 'legal_name', 'effective_from', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
        'registration_type' => ['required', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id'],
        'registration_no' => ['required', 'string', 'max:80'],
        'legal_name' => ['nullable', 'string', 'max:180'],
        'effective_from' => ['nullable', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'tax_jurisdiction_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_jurisdictions,id'],
            'registration_type' => ['sometimes', 'required', 'in:pan,vat,gstin,tan,ein,sales_tax_permit,state_tax_id'],
            'registration_no' => ['sometimes', 'required', 'string', 'max:80'],
            'legal_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:effective_from'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
