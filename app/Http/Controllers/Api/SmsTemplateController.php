<?php

namespace App\Http\Controllers\Api;

use App\Models\SmsTemplate;
use App\Services\Sms\SmsSender;
use App\Services\Sms\SmsTemplateRenderer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SmsTemplateController extends BaseCrudApiController
{
    protected string $modelClass = SmsTemplate::class;
    protected ?string $permissionPrefix = 'sms_template';
    protected array $searchable = ['name', 'code', 'module', 'body'];
    protected array $filterable = ['module', 'code'];
    protected array $booleanFilters = ['is_active', 'active', 'is_system_generated'];
    protected array $sortable = ['name', 'code', 'module', 'created_at', 'updated_at'];
    protected string $defaultSort = 'module';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:160'],
        'code' => ['required', 'string', 'max:120', 'unique:sms_templates,code'],
        'module' => ['nullable', 'string', 'max:80'],
        'subject' => ['nullable', 'string', 'max:180'],
        'internal_title' => ['nullable', 'string', 'max:180'],
        'body' => ['required', 'string', 'max:1600'],
        'variables' => ['nullable', 'array'],
        'is_active' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules);
        $rules['code'] = ['sometimes', 'required', 'string', 'max:120', Rule::unique('sms_templates', 'code')->ignore($record->getKey())];

        return $rules;
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData['created_by'] = auth()->id();
        $parentData['updated_by'] = auth()->id();
        $parentData['active'] = $parentData['is_active'] ?? $parentData['active'] ?? true;
        $parentData['is_active'] = $parentData['active'];

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData['updated_by'] = auth()->id();
        if (array_key_exists('is_active', $parentData)) {
            $parentData['active'] = $parentData['is_active'];
        } elseif (array_key_exists('active', $parentData)) {
            $parentData['is_active'] = $parentData['active'];
        }

        return $parentData;
    }

    public function preview(Request $request, SmsTemplateRenderer $renderer): JsonResponse
    {
        $data = $request->validate([
            'template_code' => ['nullable', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:1600'],
            'data' => ['nullable', 'array'],
        ]);

        $body = $data['body'] ?? SmsTemplate::query()->where('code', $data['template_code'] ?? '')->value('body') ?? '';
        $rendered = $renderer->render($body, $data['data'] ?? []);

        return response()->json([
            'body' => $rendered,
            'characters' => mb_strlen($rendered),
            'segments' => app(SmsSender::class)->segmentCount($rendered),
        ]);
    }
}
