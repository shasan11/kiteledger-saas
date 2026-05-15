<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('App/Reports/Index', $this->sharedProps());
    }

    public function show(Request $request, string $component): Response
    {
        return Inertia::render($component, $this->sharedProps());
    }

    protected function sharedProps(): array
    {
        return [
            'reportOptions' => [
                'branches' => Branch::query()->orderBy('name')->get(['id', 'name', 'code']),
                'currencies' => Currency::query()->orderBy('code')->get(['id', 'name', 'code', 'symbol']),
                'customers' => Contact::query()->where('contact_type', 'customer')->orderBy('name')->get(['id', 'name', 'code', 'pan', 'tax_registration_no']),
                'suppliers' => Contact::query()->where('contact_type', 'supplier')->orderBy('name')->get(['id', 'name', 'code', 'pan', 'tax_registration_no']),
                'products' => Product::query()->orderBy('name')->get(['id', 'name', 'code', 'sku', 'barcode']),
                'productCategories' => ProductCategory::query()->orderBy('name')->get(['id', 'name']),
                'warehouses' => Warehouse::query()->orderBy('name')->get(['id', 'name', 'code']),
                'chartOfAccounts' => ChartOfAccount::query()->orderBy('code')->get(['id', 'name', 'code', 'type']),
                'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
                'users' => User::query()->orderBy('name')->get(['id', 'name', 'branch_id', 'department_id']),
                'employees' => EmployeeProfile::query()->with('user:id,name')->get(['id', 'user_id', 'employee_id', 'branch_id', 'department_id']),
            ],
        ];
    }
}
