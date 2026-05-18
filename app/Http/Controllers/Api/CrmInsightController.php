<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmAccount;
use App\Models\CrmActivity;
use App\Models\CrmActivityEscalation;
use App\Models\CrmDealStageHistory;
use App\Models\Deal;
use App\Models\Lead;
use App\Services\Crm\CrmInsightService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmInsightController extends Controller
{
    private function userHasFullCrmAccess($user): bool
    {
        return method_exists($user, 'can') && (
            $user->can('crm.manage') ||
            $user->can('crm.*')
        );
    }

    private function leadQuery(Request $request): Builder
    {
        $query = Lead::query();
        $user = $request->user();

        if (!$user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        return $query->where('assigned_to_id', $user->getAuthIdentifier());
    }

    private function dealQuery(Request $request): Builder
    {
        $query = Deal::query();
        $user = $request->user();

        if (!$user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        return $query->where('assigned_to_id', $user->getAuthIdentifier());
    }

    private function activityQuery(Request $request): Builder
    {
        $query = CrmActivity::query();
        $user = $request->user();

        if (!$user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        $userId = $user->getAuthIdentifier();

        return $query->where(function (Builder $query) use ($userId) {
            $query->where('assigned_to_id', $userId)
                ->orWhereHas('lead', fn (Builder $leadQuery) => $leadQuery->where('assigned_to_id', $userId))
                ->orWhereHas('deal', fn (Builder $dealQuery) => $dealQuery->where('assigned_to_id', $userId));
        });
    }

    public function dashboard(Request $request, CrmInsightService $insights)
    {
        return response()->json($insights->dashboard($request->all()));
    }

    public function customerTimeline(string $id, CrmInsightService $insights)
    {
        return response()->json([
            'results' => $insights->timeline(CrmAccount::query()->findOrFail($id)),
        ]);
    }

    public function forecast(Request $request, CrmInsightService $insights)
    {
        return response()->json($insights->forecast($request->all()));
    }

    public function stuckDeals(Request $request, CrmInsightService $insights)
    {
        return response()->json([
            'results' => $insights->stuckDeals((int) $request->query('days', 14)),
        ]);
    }

    public function stageHistory(Request $request, string $id)
    {
        $this->dealQuery($request)->findOrFail($id);

        return response()->json([
            'results' => CrmDealStageHistory::query()
                ->with(['fromStage', 'toStage', 'changedBy'])
                ->where('deal_id', $id)
                ->latest('changed_at')
                ->get(),
        ]);
    }

    public function activityInbox(Request $request, CrmInsightService $insights)
    {
        return response()->json([
            'results' => $insights->activityInbox($request->all()),
        ]);
    }

    public function completeActivity(Request $request, string $id)
    {
        $activity = $this->activityQuery($request)->findOrFail($id);
        $activity->update([
            'status' => 'completed',
            'completed_at' => $request->input('completed_at', now()),
            'outcome' => $request->input('outcome', $activity->outcome),
        ]);

        return response()->json($activity->fresh(['lead', 'deal', 'contact', 'crmAccount']));
    }

    public function rescheduleActivity(Request $request, string $id)
    {
        $data = $request->validate([
            'due_at' => ['required', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $activity = $this->activityQuery($request)->findOrFail($id);
        $activity->update([
            'due_at' => $data['due_at'],
            'reminder_at' => $data['reminder_at'] ?? $activity->reminder_at,
            'status' => $activity->status === 'completed' ? 'pending' : $activity->status,
        ]);

        return response()->json($activity->fresh(['lead', 'deal', 'contact', 'crmAccount']));
    }

    public function escalateOverdue(Request $request)
    {
        $hours = (int) $request->input('activity_overdue_escalation_hours', 24);
        $threshold = now()->subHours(max($hours, 1));

        $activities = CrmActivity::query()
            ->where('due_at', '<=', $threshold)
            ->whereIn('priority', ['high', 'urgent'])
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNull('escalated_at')
            ->get();

        $created = DB::transaction(function () use ($activities, $request) {
            return $activities->map(function (CrmActivity $activity) use ($request) {
                $activity->update([
                    'escalated_at' => now(),
                    'escalated_to' => $request->input('escalated_to'),
                    'escalation_reason' => 'High-priority activity overdue',
                ]);

                return CrmActivityEscalation::query()->create([
                    'activity_id' => $activity->id,
                    'escalated_to' => $request->input('escalated_to'),
                    'escalated_by' => $request->user()?->id,
                    'escalated_at' => now(),
                    'reason' => 'High-priority activity overdue',
                    'status' => 'open',
                ]);
            });
        });

        return response()->json(['count' => $created->count(), 'results' => $created]);
    }

    public function sourceRoi(CrmInsightService $insights)
    {
        return response()->json(['results' => $insights->sourceRoi()]);
    }

    public function quotationPrefill(string $id)
    {
        $deal = Deal::query()->with(['contact', 'lead', 'crmAccount'])->findOrFail($id);

        return response()->json([
            'deal_id' => $deal->id,
            'contact_id' => $deal->contact_id,
            'customer' => $deal->contact,
            'deal' => $deal,
            'currency_id' => null,
            'expected_amount' => $deal->amount,
            'notes' => trim(($deal->title ?: '') . "\n" . ($deal->description ?: '')),
            'lines' => [],
        ]);
    }

    public function convertLead(Request $request, string $id)
    {
        $lead = $this->leadQuery($request)->findOrFail($id);

        if ($lead->converted_at || $lead->status === 'converted') {
            return response()->json(['message' => 'Lead has already been converted.'], 422);
        }

        $data = $request->validate([
            'converted_contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'converted_deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        ]);

        if (!empty($data['converted_deal_id'])) {
            $deal = $this->dealQuery($request)->findOrFail($data['converted_deal_id']);

            if ($deal->lead_id && $deal->lead_id !== $lead->id) {
                abort(422, 'The selected deal is linked to a different lead.');
            }
        }

        $lead->update([
            'status' => 'converted',
            'converted_at' => now(),
            'converted_contact_id' => $data['converted_contact_id'] ?? $lead->converted_contact_id,
            'converted_deal_id' => $data['converted_deal_id'] ?? $lead->converted_deal_id,
        ]);

        return response()->json($lead->fresh(['convertedContact', 'convertedDeal']));
    }

    public function markLeadLost(Request $request, string $id)
    {
        $data = $request->validate([
            'lost_reason' => ['required', 'string', 'max:255'],
        ]);

        $lead = $this->leadQuery($request)->findOrFail($id);
        $lead->update(['status' => 'lost', 'lost_reason' => $data['lost_reason']]);

        return response()->json($lead);
    }
}
