<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomField;
use App\Models\CustomFieldChoice;
use App\Models\CustomFieldModule;
use App\Models\CustomFieldValidation;
use App\Models\CustomFieldValue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CustomFieldController extends BaseCrudApiController
{
    protected string $modelClass = CustomField::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'customFieldChoices',
        'customFieldValidations',
        'customFieldModules',
    ];

    protected array $searchable = ['name', 'key', 'placeholder', 'help_text'];

    protected array $filterable = ['field_type'];

    protected array $booleanFilters = ['active', 'is_required', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'key', 'field_type', 'sort_order', 'created_at', 'updated_at'];

    protected string $defaultSort = 'sort_order';

    protected array $nested = [
        'choices' => [
            'relation' => 'customFieldChoices',
            'model' => CustomFieldChoice::class,
            'foreign_key' => 'custom_field_id',
            'delete_key' => 'deleted_choice_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'label' => ['required', 'string', 'max:120'],
                'value' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'label' => ['required', 'string', 'max:120'],
                'value' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
        'validations' => [
            'relation' => 'customFieldValidations',
            'model' => CustomFieldValidation::class,
            'foreign_key' => 'custom_field_id',
            'delete_key' => 'deleted_validation_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'rule' => ['required', 'in:min,max,min_length,max_length,regex,email,url,numeric,integer,decimal,date,before,after,in,not_in'],
                'value' => ['nullable', 'string', 'max:255'],
                'message' => ['nullable', 'string', 'max:255'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'rule' => ['required', 'in:min,max,min_length,max_length,regex,email,url,numeric,integer,decimal,date,before,after,in,not_in'],
                'value' => ['nullable', 'string', 'max:255'],
                'message' => ['nullable', 'string', 'max:255'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
        'modules' => [
            'relation' => 'customFieldModules',
            'model' => CustomFieldModule::class,
            'foreign_key' => 'custom_field_id',
            'delete_key' => 'deleted_module_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'module' => ['required', 'in:sales_invoice,quotation,sales_order,credit_note,customer_payment,quick_receipt,purchase_order,purchase_bill,expense,debit_note,supplier_payment,quick_payment,journal_voucher,cash_transfer,production_order,production_journal,contact,lead,deal,crm_activity,product,employee,project'],
                'active' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'module' => ['required', 'in:sales_invoice,quotation,sales_order,credit_note,customer_payment,quick_receipt,purchase_order,purchase_bill,expense,debit_note,supplier_payment,quick_payment,journal_voucher,cash_transfer,production_order,production_journal,contact,lead,deal,crm_activity,product,employee,project'],
                'active' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'key' => ['required', 'string', 'max:120', 'unique:custom_fields,key'],
        'field_type' => ['required', 'in:text,textarea,number,decimal,date,datetime,time,select,multiselect,checkbox,radio,email,phone,url,file,boolean'],
        'placeholder' => ['nullable', 'string', 'max:180'],
        'help_text' => ['nullable', 'string', 'max:255'],
        'default_value' => ['nullable', 'string', 'max:255'],
        'is_required' => ['nullable', 'boolean'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'key' => ['sometimes', 'required', 'string', 'max:120', 'unique:custom_fields,key,' . $record->id . ',id'],
            'field_type' => ['sometimes', 'required', 'in:text,textarea,number,decimal,date,datetime,time,select,multiselect,checkbox,radio,email,phone,url,file,boolean'],
            'placeholder' => ['sometimes', 'nullable', 'string', 'max:180'],
            'help_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'default_value' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_required' => ['sometimes', 'nullable', 'boolean'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
