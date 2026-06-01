<?php

namespace App\Http\Controllers\Api;

use App\Models\CampaignEmailAttachment;
use App\Models\CampaignEmailMessage;
use App\Models\CampaignEmailRecipient;
use App\Models\CampaignSendLog;
use App\Models\CampaignSmsMessage;
use App\Models\CampaignSmsRecipient;
use App\Models\Contact;
use App\Models\CrmCampaign;
use App\Services\CampaignCmsService;
use App\Services\SmsService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CrmCampaignController extends BaseCrudApiController
{
    protected string $modelClass = CrmCampaign::class;

    protected ?string $permissionPrefix = 'campaign';
    protected bool $usePolicyAuthorization = false;

    protected array $searchable = ['name', 'code', 'type', 'status'];
    protected array $filterable = ['branch_id', 'type', 'status', 'created_by'];
    protected array $sortable = ['id', 'name', 'code', 'type', 'status', 'created_at', 'updated_at', 'sent_at'];
    protected string $defaultSort = '-created_at';
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;

    protected array $relations = ['branch', 'contactGroup', 'createdBy'];
    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contactGroup' => 'contact_group_id',
        'createdBy' => 'created_by',
    ];

    public function __construct(private readonly CampaignCmsService $campaignService)
    {
    }

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'title' => ['nullable', 'string', 'max:180'],
            'name' => ['required_without:title', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')],
            'type' => ['required', 'in:email,sms,email_sms,email_only,sms_only'],
            'description' => ['nullable', 'string'],
            'default_sender_name' => ['nullable', 'string', 'max:180'],
            'default_sender_email' => ['nullable', 'email', 'max:180'],
            'default_reply_to_email' => ['nullable', 'email', 'max:180'],
            'default_sms_sender_id' => ['nullable', 'string', 'max:60'],
            'contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
            'source' => ['nullable', 'string', 'max:80'],
            'medium' => ['nullable', 'string', 'max:80'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'target_customers' => ['nullable', 'integer', 'min:0'],
            'email_only_quantity' => ['nullable', 'integer', 'min:0'],
            'sms_only_quantity' => ['nullable', 'integer', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', Rule::in(CampaignCmsService::CAMPAIGN_STATUSES)],
            'priority' => ['nullable', 'string', 'max:30'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable', 'string', 'max:80'],
            'internal_remarks' => ['nullable', 'string'],
            'rules' => ['nullable', 'array'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules($request));
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')->ignore($record->getKey())];

        return $rules;
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = $this->campaignService->ensureCampaignDefaults($parentData);
        unset($parentData['title']);
        $parentData['created_by'] = auth()->id();
        $parentData['updated_by'] = auth()->id();

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = $this->campaignService->ensureCampaignDefaults($parentData, $record);
        unset($parentData['title']);
        $parentData['updated_by'] = auth()->id();

        return $parentData;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['title'] = $record->name;
        $data['stats'] = $this->campaignService->campaignStats($record);
        $data['last_activity_at'] = CampaignSendLog::query()
            ->where('campaign_id', $record->id)
            ->latest('created_at')
            ->value('created_at') ?: $record->updated_at;

        return $data;
    }

    public function summary(Request $request): JsonResponse
    {
        $query = CrmCampaign::query();
        $this->applyBranchScope($query, $request);

        $campaigns = $query->get();
        $campaignIds = $campaigns->pluck('id');
        $logs = CampaignSendLog::query()->whereIn('campaign_id', $campaignIds)->get();

        return response()->json([
            'total_campaigns' => $campaigns->count(),
            'draft_campaigns' => $campaigns->where('status', 'draft')->count(),
            'ready_campaigns' => $campaigns->where('status', 'ready')->count(),
            'scheduled_campaigns' => $campaigns->where('status', 'scheduled')->count(),
            'sending_campaigns' => $campaigns->where('status', 'sending')->count(),
            'sent_campaigns' => $campaigns->where('status', 'sent')->count(),
            'failed_sends' => $logs->where('status', 'failed')->count(),
            'total_recipients_reached' => $logs->whereIn('status', ['sent', 'delivered', 'opened', 'clicked'])->unique(fn ($log) => ($log->type ?: $log->channel) . ':' . ($log->email ?: $log->phone ?: $log->to_address))->count(),
        ]);
    }

    public function statistics(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);

        return response()->json($this->campaignService->campaignStats($campaign));
    }

    public function duplicate(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);

        $copy = DB::transaction(function () use ($campaign, $request) {
            $copy = $campaign->replicate(['code', 'sent_at', 'completed_at', 'cancelled_at']);
            $copy->name = $request->input('title') ?: $campaign->name . ' Copy';
            $copy->code = null;
            $copy->status = 'draft';
            $copy->created_by = $request->user()?->id;
            $copy->updated_by = $request->user()?->id;
            $copy->save();

            foreach ($campaign->emailMessages()->with(['attachments', 'recipients'])->get() as $message) {
                $newMessage = $this->duplicateEmailMessageRecord($message, $copy, true, true);
            }

            foreach ($campaign->smsMessages()->with('recipients')->get() as $message) {
                $this->duplicateSmsMessageRecord($message, $copy, true);
            }

            return $copy->fresh();
        });

        return response()->json($this->serializeRecord($copy), 201);
    }

    public function sendCampaign(Request $request, string $id, SmsService $smsService): JsonResponse
    {
        $this->authorizeAction($request, 'send');

        $campaign = $this->campaign($id);
        $emailIds = $request->input('email_message_ids', []);
        $smsIds = $request->input('sms_message_ids', []);

        $emailMessages = $campaign->emailMessages()
            ->when($emailIds, fn ($query) => $query->whereIn('id', $emailIds))
            ->where('is_active', true)
            ->get();

        $smsMessages = $campaign->smsMessages()
            ->when($smsIds, fn ($query) => $query->whereIn('id', $smsIds))
            ->where('is_active', true)
            ->get();

        $result = ['email' => ['sent' => 0, 'failed' => 0, 'skipped' => 0], 'sms' => ['sent' => 0, 'failed' => 0, 'skipped' => 0]];

        foreach ($emailMessages as $message) {
            $attempt = $this->campaignService->sendEmailMessage($message, $request);
            $result['email'] = $this->mergeCounts($result['email'], $attempt);
        }

        foreach ($smsMessages as $message) {
            $attempt = $this->campaignService->sendSmsMessage($message, $request, $smsService);
            $result['sms'] = $this->mergeCounts($result['sms'], $attempt);
        }

        return response()->json($result);
    }

    public function cancelCampaign(Request $request, string $id): JsonResponse
    {
        $this->authorizeAction($request, 'cancel');

        $campaign = $this->campaign($id);
        $cancelled = 0;

        foreach ($campaign->emailMessages()->where('status', 'scheduled')->get() as $message) {
            $cancelled += $this->campaignService->cancelEmailSchedule($message, $request->input('reason'))['cancelled_recipients'];
        }

        foreach ($campaign->smsMessages()->where('status', 'scheduled')->get() as $message) {
            $cancelled += $this->campaignService->cancelSmsSchedule($message, $request->input('reason'))['cancelled_recipients'];
        }

        $campaign->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        return response()->json(['cancelled_recipients' => $cancelled]);
    }

    public function emailMessages(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);
        $messages = $campaign->emailMessages()
            ->withCount(['recipients', 'attachments'])
            ->orderBy('send_order')
            ->orderBy('created_at')
            ->get()
            ->map(fn (CampaignEmailMessage $message) => $this->emailMessagePayload($message));

        return response()->json(['data' => $messages]);
    }

    public function storeEmailMessage(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);

        $data = $request->validate($this->emailMessageRules());
        $data['campaign_id'] = $campaign->id;
        $data['code'] = $data['code'] ?? $this->campaignService->nextEmailCode($campaign);
        $data['sender_name'] = $data['sender_name'] ?? $campaign->default_sender_name;
        $data['sender_email'] = $data['sender_email'] ?? $campaign->default_sender_email;
        $data['reply_to_email'] = $data['reply_to_email'] ?? $campaign->default_reply_to_email;

        $message = CampaignEmailMessage::query()->create($data);

        return response()->json($this->emailMessagePayload($message), 201);
    }

    public function updateEmailMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        abort_if(in_array($message->status, ['sent', 'partially_sent'], true), 422, 'Sent messages have restricted editing.');

        $data = $request->validate($this->emailMessageRules(true));
        $message->update($data);

        return response()->json($this->emailMessagePayload($message->refresh()));
    }

    public function deleteEmailMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        $message->delete();

        return response()->json(['message' => 'Email message deleted.']);
    }

    public function duplicateEmailMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $campaign = $this->campaign($id);
        $message = $this->emailMessage($id, $messageId);

        $copy = $this->duplicateEmailMessageRecord(
            $message,
            $campaign,
            $request->boolean('copy_recipients', true),
            $request->boolean('copy_attachments', true)
        );

        return response()->json($this->emailMessagePayload($copy), 201);
    }

    public function previewEmailMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        $recipient = $message->recipients()->first();

        return response()->json([
            'subject' => $this->campaignService->renderTemplate($request->input('subject', $message->subject), $recipient, $message->campaign),
            'body' => $this->campaignService->renderTemplate($request->input('body', $message->body), $recipient, $message->campaign),
            'sample_recipient' => $recipient,
        ]);
    }

    public function sendTestEmail(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'send');
        $message = $this->emailMessage($id, $messageId);
        $data = $request->validate(['email' => ['required', 'email', 'max:180']]);

        return response()->json($this->campaignService->sendEmailMessage($message, $request, true, $data['email']));
    }

    public function sendEmailNow(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'send');

        return response()->json($this->campaignService->sendEmailMessage($this->emailMessage($id, $messageId), $request));
    }

    public function scheduleEmail(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'schedule');
        $data = $request->validate($this->scheduleRules());

        return response()->json($this->emailMessagePayload($this->campaignService->scheduleEmail($this->emailMessage($id, $messageId), $data)));
    }

    public function cancelEmailSchedule(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'cancel');

        return response()->json($this->campaignService->cancelEmailSchedule($this->emailMessage($id, $messageId), $request->input('reason')));
    }

    public function smsMessages(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);
        $messages = $campaign->smsMessages()
            ->withCount('recipients')
            ->orderBy('send_order')
            ->orderBy('created_at')
            ->get()
            ->map(fn (CampaignSmsMessage $message) => $this->smsMessagePayload($message));

        return response()->json(['data' => $messages]);
    }

    public function storeSmsMessage(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);

        $data = $request->validate($this->smsMessageRules());
        $data['campaign_id'] = $campaign->id;
        $data['code'] = $data['code'] ?? $this->campaignService->nextSmsCode($campaign);
        $data['sender_id'] = $data['sender_id'] ?? $campaign->default_sms_sender_id;
        $data = $this->withSmsCounts($data);

        $message = CampaignSmsMessage::query()->create($data);

        return response()->json($this->smsMessagePayload($message), 201);
    }

    public function updateSmsMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->smsMessage($id, $messageId);
        abort_if(in_array($message->status, ['sent', 'partially_sent'], true), 422, 'Sent messages have restricted editing.');

        $data = $this->withSmsCounts($request->validate($this->smsMessageRules(true)));
        $message->update($data);

        return response()->json($this->smsMessagePayload($message->refresh()));
    }

    public function deleteSmsMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->smsMessage($id, $messageId)->delete();

        return response()->json(['message' => 'SMS message deleted.']);
    }

    public function duplicateSmsMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $copy = $this->duplicateSmsMessageRecord(
            $this->smsMessage($id, $messageId),
            $this->campaign($id),
            $request->boolean('copy_recipients', true)
        );

        return response()->json($this->smsMessagePayload($copy), 201);
    }

    public function previewSmsMessage(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->smsMessage($id, $messageId);
        $recipient = $message->recipients()->first();
        $body = $this->campaignService->renderTemplate($request->input('body', $message->body), $recipient, $message->campaign);

        return response()->json([
            'body' => $body,
            'characters' => mb_strlen($body),
            'segments' => max(1, (int) ceil(max(mb_strlen($body), 1) / 160)),
            'sample_recipient' => $recipient,
        ]);
    }

    public function sendTestSms(Request $request, string $id, string $messageId, SmsService $smsService): JsonResponse
    {
        $this->authorizeAction($request, 'send');
        $data = $request->validate(['phone' => ['required', 'string', 'max:80']]);

        return response()->json($this->campaignService->sendSmsMessage($this->smsMessage($id, $messageId), $request, $smsService, true, $data['phone']));
    }

    public function sendSmsNow(Request $request, string $id, string $messageId, SmsService $smsService): JsonResponse
    {
        $this->authorizeAction($request, 'send');

        return response()->json($this->campaignService->sendSmsMessage($this->smsMessage($id, $messageId), $request, $smsService));
    }

    public function scheduleSms(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'schedule');
        $data = $request->validate($this->scheduleRules());

        return response()->json($this->smsMessagePayload($this->campaignService->scheduleSms($this->smsMessage($id, $messageId), $data)));
    }

    public function cancelSmsSchedule(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'cancel');

        return response()->json($this->campaignService->cancelSmsSchedule($this->smsMessage($id, $messageId), $request->input('reason')));
    }

    public function uploadAttachment(Request $request, string $id, string $messageId): JsonResponse
    {
        $this->authorizeAction($request, 'attachment.upload');
        $message = $this->emailMessage($id, $messageId);

        $data = $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,csv,txt,jpg,jpeg,png,zip'],
        ]);

        $created = [];
        foreach ($data['files'] as $file) {
            $path = $file->store("campaigns/{$id}/email/{$messageId}", 'public');
            $created[] = CampaignEmailAttachment::query()->create([
                'campaign_id' => $id,
                'campaign_email_message_id' => $messageId,
                'original_name' => $file->getClientOriginalName(),
                'file_name' => basename($path),
                'file_path' => $path,
                'file_type' => $file->getClientOriginalExtension(),
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()?->id,
                'is_active' => true,
            ]);
        }

        return response()->json(['data' => $created], 201);
    }

    public function attachments(Request $request, string $id): JsonResponse
    {
        $campaign = $this->campaign($id);
        $attachments = $campaign->emailAttachments()
            ->with(['emailMessage', 'uploadedBy'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $attachments]);
    }

    public function downloadAttachment(Request $request, string $id, string $attachmentId)
    {
        $this->campaign($id);
        $attachment = CampaignEmailAttachment::query()->where('campaign_id', $id)->findOrFail($attachmentId);
        abort_unless(Storage::disk('public')->exists($attachment->file_path), 404);

        return Storage::disk('public')->download($attachment->file_path, $attachment->original_name);
    }

    public function deleteAttachment(Request $request, string $id, string $attachmentId): JsonResponse
    {
        $this->authorizeAction($request, 'attachment.delete');
        $attachment = CampaignEmailAttachment::query()->where('campaign_id', $id)->findOrFail($attachmentId);
        $attachment->update(['is_active' => false]);

        return response()->json(['message' => 'Attachment removed.']);
    }

    public function emailRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $query = $this->emailMessage($id, $messageId)->recipients()->with(['contactGroup', 'contact']);
        $this->applyRecipientFilters($query, $request, 'email');

        return response()->json($this->paginateSimple($query, $request));
    }

    public function addEmailRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        $data = $request->validate(['recipients' => ['required', 'array', 'min:1']]);

        return response()->json($this->campaignService->addManualEmailRecipients($message, $data['recipients']));
    }

    public function addEmailRecipientsFromGroup(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        $data = $request->validate(['contact_group_id' => ['required', 'uuid', 'exists:contact_groups,id']]);

        return response()->json($this->campaignService->addEmailRecipientsFromGroup($message, $data['contact_group_id']));
    }

    public function addEmailContacts(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->emailMessage($id, $messageId);
        $data = $request->validate(['contact_ids' => ['required', 'array'], 'contact_ids.*' => ['uuid', 'exists:contacts,id']]);
        $contacts = Contact::query()->with(['account', 'crmAccount'])->whereIn('id', $data['contact_ids'])->get();

        return response()->json($this->campaignService->addEmailContacts($message, $contacts));
    }

    public function copyEmailRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $target = $this->emailMessage($id, $messageId);
        $data = $request->validate(['from_email_message_id' => ['required', 'uuid']]);
        $from = $this->emailMessage($id, $data['from_email_message_id']);

        return response()->json($this->campaignService->copyEmailRecipients($from, $target));
    }

    public function removeEmailRecipient(Request $request, string $id, string $messageId, string $recipientId): JsonResponse
    {
        $recipient = CampaignEmailRecipient::query()
            ->where('campaign_id', $id)
            ->where('campaign_email_message_id', $messageId)
            ->findOrFail($recipientId);
        $recipient->delete();

        return response()->json(['message' => 'Recipient removed.']);
    }

    public function smsRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $query = $this->smsMessage($id, $messageId)->recipients()->with(['contactGroup', 'contact']);
        $this->applyRecipientFilters($query, $request, 'sms');

        return response()->json($this->paginateSimple($query, $request));
    }

    public function addSmsRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->smsMessage($id, $messageId);
        $data = $request->validate(['recipients' => ['required', 'array', 'min:1']]);

        return response()->json($this->campaignService->addManualSmsRecipients($message, $data['recipients']));
    }

    public function addSmsRecipientsFromGroup(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->smsMessage($id, $messageId);
        $data = $request->validate(['contact_group_id' => ['required', 'uuid', 'exists:contact_groups,id']]);

        return response()->json($this->campaignService->addSmsRecipientsFromGroup($message, $data['contact_group_id']));
    }

    public function addSmsContacts(Request $request, string $id, string $messageId): JsonResponse
    {
        $message = $this->smsMessage($id, $messageId);
        $data = $request->validate(['contact_ids' => ['required', 'array'], 'contact_ids.*' => ['uuid', 'exists:contacts,id']]);
        $contacts = Contact::query()->with(['account', 'crmAccount'])->whereIn('id', $data['contact_ids'])->get();

        return response()->json($this->campaignService->addSmsContacts($message, $contacts));
    }

    public function copySmsRecipients(Request $request, string $id, string $messageId): JsonResponse
    {
        $target = $this->smsMessage($id, $messageId);
        $data = $request->validate(['from_sms_message_id' => ['required', 'uuid']]);
        $from = $this->smsMessage($id, $data['from_sms_message_id']);

        return response()->json($this->campaignService->copySmsRecipients($from, $target));
    }

    public function removeSmsRecipient(Request $request, string $id, string $messageId, string $recipientId): JsonResponse
    {
        $recipient = CampaignSmsRecipient::query()
            ->where('campaign_id', $id)
            ->where('campaign_sms_message_id', $messageId)
            ->findOrFail($recipientId);
        $recipient->delete();

        return response()->json(['message' => 'Recipient removed.']);
    }

    public function campaignRecipients(Request $request, string $id): JsonResponse
    {
        $this->campaign($id);

        $email = CampaignEmailRecipient::query()->where('campaign_id', $id)->get();
        $sms = CampaignSmsRecipient::query()->where('campaign_id', $id)->get();

        $rows = $email->map(fn ($recipient) => [
            'id' => 'email-' . $recipient->id,
            'name' => $recipient->name,
            'company_name' => $recipient->company_name,
            'email' => $recipient->email,
            'phone' => $recipient->phone,
            'source' => $recipient->source,
            'validation' => $recipient->is_valid_email ? 'valid' : 'invalid',
            'is_unsubscribed' => $recipient->is_unsubscribed,
            'last_send_status' => $recipient->last_log_status,
            'used_in_email_messages' => 1,
            'used_in_sms_messages' => 0,
            'contact_group_id' => $recipient->contact_group_id,
        ])->concat($sms->map(fn ($recipient) => [
            'id' => 'sms-' . $recipient->id,
            'name' => $recipient->name,
            'company_name' => $recipient->company_name,
            'email' => $recipient->email,
            'phone' => $recipient->phone,
            'source' => $recipient->source,
            'validation' => $recipient->is_valid_phone ? 'valid' : 'invalid',
            'is_unsubscribed' => $recipient->is_unsubscribed,
            'last_send_status' => $recipient->last_log_status,
            'used_in_email_messages' => 0,
            'used_in_sms_messages' => 1,
            'contact_group_id' => $recipient->contact_group_id,
        ]))->values();

        return response()->json(['data' => $rows]);
    }

    public function sendLogs(Request $request, string $id): JsonResponse
    {
        $this->campaign($id);

        $query = CampaignSendLog::query()
            ->with(['contactGroup'])
            ->where('campaign_id', $id);

        if ($search = $request->query('search')) {
            $query->where(function ($sub) use ($search) {
                $sub->where('message_title', 'like', "%{$search}%")
                    ->orWhere('recipient_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('external_message_id', 'like', "%{$search}%");
            });
        }
        foreach (['type', 'status', 'provider', 'contact_group_id'] as $field) {
            if ($value = $request->query($field)) {
                $query->where($field, $value);
            }
        }
        if ($request->boolean('has_error')) {
            $query->where(function ($sub) {
                $sub->whereNotNull('error_message')->orWhereNotNull('error');
            });
        }

        return response()->json($this->paginateSimple($query->latest('created_at'), $request));
    }

    public function showLog(Request $request, string $id, string $logId): JsonResponse
    {
        $this->campaign($id);

        return response()->json(CampaignSendLog::query()->where('campaign_id', $id)->findOrFail($logId));
    }

    public function retryLog(Request $request, string $id, string $logId, SmsService $smsService): JsonResponse
    {
        $this->authorizeAction($request, 'retry');
        $log = CampaignSendLog::query()->where('campaign_id', $id)->findOrFail($logId);

        return response()->json($this->campaignService->retryLog($log, $request, $smsService));
    }

    public function retryFailedLogs(Request $request, string $id, SmsService $smsService): JsonResponse
    {
        $this->authorizeAction($request, 'retry');
        $this->campaign($id);
        $logs = CampaignSendLog::query()->where('campaign_id', $id)->where('status', 'failed')->limit(100)->get();
        $total = ['sent' => 0, 'failed' => 0, 'skipped' => 0];

        foreach ($logs as $log) {
            $total = $this->mergeCounts($total, $this->campaignService->retryLog($log, $request, $smsService));
        }

        return response()->json($total);
    }

    public function markLogResolved(Request $request, string $id, string $logId): JsonResponse
    {
        $log = CampaignSendLog::query()->where('campaign_id', $id)->findOrFail($logId);
        $log->update(['resolved_at' => now()]);

        return response()->json($log->refresh());
    }

    public function exportLogs(Request $request, string $id)
    {
        $this->authorizeAction($request, 'export');
        $this->campaign($id);

        $rows = CampaignSendLog::query()->where('campaign_id', $id)->latest()->get()->map(fn ($log) => [
            'date_time' => optional($log->created_at)->toDateTimeString(),
            'message_type' => $log->type ?: $log->channel,
            'message_title' => $log->message_title,
            'recipient_name' => $log->recipient_name,
            'email' => $log->email,
            'phone' => $log->phone,
            'provider' => $log->provider,
            'status' => $log->status,
            'error_reason' => $log->error_message ?: $log->error,
            'external_message_id' => $log->external_message_id ?: $log->provider_message_id,
        ])->all();

        return $this->csvResponse($rows, 'campaign-send-logs.csv');
    }

    public function exportRecipients(Request $request, string $id)
    {
        $this->authorizeAction($request, 'export');
        $payload = $this->campaignRecipients($request, $id)->getData(true);

        return $this->csvResponse($payload['data'] ?? [], 'campaign-recipients.csv');
    }

    private function emailMessagePayload(CampaignEmailMessage $message): array
    {
        $message->loadMissing(['attachments', 'recipients']);
        $data = $message->toArray();
        $data['stats'] = $this->campaignService->messageStats($message);

        return $data;
    }

    private function smsMessagePayload(CampaignSmsMessage $message): array
    {
        $message->loadMissing('recipients');
        $data = $message->toArray();
        $data['stats'] = $this->campaignService->messageStats($message);

        return $data;
    }

    private function campaign(string $id): CrmCampaign
    {
        return CrmCampaign::query()->findOrFail($id);
    }

    private function emailMessage(string $campaignId, string $messageId): CampaignEmailMessage
    {
        return CampaignEmailMessage::query()->where('campaign_id', $campaignId)->findOrFail($messageId);
    }

    private function smsMessage(string $campaignId, string $messageId): CampaignSmsMessage
    {
        return CampaignSmsMessage::query()->where('campaign_id', $campaignId)->findOrFail($messageId);
    }

    private function emailMessageRules(bool $partial = false): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:80'],
            'subject' => ['nullable', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'sender_name' => ['nullable', 'string', 'max:180'],
            'sender_email' => ['nullable', 'email', 'max:180'],
            'reply_to_email' => ['nullable', 'email', 'max:180'],
            'body' => ['nullable', 'string'],
            'template_id' => ['nullable', 'uuid'],
            'status' => ['nullable', Rule::in(CampaignCmsService::MESSAGE_STATUSES)],
            'send_mode' => ['nullable', 'in:draft,send_now,scheduled,after_previous'],
            'scheduled_at' => ['nullable', 'date'],
            'timezone' => ['nullable', 'string', 'max:80'],
            'delay_minutes' => ['nullable', 'integer', 'min:0'],
            'send_order' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'track_opens' => ['nullable', 'boolean'],
            'track_clicks' => ['nullable', 'boolean'],
            'priority' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ];

        return $partial ? $this->makeRulesPartial($rules) : $rules;
    }

    private function smsMessageRules(bool $partial = false): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:80'],
            'sender_id' => ['nullable', 'string', 'max:60'],
            'body' => ['nullable', 'string', 'max:1600'],
            'status' => ['nullable', Rule::in(CampaignCmsService::MESSAGE_STATUSES)],
            'send_mode' => ['nullable', 'in:draft,send_now,scheduled,after_previous'],
            'scheduled_at' => ['nullable', 'date'],
            'timezone' => ['nullable', 'string', 'max:80'],
            'delay_minutes' => ['nullable', 'integer', 'min:0'],
            'send_order' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'priority' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ];

        return $partial ? $this->makeRulesPartial($rules) : $rules;
    }

    private function scheduleRules(): array
    {
        return [
            'send_mode' => ['nullable', 'in:scheduled,after_previous'],
            'scheduled_at' => ['required_if:send_mode,scheduled', 'nullable', 'date'],
            'timezone' => ['nullable', 'string', 'max:80'],
            'delay_minutes' => ['nullable', 'integer', 'min:0'],
            'retry_failed' => ['nullable', 'boolean'],
            'retry_limit' => ['nullable', 'integer', 'min:0', 'max:10'],
            'active_schedule' => ['nullable', 'boolean'],
        ];
    }

    private function withSmsCounts(array $data): array
    {
        if (array_key_exists('body', $data)) {
            $length = mb_strlen((string) $data['body']);
            $data['character_count'] = $length;
            $data['segment_count'] = max(1, (int) ceil(max($length, 1) / 160));
        }

        return $data;
    }

    private function duplicateEmailMessageRecord(CampaignEmailMessage $message, CrmCampaign $campaign, bool $copyRecipients, bool $copyAttachments): CampaignEmailMessage
    {
        $copy = $message->replicate(['code', 'sent_at', 'completed_at', 'cancelled_at']);
        $copy->campaign_id = $campaign->id;
        $copy->title = $message->title . ' Copy';
        $copy->code = $this->campaignService->nextEmailCode($campaign);
        $copy->status = 'draft';
        $copy->send_mode = 'draft';
        $copy->scheduled_at = null;
        $copy->save();

        if ($copyRecipients) {
            $this->campaignService->copyEmailRecipients($message, $copy);
        }

        if ($copyAttachments) {
            foreach ($message->attachments()->where('is_active', true)->get() as $attachment) {
                $newPath = $attachment->file_path;
                if (Storage::disk('public')->exists($attachment->file_path)) {
                    $newPath = 'campaigns/' . $campaign->id . '/email/' . $copy->id . '/' . Str::uuid() . '-' . $attachment->file_name;
                    Storage::disk('public')->copy($attachment->file_path, $newPath);
                }

                $newAttachment = $attachment->replicate();
                $newAttachment->campaign_id = $campaign->id;
                $newAttachment->campaign_email_message_id = $copy->id;
                $newAttachment->file_path = $newPath;
                $newAttachment->save();
            }
        }

        return $copy->refresh();
    }

    private function duplicateSmsMessageRecord(CampaignSmsMessage $message, CrmCampaign $campaign, bool $copyRecipients): CampaignSmsMessage
    {
        $copy = $message->replicate(['code', 'sent_at', 'completed_at', 'cancelled_at']);
        $copy->campaign_id = $campaign->id;
        $copy->title = $message->title . ' Copy';
        $copy->code = $this->campaignService->nextSmsCode($campaign);
        $copy->status = 'draft';
        $copy->send_mode = 'draft';
        $copy->scheduled_at = null;
        $copy->save();

        if ($copyRecipients) {
            $this->campaignService->copySmsRecipients($message, $copy);
        }

        return $copy->refresh();
    }

    private function applyRecipientFilters($query, Request $request, string $type): void
    {
        if ($search = $request->query('search')) {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        foreach (['contact_group_id', 'source', 'status'] as $field) {
            if ($value = $request->query($field)) {
                $query->where($field, $value);
            }
        }
        if ($request->has('unsubscribed')) {
            $query->where('is_unsubscribed', $request->boolean('unsubscribed'));
        }
        if ($request->has('valid')) {
            $query->where($type === 'email' ? 'is_valid_email' : 'is_valid_phone', $request->boolean('valid'));
        }
    }

    private function paginateSimple($query, Request $request): array
    {
        $pageSize = min(max((int) $request->query('page_size', 25), 1), 200);
        $paginated = $query->paginate($pageSize);

        return [
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
            ],
        ];
    }

    private function mergeCounts(array $base, array $incoming): array
    {
        foreach (['sent', 'failed', 'skipped'] as $key) {
            $base[$key] = (int) ($base[$key] ?? 0) + (int) ($incoming[$key] ?? 0);
        }

        return $base;
    }

    private function authorizeAction(Request $request, string $action): void
    {
        $user = $request->user();
        abort_unless($user, 401);

        if ($this->userHasAdministrativeBypass($user)) {
            return;
        }

        abort_unless($user->can("campaign.{$action}"), 403, "Missing permission: campaign.{$action}");
    }

    private function csvResponse(array $rows, string $filename)
    {
        $handle = fopen('php://temp', 'r+');
        if ($rows) {
            fputcsv($handle, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
