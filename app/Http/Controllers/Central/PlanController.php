<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Plan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PlanController extends Controller
{
    public function index()
    {
        return Inertia::render('Central/Plans/Index', ['plans' => Plan::withCount('features')->orderBy('sort_order')->get()]);
    }

    public function create()
    {
        return Inertia::render('Central/Plans/Form');
    }

    public function edit(Plan $plan)
    {
        return Inertia::render('Central/Plans/Form', ['plan' => $plan->load('features')]);
    }

    public function store(Request $request)
    {
        $plan = Plan::create($this->validated($request));

        return redirect()->route('central.plans.edit', $plan);
    }

    public function update(Request $request, Plan $plan)
    {
        $plan->update($this->validated($request, $plan));

        return back();
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        return $request->validate(['name' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', Rule::unique('plans')->ignore($plan)], 'description' => ['nullable', 'string'], 'price_monthly' => ['required', 'numeric', 'min:0'], 'price_yearly' => ['required', 'numeric', 'min:0'], 'currency' => ['required', 'string', 'size:3'], 'trial_days' => ['required', 'integer', 'min:0', 'max:365'], 'sort_order' => ['integer', 'min:0'], 'is_active' => ['boolean'], 'is_featured' => ['boolean'], 'max_users' => ['nullable', 'integer', 'min:0'], 'max_branches' => ['nullable', 'integer', 'min:0'], 'max_products' => ['nullable', 'integer', 'min:0'], 'max_customers' => ['nullable', 'integer', 'min:0'], 'max_invoices_per_month' => ['nullable', 'integer', 'min:0'], 'max_storage_mb' => ['nullable', 'integer', 'min:0'], 'max_ai_requests_per_month' => ['nullable', 'integer', 'min:0'], 'max_api_requests_per_month' => ['nullable', 'integer', 'min:0'], 'max_custom_domains' => ['nullable', 'integer', 'min:0'], 'max_warehouses' => ['nullable', 'integer', 'min:0'], 'allow_pos' => ['boolean'], 'allow_inventory' => ['boolean'], 'allow_hrm' => ['boolean'], 'allow_crm' => ['boolean'], 'allow_warehouse' => ['boolean'], 'allow_ai' => ['boolean'], 'allow_custom_domain' => ['boolean'], 'allow_multi_branch' => ['boolean'], 'allow_api_access' => ['boolean']]);
    }
}
