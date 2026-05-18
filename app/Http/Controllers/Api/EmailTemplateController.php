<?php

namespace App\Http\Controllers\Api;

use App\Models\EmailTemplate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EmailTemplateController extends BaseCrudApiController
{
    protected string $modelClass = EmailTemplate::class;
    protected array $searchable = ['module', 'template_key', 'subject'];
    protected array $filterable = ['module', 'template_key'];
    protected array $booleanFilters = ['active', 'is_system_generated'];
    protected array $sortable = ['module', 'template_key', 'subject', 'created_at'];
    protected string $defaultSort = 'module';

    protected array $storeRules = [
        'module' => ['required', 'string', 'max:80'],
        'template_key' => ['required', 'string', 'max:120', 'unique:email_templates,template_key'],
        'subject' => ['required', 'string', 'max:180'],
        'body' => ['required', 'string'],
        'variables' => ['nullable', 'array'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules);
        $rules['template_key'] = ['sometimes', 'required', 'string', 'max:120', 'unique:email_templates,template_key,' . $record->id . ',id'];
        return $rules;
    }
}
