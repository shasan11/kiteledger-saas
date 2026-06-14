<?php

namespace App\Http\Controllers\Api;

use App\Models\ChequeFormatConfiguration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ChequeFormatConfigurationController extends BaseCrudApiController
{
    protected string $modelClass = ChequeFormatConfiguration::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = [
        'country',
        'format_name',
        'paper_size',
    ];

    protected array $filterable = [
        'country',
        'paper_size',
    ];

    protected array $booleanFilters = [
        'active',
    ];

    protected array $sortable = [
        'country',
        'format_name',
        'paper_size',
        'active',
        'created_at',
    ];

    protected string $defaultSort = 'country';

    protected array $storeRules = [
        'country' => ['required', 'string', 'max:100'],
        'format_name' => ['required', 'string', 'max:150'],
        'paper_size' => ['nullable', 'string', 'max:50'],
        'width' => ['nullable', 'numeric', 'min:0'],
        'height' => ['nullable', 'numeric', 'min:0'],
        'date_position' => ['nullable', 'string', 'max:120'],
        'payee_name_position' => ['nullable', 'string', 'max:120'],
        'amount_number_position' => ['nullable', 'string', 'max:120'],
        'amount_words_position' => ['nullable', 'string', 'max:120'],
        'signature_position' => ['nullable', 'string', 'max:120'],
        'layout_json' => ['nullable', 'array'],
        'layout_json.fields' => ['nullable', 'array'],
        'signature_image' => ['nullable', 'string'],
        'signature_width' => ['nullable', 'integer', 'min:0', 'max:2000'],
        'signature_height' => ['nullable', 'integer', 'min:0', 'max:2000'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['exclude'],
        'user_add_id' => ['exclude'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    /**
     * Return the active/default cheque format (seeding one if none exists).
     * Used by the graphical layout editor.
     */
    public function default(Request $request)
    {
        $format = ChequeFormatConfiguration::activeDefault();

        return response()->json($this->serializeRecord($format));
    }
}
