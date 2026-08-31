<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralUserInvitation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortalInvitationController extends Controller
{
    public function index(Request $request): Response
    {
        $invitations = CentralUserInvitation::query()
            ->with('tenant:id,company_name')
            ->where('email', $request->user('platform')->email)
            ->latest()->get()
            ->map(fn (CentralUserInvitation $invitation): array => [
                'id' => $invitation->getKey(),
                'organization' => $invitation->tenant?->company_name,
                'role' => $invitation->role?->label(),
                'status' => $invitation->status(),
                'created_at' => $invitation->created_at,
                'expires_at' => $invitation->expires_at,
                'accepted_at' => $invitation->accepted_at,
            ]);

        return Inertia::render('Platform/Invitations/Index', ['invitations' => $invitations]);
    }
}
