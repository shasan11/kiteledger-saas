<?php

namespace App\Http\Controllers;

use App\Services\Reports\ReportRegistry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('App/Reports/Index', $this->sharedProps($request));
    }

    public function showReport(Request $request, string $category, string $slug): Response
    {
        $meta = ReportRegistry::resolve($category, $slug);
        abort_unless($meta, 404);

        return Inertia::render('App/Reports/Shared/ReportPage', array_merge(
            $this->sharedProps($request),
            [
                'reportCategory' => $category,
                'reportKey' => $slug,
                'reportConfig' => [
                    'category' => $category,
                    'category_label' => $meta['category_label'],
                    'report_key' => $slug,
                    'title' => $meta['title'],
                    'description' => $meta['description'] ?? '',
                    'permission' => $meta['permission'],
                    'route_path' => $meta['route_path'],
                    'default_date_mode' => $meta['default_date_mode'] ?? ReportRegistry::DATE_MODE_PERIOD,
                    'filter_schema' => $meta['filter_schema'] ?? [],
                    'exportable' => $meta['exportable'] ?? true,
                ],
            ]
        ));
    }

    protected function sharedProps(Request $request): array
    {
        $user = $request->user();
        $permissions = $user
            ? $user->getAllPermissions()->pluck('name')->all()
            : [];

        return [
            'reportRegistry' => ReportRegistry::publicRegistry($permissions),
        ];
    }
}
