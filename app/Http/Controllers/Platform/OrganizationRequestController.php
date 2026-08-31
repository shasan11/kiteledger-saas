<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Central\OrganizationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationRequestController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Platform/Requests/Index', [
            'requests' => OrganizationRequest::query()
                ->where('central_user_id', $request->user('platform')->getKey())
                ->latest()->get(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Platform/Requests/Create', [
            'defaults' => [
                'contact_email' => $request->user('platform')->email,
                'contact_phone' => $request->user('platform')->phone,
                'country' => $request->user('platform')->country,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'size:2'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        OrganizationRequest::create(array_merge($data, [
            'central_user_id' => $request->user('platform')->getKey(),
            'status' => 'pending',
        ]));

        return redirect()->route('central.account.requests.index')->with('success', 'Your organization request has been submitted.');
    }
}
