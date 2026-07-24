<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogPost;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\PlatformSetting;
use App\Models\Central\SupportTicket;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use App\Models\Central\WebsitePage;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $term = trim($request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q']);
        $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $term).'%';
        $results = collect();
        Tenant::where(fn ($q) => $q->where('company_name', 'like', $like)->orWhere('owner_name', 'like', $like)->orWhere('owner_email', 'like', $like)->orWhereHas('domains', fn ($domainQuery) => $domainQuery->where('domain', 'like', $like)))->with('domains')->limit(6)->get()->each(fn ($row) => $results->push(['type' => 'Tenant', 'title' => $row->company_name, 'subtitle' => $row->owner_email, 'url' => route('central.tenants.show', $row)]));
        TenantInvoice::where('invoice_number', 'like', $like)->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Invoice', 'title' => $row->invoice_number, 'subtitle' => $row->tenant_id, 'url' => route('central.invoices.index', ['search' => $row->invoice_number])]));
        PaymentTransaction::where(fn ($q) => $q->where('reference', 'like', $like)->orWhere('gateway_transaction_id', 'like', $like))->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Payment', 'title' => $row->reference ?: '#'.$row->id, 'subtitle' => $row->tenant_id, 'url' => route('central.payments.index', ['search' => $row->reference ?: $row->id])]));
        SupportTicket::where(fn ($q) => $q->where('ticket_number', 'like', $like)->orWhere('subject', 'like', $like)->orWhere('requester_email', 'like', $like))->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Ticket', 'title' => $row->ticket_number.' · '.$row->subject, 'subtitle' => $row->requester_email, 'url' => route('central.support.tickets.show', $row)]));
        BlogPost::where(fn ($q) => $q->where('title', 'like', $like)->orWhere('slug', 'like', $like))->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Blog post', 'title' => $row->title, 'subtitle' => $row->status, 'url' => route('central.blog.edit', $row)]));
        WebsitePage::where(fn ($q) => $q->where('title', 'like', $like)->orWhere('slug', 'like', $like))->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Page', 'title' => $row->title, 'subtitle' => $row->status, 'url' => route('central.website.pages.index', ['search' => $row->slug])]));
        PlatformSetting::where(fn ($q) => $q->where('label', 'like', $like)->orWhere('key', 'like', $like))->limit(5)->get()->each(fn ($row) => $results->push(['type' => 'Setting', 'title' => $row->label, 'subtitle' => $row->group, 'url' => route('central.settings.index', ['group' => $row->group])]));

        return response()->json(['data' => $results->take(30)->values()]);
    }
}
