<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\WebsiteLead;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class WebsiteLeadController extends Controller
{
    public function store(Request $request)
    {
        abort_if($request->filled('website'), 422, 'Unable to accept this request.');
        $data = $request->validate([
            'type' => ['required', Rule::in(['contact', 'demo', 'newsletter'])],
            'name' => ['required_unless:type,newsletter', 'nullable', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255'], 'company' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:60'], 'company_size' => ['nullable', 'string', 'max:60'],
            'message' => ['nullable', 'string', 'max:5000'], 'source' => ['nullable', 'string', 'max:120'],
            'privacy_consent' => ['accepted'],
        ]);
        unset($data['privacy_consent']);
        $data['name'] ??= 'Newsletter subscriber';
        $data['metadata'] = ['ip_hash' => hash('sha256', (string) $request->ip().config('app.key')), 'user_agent' => mb_substr((string) $request->userAgent(), 0, 500)];
        WebsiteLead::create($data);

        return back()->with('success', 'Thanks — your message is safely with our team.');
    }

    public function index(Request $request)
    {
        $query = WebsiteLead::with('assignee:id,name');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('email', 'like', $term)->orWhere('company', 'like', $term));
        }

        return Inertia::render('Central/Website/Leads', ['leads' => $query->latest()->paginate(30)->withQueryString(), 'filters' => $request->only('search', 'status')]);
    }

    public function update(Request $request, WebsiteLead $lead, CentralAuditService $audit)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['new', 'contacted', 'qualified', 'won', 'closed'])], 'notes' => ['nullable', 'string', 'max:5000']]);
        $before = $lead->toArray();
        if ($data['status'] === 'contacted' && ! $lead->contacted_at) {
            $data['contacted_at'] = now();
        }
        $lead->update($data);
        $audit->log($request, 'website.lead_updated', $lead, $before, $lead->fresh()->toArray());

        return back()->with('success', 'Lead updated.');
    }

    public function export()
    {
        return response()->streamDownload(function (): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Created', 'Type', 'Name', 'Email', 'Company', 'Phone', 'Status', 'Message']);
            WebsiteLead::latest()->chunk(500, fn ($leads) => $leads->each(fn ($lead) => fputcsv($stream, [$lead->created_at, $lead->type, $lead->name, $lead->email, $lead->company, $lead->phone, $lead->status, $lead->message])));
            fclose($stream);
        }, 'kiteledger-website-leads-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }
}
