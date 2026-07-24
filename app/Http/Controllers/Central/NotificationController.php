<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $query = CentralNotification::where('admin_id', $request->user('central')->id)->whereNull('dismissed_at');
        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }
        foreach (['category', 'severity'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->string($filter));
            }
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date('date_to'));
        }

        return Inertia::render('Central/Notifications/Index', ['notifications' => $query->latest()->paginate(30)->withQueryString(), 'filters' => $request->only('unread', 'category', 'severity', 'date_from', 'date_to')]);
    }

    public function read(Request $request, CentralNotification $notification)
    {
        abort_unless($notification->admin_id === $request->user('central')->id, 403);
        $notification->update(['read_at' => $notification->read_at ?: now()]);

        return back();
    }

    public function readAll(Request $request)
    {
        CentralNotification::where('admin_id', $request->user('central')->id)->whereNull('read_at')->update(['read_at' => now()]);

        return back()->with('success', 'All notifications marked as read.');
    }

    public function dismiss(Request $request, CentralNotification $notification)
    {
        abort_unless($notification->admin_id === $request->user('central')->id, 403);
        $notification->update(['dismissed_at' => now()]);

        return back();
    }

    public function bulk(Request $request)
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:100'], 'ids.*' => ['uuid'], 'action' => ['required', 'in:read,dismiss']]);
        $query = CentralNotification::where('admin_id', $request->user('central')->id)->whereIn('id', $data['ids']);
        $data['action'] === 'read' ? $query->update(['read_at' => now()]) : $query->update(['dismissed_at' => now()]);

        return back()->with('success', 'Notifications updated.');
    }
}
