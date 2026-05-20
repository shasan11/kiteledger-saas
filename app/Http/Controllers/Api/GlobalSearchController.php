<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GlobalSearchService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GlobalSearchController extends Controller
{
    public function __construct(
        protected GlobalSearchService $globalSearchService
    ) {
    }

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:120'],
            'branch_id' => ['nullable', 'string'],
            'fiscal_year_id' => ['nullable', 'string'],
            'date_scope' => ['nullable', Rule::in(['business_date', 'created_at', 'updated_at'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
            'modules' => ['nullable', 'array'],
            'include_pages' => ['nullable', 'boolean'],
            'include_records' => ['nullable', 'boolean'],
            'include_settings' => ['nullable', 'boolean'],
            'include_reports' => ['nullable', 'boolean'],
            'include_actions' => ['nullable', 'boolean'],
            'modules.*' => [
                'string',
                Rule::in([
                    'dashboard',
                    'master',
                    'settings',
                    'crm',
                    'accounting',
                    'sales',
                    'purchase',
                    'inventory',
                    'warehouse',
                    'manufacturing',
                    'pos',
                    'hrm',
                    'payroll',
                    'project',
                    'tax',
                    'reports',
                    'system',
                ]),
            ],
        ]);

        return response()->json(
            $this->globalSearchService->search($request, $validated)
        );
    }
}
