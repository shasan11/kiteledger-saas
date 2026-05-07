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
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
            'modules' => ['nullable', 'array'],
            'modules.*' => [
                'string',
                Rule::in([
                    'master',
                    'crm',
                    'accounting',
                    'sales',
                    'purchase',
                    'inventory',
                    'pos',
                    'hrm',
                    'project',
                    'reports',
                ]),
            ],
        ]);

        return response()->json(
            $this->globalSearchService->search($request, $validated)
        );
    }
}
