<?php

namespace App\Http\Controllers\Api;

use App\Models\PrintingTemplate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PrintingTemplateController extends BaseCrudApiController
{
    protected string $modelClass = PrintingTemplate::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'document_type', 'template_key'];

    protected array $filterable = ['document_type'];

    protected array $booleanFilters = ['active', 'is_default', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'document_type', 'is_default', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'document_type' => ['required', 'string', 'max:80'],
        'template_key' => ['nullable', 'string', 'max:120'],
        'template_html' => ['nullable', 'string'],
        'template_css' => ['nullable', 'string'],
        'is_default' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'document_type' => ['sometimes', 'required', 'string', 'max:80'],
            'template_key' => ['sometimes', 'nullable', 'string', 'max:120'],
            'template_html' => ['sometimes', 'nullable', 'string'],
            'template_css' => ['sometimes', 'nullable', 'string'],
            'is_default' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        $parentData['document_type'] = $parentData['document_type'] ?: 'general';
        $parentData['template_key'] = $parentData['template_key'] ?: $this->templateKeyFromName($parentData['name'] ?? 'template');
        $parentData['active'] = $parentData['active'] ?? true;

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (array_key_exists('document_type', $parentData) && !$parentData['document_type']) {
            $parentData['document_type'] = $record->document_type ?: 'general';
        }

        if (array_key_exists('template_key', $parentData) && !$parentData['template_key']) {
            $parentData['template_key'] = $record->template_key ?: $this->templateKeyFromName($parentData['name'] ?? $record->name ?? 'template');
        }

        return $parentData;
    }

    protected function templateKeyFromName(string $name): string
    {
        return Str::slug($name, '_') ?: 'template';
    }
}
