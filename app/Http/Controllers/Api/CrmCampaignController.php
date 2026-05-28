<?php

namespace App\Http\Controllers\Api;

use App\Models\CampaignSendLog;
use App\Models\Contact;
use App\Models\ContactGroup;
use App\Models\CrmCampaign;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\PurchaseBill;
use App\Services\SmsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class CrmCampaignController extends BaseCrudApiController
{
    protected string $modelClass = CrmCampaign::class;

    protected ?string $permissionPrefix = 'crm.campaign';
    protected bool $usePolicyAuthorization = false;

    protected array $searchable = ['name', 'code', 'source', 'medium'];

    protected array $filterable = ['branch_id', 'source', 'medium', 'status'];

    protected array $booleanFilters = ['active'];

    protected array $sortable = ['id', 'name', 'code', 'budget', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'];

    protected string $defaultSort = '-created_at';

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected array $relations = [
        'branch',
        'contactGroup',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contactGroup' => 'contact_group_id',
    ];

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')],
            'source' => ['nullable', 'string', 'max:80'],
            'medium' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'target_customers' => ['nullable', 'integer', 'min:0'],
            'email_only_quantity' => ['nullable', 'integer', 'min:0'],
            'sms_only_quantity' => ['nullable', 'integer', 'min:0'],
            'contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
            'email_subject' => ['nullable', 'string', 'max:255'],
            'email_preview_text' => ['nullable', 'string', 'max:255'],
            'email_body' => ['nullable', 'string'],
            'sms_body' => ['nullable', 'string', 'max:1600'],
            'rules' => ['nullable', 'array'],
            'rules.*.rule_type' => ['nullable', 'string', 'max:60'],
            'rules.*.operator' => ['nullable', 'string', 'max:30'],
            'rules.*.value' => ['nullable'],
            'rules.*.action' => ['nullable', 'string', 'max:120'],
            'rules.*.active' => ['nullable', 'boolean'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:draft,active,paused,completed,cancelled'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules($request));
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')->ignore($record->getKey())];

        return $rules;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $campaignId = $record->getKey();

        $leadsCount = Lead::query()->where('campaign_id', $campaignId)->count();
        $dealsCount = Deal::query()->where('campaign_id', $campaignId)->count();
        $wonDeals = Deal::query()->where('campaign_id', $campaignId)->where('status', 'won')->get();
        $wonDealsCount = $wonDeals->count();
        $revenue = $wonDeals->sum(fn ($d) => (float) ($d->amount ?? 0));

        $cost = PurchaseBill::query()
            ->where('campaign_id', $campaignId)
            ->whereNotIn('status', ['cancelled', 'void'])
            ->sum('total');
        $actualCost = round((float) $cost, 2);

        $roi = $actualCost > 0 ? round(($revenue - $actualCost) / $actualCost * 100, 2) : null;
        $conversionRate = $leadsCount > 0 ? round($wonDealsCount / $leadsCount * 100, 2) : null;
        $costPerLead = $leadsCount > 0 ? round($actualCost / $leadsCount, 2) : null;

        $data['stats'] = [
            'leads_count' => $leadsCount,
            'deals_count' => $dealsCount,
            'won_deals_count' => $wonDealsCount,
            'revenue' => round($revenue, 2),
            'actual_cost' => $actualCost,
            'roi' => $roi,
            'conversion_rate' => $conversionRate,
            'cost_per_lead' => $costPerLead,
        ];

        return $data;
    }

    public function summary(Request $request): JsonResponse
    {
        $query = CrmCampaign::query();
        $this->applyBranchScope($query, $request);

        $campaigns = $query->get();
        $campaignIds = $campaigns->pluck('id');

        $totalBudget = $campaigns->sum(fn ($c) => (float) ($c->budget ?? 0));

        $totalCost = PurchaseBill::query()
            ->whereIn('campaign_id', $campaignIds)
            ->whereNotIn('status', ['cancelled', 'void'])
            ->sum('total');

        $leadsCount = Lead::query()->whereIn('campaign_id', $campaignIds)->count();
        $dealsCount = Deal::query()->whereIn('campaign_id', $campaignIds)->count();
        $wonDeals = Deal::query()->whereIn('campaign_id', $campaignIds)->where('status', 'won')->get();
        $revenue = $wonDeals->sum(fn ($d) => (float) ($d->amount ?? 0));
        $cost = round((float) $totalCost, 2);
        $roi = $cost > 0 ? round(($revenue - $cost) / $cost * 100, 2) : null;

        return response()->json([
            'total_budget' => round($totalBudget, 2),
            'total_cost' => $cost,
            'leads_count' => $leadsCount,
            'deals_count' => $dealsCount,
            'won_deals_count' => $wonDeals->count(),
            'revenue' => round($revenue, 2),
            'roi' => $roi,
        ]);
    }

    /**
     * Build the audience for a campaign + channel and break it down into
     * eligible / missing / skipped buckets so the UI can show a confirmation
     * summary before any real send.
     */
    public function audience(Request $request, string $id, string $channel): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);

        // Run the channel-filtered query and build the summary the UI shows.
        $contacts = $this->audienceQuery($campaign, $channel)->get();
        $summary = $this->summarizeAudience($contacts, $channel, $campaign);

        // Diagnostics — exposed so the UI can explain "why is this zero?".
        // We re-run successively-narrower queries so each layer's drop is
        // visible. Cheap on small datasets; capped on large ones below.
        $diag = [];
        $baseQuery = Contact::query()->where(function ($q) {
            $q->whereNull('active')->orWhere('active', '!=', false);
        });

        $diag['contacts_total'] = $baseQuery->count();
        $diag['contacts_non_supplier'] = (clone $baseQuery)
            ->where(function ($q) {
                $q->whereNull('contact_type')->orWhere('contact_type', '!=', 'supplier');
            })->count();

        if ($campaign->contact_group_id) {
            $groupIds = $this->descendantGroupIds($campaign->contact_group_id);
            $diag['contact_group_id'] = $campaign->contact_group_id;
            $diag['contacts_in_group'] = Contact::query()->whereIn('contact_group_id', $groupIds)->count();
        } else {
            $diag['contact_group_id'] = null;
            $diag['contacts_in_group'] = $diag['contacts_non_supplier'];
        }

        if ($channel === 'email') {
            $diag['contacts_with_email'] = Contact::query()
                ->whereNotNull('email')->where('email', '!=', '')->count();
        } elseif ($channel === 'sms') {
            $diag['contacts_with_phone'] = Contact::query()
                ->whereNotNull('phone')->where('phone', '!=', '')->count();
        }

        return response()->json([
            'channel' => $channel,
            'campaign_id' => $campaign->id,
            'summary' => $summary,
            'diagnostics' => $diag,
        ]);
    }

    public function previewEmail(Request $request, string $id): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);

        $contact = $this->audienceQuery($campaign, 'email')->first();
        $rendered = $this->renderTemplate(
            $request->input('body', $campaign->email_body),
            $contact,
            $campaign
        );
        $renderedSubject = $this->renderTemplate(
            $request->input('subject', $campaign->email_subject),
            $contact,
            $campaign
        );

        return response()->json([
            'subject' => $renderedSubject,
            'body' => $rendered,
            'sample_contact' => $contact ? [
                'id' => $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
            ] : null,
        ]);
    }

    public function previewSms(Request $request, string $id): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);
        $contact = $this->audienceQuery($campaign, 'sms')->first();
        $rendered = $this->renderTemplate($request->input('body', $campaign->sms_body), $contact, $campaign);

        return response()->json([
            'body' => $rendered,
            'characters' => mb_strlen((string) $rendered),
            'sample_contact' => $contact ? [
                'id' => $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
            ] : null,
        ]);
    }

    public function sendBulkEmail(Request $request, string $id): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);

        $request->validate(['confirm' => ['accepted']]);

        $subject = trim((string) ($campaign->email_subject ?? ''));
        $body = (string) ($campaign->email_body ?? '');
        if ($subject === '' || trim($body) === '') {
            return response()->json([
                'message' => 'Campaign email subject and body must be set before sending.',
            ], 422);
        }

        $limit = $campaign->email_only_quantity > 0 ? $campaign->email_only_quantity : null;
        $contacts = $this->audienceQuery($campaign, 'email')->limit($limit ?: PHP_INT_MAX)->get();

        $sent = 0; $failed = 0; $skipped = 0; $errors = [];

        foreach ($contacts as $contact) {
            $to = trim((string) $contact->email);
            if ($to === '') {
                $skipped++;
                $this->writeLog($campaign, $contact, 'email', null, 'skipped', 'Missing email address', $request);
                continue;
            }

            $renderedSubject = $this->renderTemplate($subject, $contact, $campaign);
            $renderedBody = $this->renderTemplate($body, $contact, $campaign);

            try {
                Mail::html($renderedBody, function ($mail) use ($to, $contact, $renderedSubject) {
                    $mail->to($to, $contact->name)->subject($renderedSubject);
                });
                $sent++;
                $this->writeLog($campaign, $contact, 'email', $to, 'sent', null, $request);
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = $e->getMessage();
                $this->writeLog($campaign, $contact, 'email', $to, 'failed', $e->getMessage(), $request);
            }
        }

        return response()->json([
            'channel' => 'email',
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
            'total_attempted' => $contacts->count(),
            'limit_applied' => $limit,
            'sample_errors' => array_slice(array_unique($errors), 0, 3),
        ]);
    }

    public function sendBulkSms(Request $request, string $id, SmsService $smsService): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);

        $request->validate(['confirm' => ['accepted']]);

        $body = (string) ($campaign->sms_body ?? '');
        if (trim($body) === '') {
            return response()->json(['message' => 'Campaign SMS body must be set before sending.'], 422);
        }

        $config = $smsService->resolveActiveConfig();
        if (!$config) {
            return response()->json(['message' => 'No active SMS provider configured.'], 422);
        }

        $limit = $campaign->sms_only_quantity > 0 ? $campaign->sms_only_quantity : null;
        $contacts = $this->audienceQuery($campaign, 'sms')->limit($limit ?: PHP_INT_MAX)->get();

        $sent = 0; $failed = 0; $skipped = 0; $errors = [];

        foreach ($contacts as $contact) {
            $to = trim((string) $contact->phone);
            if ($to === '') {
                $skipped++;
                $this->writeLog($campaign, $contact, 'sms', null, 'skipped', 'Missing phone number', $request);
                continue;
            }

            $renderedBody = $this->renderTemplate($body, $contact, $campaign);
            $result = $smsService->send($to, $renderedBody, $config);

            if ($result->success) {
                $sent++;
                $this->writeLog($campaign, $contact, 'sms', $to, 'sent', null, $request, $result->providerMessageId);
            } else {
                $failed++;
                $errors[] = $result->error ?? 'Unknown error';
                $this->writeLog($campaign, $contact, 'sms', $to, 'failed', $result->error, $request);
            }
        }

        return response()->json([
            'channel' => 'sms',
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
            'total_attempted' => $contacts->count(),
            'limit_applied' => $limit,
            'sample_errors' => array_slice(array_unique($errors), 0, 3),
        ]);
    }

    public function sendLogs(Request $request, string $id): JsonResponse
    {
        $campaign = CrmCampaign::query()->findOrFail($id);

        $query = CampaignSendLog::query()->where('campaign_id', $campaign->id);

        if ($channel = $request->query('channel')) {
            $query->where('channel', $channel);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $pageSize = min(max((int) $request->query('page_size', 25), 1), 200);

        $paginated = $query
            ->orderByDesc('created_at')
            ->paginate($pageSize);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ]);
    }

    private function audienceQuery(CrmCampaign $campaign, string $channel): Builder
    {
        // Treat NULL active/contact_type as "include" — only exclude on an
        // explicit false / 'supplier' value. Otherwise pre-existing rows
        // (where these columns were never populated) silently disappear
        // from every campaign send.
        $query = Contact::query()
            ->where(function ($q) {
                $q->whereNull('active')->orWhere('active', '!=', false);
            })
            ->where(function ($q) {
                $q->whereNull('contact_type')->orWhere('contact_type', '!=', 'supplier');
            });

        if ($campaign->contact_group_id) {
            $groupIds = $this->descendantGroupIds($campaign->contact_group_id);
            $query->whereIn('contact_group_id', $groupIds);
        }

        if ($channel === 'email') {
            $query->whereNotNull('email')->where('email', '!=', '');
        } elseif ($channel === 'sms') {
            $query->whereNotNull('phone')->where('phone', '!=', '');
        }

        return $query->orderBy('name');
    }

    private function descendantGroupIds(string $groupId): array
    {
        $ids = [$groupId];
        $queue = [$groupId];
        while ($queue) {
            $children = ContactGroup::query()->whereIn('parent_id', $queue)->pluck('id')->all();
            if (!$children) break;
            $ids = array_merge($ids, $children);
            $queue = $children;
        }
        return array_values(array_unique($ids));
    }

    private function summarizeAudience($contacts, string $channel, CrmCampaign $campaign): array
    {
        $missing = 0;
        if ($channel === 'email') {
            $missing = $contacts->filter(fn ($c) => empty(trim((string) $c->email)))->count();
        } elseif ($channel === 'sms') {
            $missing = $contacts->filter(fn ($c) => empty(trim((string) $c->phone)))->count();
        }

        $limit = match ($channel) {
            'email' => $campaign->email_only_quantity,
            'sms' => $campaign->sms_only_quantity,
            default => null,
        };

        $total = $contacts->count();
        $eligible = $total - $missing;
        $willSend = $limit && $limit > 0 ? min($eligible, $limit) : $eligible;

        return [
            'total' => $total,
            'eligible' => $eligible,
            'missing_contact_info' => $missing,
            'limit' => $limit,
            'will_send' => $willSend,
            'target_customers' => $campaign->target_customers,
        ];
    }

    private function renderTemplate(?string $template, ?Contact $contact, CrmCampaign $campaign): string
    {
        if (!$template) return '';

        $replacements = [
            '{{contact_name}}' => $contact?->name ?? '',
            '{{contact_first_name}}' => $contact ? explode(' ', trim($contact->name))[0] : '',
            '{{contact_email}}' => $contact?->email ?? '',
            '{{contact_phone}}' => $contact?->phone ?? '',
            '{{campaign_name}}' => $campaign->name ?? '',
            '{{campaign_code}}' => $campaign->code ?? '',
            '{{company_name}}' => optional(\App\Models\AppSetting::query()->first())->company_name ?? '',
        ];

        return strtr($template, $replacements);
    }

    private function writeLog(
        CrmCampaign $campaign,
        Contact $contact,
        string $channel,
        ?string $toAddress,
        string $status,
        ?string $error,
        Request $request,
        ?string $providerMessageId = null,
    ): void {
        CampaignSendLog::query()->create([
            'campaign_id' => $campaign->id,
            'contact_id' => $contact->id,
            'channel' => $channel,
            'to_address' => $toAddress,
            'status' => $status,
            'provider_message_id' => $providerMessageId,
            'error' => $error,
            'sent_at' => in_array($status, ['sent', 'failed'], true) ? now() : null,
            'user_add_id' => $request->user()?->id,
        ]);
    }
}
