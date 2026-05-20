<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppContextService;
use Illuminate\Http\Request;

class AppContextController extends Controller
{
    public function __construct(private readonly AppContextService $contextService)
    {
    }

    public function show(Request $request)
    {
        return response()->json($this->contextService->context($request));
    }

    public function setBranch(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'string'],
        ]);

        return response()->json(
            $this->contextService->setBranch($request, $validated['branch_id'])
        );
    }

    public function setFiscalYear(Request $request)
    {
        $validated = $request->validate([
            'fiscal_year_id' => ['required', 'uuid', 'exists:fiscal_years,id'],
        ]);

        return response()->json(
            $this->contextService->setFiscalYear($request, $validated['fiscal_year_id'])
        );
    }
}
