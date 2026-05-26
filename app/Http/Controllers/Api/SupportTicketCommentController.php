<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketCommentController extends Controller
{
    public function index(Request $request, string $ticketId): JsonResponse
    {
        $ticket = SupportTicket::query()->findOrFail($ticketId);

        $query = $ticket->comments()
            ->with('user')
            ->orderBy('created_at', 'asc');

        $user = $request->user();
        $canSeeInternal = $user
            && ($user->hasRole('Super Admin') || $user->can('support.ticket.assign'));

        if (!$canSeeInternal) {
            $query->where('is_internal', false);
        }

        return response()->json($query->get());
    }

    public function store(Request $request, string $ticketId): JsonResponse
    {
        $ticket = SupportTicket::query()->findOrFail($ticketId);

        $validated = $request->validate([
            'body' => ['required', 'string'],
            'is_internal' => ['nullable', 'boolean'],
            'type' => ['nullable', 'string', 'in:' . implode(',', SupportTicketComment::TYPES)],
        ]);

        $isInternal = filter_var($validated['is_internal'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $comment = $ticket->comments()->create([
            'user_id' => auth()->id(),
            'type' => $validated['type'] ?? ($isInternal ? 'internal_note' : 'public_reply'),
            'body' => $validated['body'],
            'is_internal' => $isInternal,
        ]);

        $ticket->update(['last_activity_at' => now()]);

        if (!$isInternal && !$ticket->first_response_at && $ticket->created_by_id !== auth()->id()) {
            $ticket->update(['first_response_at' => now()]);
        }

        return response()->json($comment->load('user'), 201);
    }

    public function destroy(Request $request, string $ticketId, string $commentId): JsonResponse
    {
        $comment = SupportTicketComment::query()
            ->where('support_ticket_id', $ticketId)
            ->findOrFail($commentId);

        $user = $request->user();
        $isOwner = $comment->user_id && $comment->user_id === $user?->id;
        $isAdmin = $user && ($user->hasRole('Super Admin') || $user->can('support.ticket_comment.delete'));

        abort_unless($isOwner || $isAdmin, 403, 'You cannot delete this comment.');

        $comment->delete();

        return response()->json(['message' => 'Comment deleted.']);
    }
}
