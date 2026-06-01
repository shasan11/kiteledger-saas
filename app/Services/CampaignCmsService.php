<?php

namespace App\Services;

use App\Models\CampaignEmailAttachment;
use App\Models\CampaignEmailMessage;
use App\Models\CampaignEmailRecipient;
use App\Models\CampaignSendLog;
use App\Models\CampaignSmsMessage;
use App\Models\CampaignSmsRecipient;
use App\Models\Contact;
use App\Models\ContactGroup;
use App\Models\CrmCampaign;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CampaignCmsService
{
    public const CAMPAIGN_STATUSES = [
        'draft', 'ready', 'scheduled', 'partially_sent', 'sending', 'sent', 'failed', 'cancelled',
    ];

    public const MESSAGE_STATUSES = [
        'draft', 'ready', 'scheduled', 'queued', 'sending', 'sent', 'partially_sent', 'failed', 'cancelled',
    ];

    public const RECIPIENT_STATUSES = [
        'ready', 'invalid', 'duplicate', 'unsubscribed', 'queued', 'sent', 'failed', 'skipped', 'cancelled',
    ];

    public const LOG_STATUSES = [
        'pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed', 'skipped', 'cancelled',
    ];

    public function ensureCampaignDefaults(array $data, ?CrmCampaign $campaign = null): array
    {
        if (array_key_exists('title', $data) && !array_key_exists('name', $data)) {
            $data['name'] = $data['title'];
        }

        if (empty($data['code']) && !$campaign) {
            $data['code'] = $this->nextCode('CMP', CrmCampaign::query(), 'code');
        }

        if (empty($data['type'])) {
            $data['type'] = 'email_sms';
        }

        if (empty($data['status'])) {
            $data['status'] = 'draft';
        }

        return $data;
    }

    public function nextEmailCode(CrmCampaign $campaign): string
    {
        return $this->nextMessageCode($campaign, CampaignEmailMessage::query(), 'EM');
    }

    public function nextSmsCode(CrmCampaign $campaign): string
    {
        return $this->nextMessageCode($campaign, CampaignSmsMessage::query(), 'SM');
    }

    public function addManualEmailRecipients(CampaignEmailMessage $message, array $rows): array
    {
        $added = $duplicates = $invalid = $unsubscribed = 0;

        foreach ($rows as $row) {
            $email = Str::lower(trim((string) ($row['email'] ?? '')));
            if (!$this->validEmail($email)) {
                $invalid++;
                $this->logSkippedEmail($message, $row, 'Invalid email address', 'manual');
                continue;
            }

            if ($this->emailExists($message, $email)) {
                $duplicates++;
                continue;
            }

            $isUnsubscribed = (bool) ($row['is_unsubscribed'] ?? false);
            if ($isUnsubscribed) {
                $unsubscribed++;
            }

            CampaignEmailRecipient::query()->create([
                'campaign_id' => $message->campaign_id,
                'campaign_email_message_id' => $message->id,
                'contact_id' => $row['contact_id'] ?? null,
                'contact_group_id' => $row['contact_group_id'] ?? null,
                'name' => $row['name'] ?? null,
                'company_name' => $row['company_name'] ?? null,
                'email' => $email,
                'phone' => $row['phone'] ?? null,
                'source' => $row['source'] ?? 'manual',
                'is_valid_email' => true,
                'is_unsubscribed' => $isUnsubscribed,
                'status' => $isUnsubscribed ? 'unsubscribed' : 'ready',
            ]);

            $added++;
        }

        return compact('added', 'duplicates', 'invalid', 'unsubscribed');
    }

    public function addManualSmsRecipients(CampaignSmsMessage $message, array $rows): array
    {
        $added = $duplicates = $invalid = $unsubscribed = 0;

        foreach ($rows as $row) {
            $phone = $this->normalizePhone((string) ($row['phone'] ?? ''));
            if (!$this->validPhone($phone)) {
                $invalid++;
                $this->logSkippedSms($message, $row, 'Invalid phone number', 'manual');
                continue;
            }

            if ($this->phoneExists($message, $phone)) {
                $duplicates++;
                continue;
            }

            $isUnsubscribed = (bool) ($row['is_unsubscribed'] ?? false);
            if ($isUnsubscribed) {
                $unsubscribed++;
            }

            CampaignSmsRecipient::query()->create([
                'campaign_id' => $message->campaign_id,
                'campaign_sms_message_id' => $message->id,
                'contact_id' => $row['contact_id'] ?? null,
                'contact_group_id' => $row['contact_group_id'] ?? null,
                'name' => $row['name'] ?? null,
                'company_name' => $row['company_name'] ?? null,
                'email' => $row['email'] ?? null,
                'phone' => $phone,
                'source' => $row['source'] ?? 'manual',
                'is_valid_phone' => true,
                'is_unsubscribed' => $isUnsubscribed,
                'status' => $isUnsubscribed ? 'unsubscribed' : 'ready',
            ]);

            $added++;
        }

        return compact('added', 'duplicates', 'invalid', 'unsubscribed');
    }

    public function addEmailRecipientsFromGroup(CampaignEmailMessage $message, string $groupId): array
    {
        $contacts = $this->contactsForGroup($groupId);

        return $this->addEmailContacts($message, $contacts, 'contact_group', $groupId);
    }

    public function addSmsRecipientsFromGroup(CampaignSmsMessage $message, string $groupId): array
    {
        $contacts = $this->contactsForGroup($groupId);

        return $this->addSmsContacts($message, $contacts, 'contact_group', $groupId);
    }

    public function addEmailContacts(CampaignEmailMessage $message, EloquentCollection|Collection $contacts, string $source = 'contact', ?string $groupId = null): array
    {
        $rows = collect($contacts)->map(fn (Contact $contact) => [
            'contact_id' => $contact->id,
            'contact_group_id' => $groupId ?: $contact->contact_group_id,
            'name' => $contact->name,
            'company_name' => $contact->crmAccount?->name ?? $contact->account?->account_name ?? null,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'source' => $source,
            'is_unsubscribed' => $this->isUnsubscribed($contact, 'email'),
        ])->all();

        return $this->addManualEmailRecipients($message, $rows);
    }

    public function addSmsContacts(CampaignSmsMessage $message, EloquentCollection|Collection $contacts, string $source = 'contact', ?string $groupId = null): array
    {
        $rows = collect($contacts)->map(fn (Contact $contact) => [
            'contact_id' => $contact->id,
            'contact_group_id' => $groupId ?: $contact->contact_group_id,
            'name' => $contact->name,
            'company_name' => $contact->crmAccount?->name ?? $contact->account?->account_name ?? null,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'source' => $source,
            'is_unsubscribed' => $this->isUnsubscribed($contact, 'sms'),
        ])->all();

        return $this->addManualSmsRecipients($message, $rows);
    }

    public function copyEmailRecipients(CampaignEmailMessage $from, CampaignEmailMessage $to): array
    {
        $rows = $from->recipients()->get()->map(fn (CampaignEmailRecipient $recipient) => [
            'contact_id' => $recipient->contact_id,
            'contact_group_id' => $recipient->contact_group_id,
            'name' => $recipient->name,
            'company_name' => $recipient->company_name,
            'email' => $recipient->email,
            'phone' => $recipient->phone,
            'source' => 'copied',
            'is_unsubscribed' => $recipient->is_unsubscribed,
        ])->all();

        return $this->addManualEmailRecipients($to, $rows);
    }

    public function copySmsRecipients(CampaignSmsMessage $from, CampaignSmsMessage $to): array
    {
        $rows = $from->recipients()->get()->map(fn (CampaignSmsRecipient $recipient) => [
            'contact_id' => $recipient->contact_id,
            'contact_group_id' => $recipient->contact_group_id,
            'name' => $recipient->name,
            'company_name' => $recipient->company_name,
            'email' => $recipient->email,
            'phone' => $recipient->phone,
            'source' => 'copied',
            'is_unsubscribed' => $recipient->is_unsubscribed,
        ])->all();

        return $this->addManualSmsRecipients($to, $rows);
    }

    public function scheduleEmail(CampaignEmailMessage $message, array $data): CampaignEmailMessage
    {
        $message->update([
            'send_mode' => $data['send_mode'] ?? 'scheduled',
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'timezone' => $data['timezone'] ?? config('app.timezone'),
            'delay_minutes' => $data['delay_minutes'] ?? null,
            'status' => 'scheduled',
            'cancelled_at' => null,
        ]);

        $message->campaign()->update(['status' => 'scheduled']);

        return $message->refresh();
    }

    public function scheduleSms(CampaignSmsMessage $message, array $data): CampaignSmsMessage
    {
        $message->update([
            'send_mode' => $data['send_mode'] ?? 'scheduled',
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'timezone' => $data['timezone'] ?? config('app.timezone'),
            'delay_minutes' => $data['delay_minutes'] ?? null,
            'status' => 'scheduled',
            'cancelled_at' => null,
        ]);

        $message->campaign()->update(['status' => 'scheduled']);

        return $message->refresh();
    }

    public function cancelEmailSchedule(CampaignEmailMessage $message, ?string $reason = null): array
    {
        $message->update(['status' => 'cancelled', 'send_mode' => 'draft', 'cancelled_at' => now()]);

        $count = 0;
        foreach ($message->recipients()->whereIn('status', ['ready', 'queued'])->get() as $recipient) {
            $recipient->update(['status' => 'cancelled', 'last_log_status' => 'cancelled']);
            $this->writeEmailLog($message, $recipient, 'cancelled', $reason ?: 'Schedule cancelled');
            $count++;
        }

        return ['cancelled_recipients' => $count];
    }

    public function cancelSmsSchedule(CampaignSmsMessage $message, ?string $reason = null): array
    {
        $message->update(['status' => 'cancelled', 'send_mode' => 'draft', 'cancelled_at' => now()]);

        $count = 0;
        foreach ($message->recipients()->whereIn('status', ['ready', 'queued'])->get() as $recipient) {
            $recipient->update(['status' => 'cancelled', 'last_log_status' => 'cancelled']);
            $this->writeSmsLog($message, $recipient, 'cancelled', $reason ?: 'Schedule cancelled');
            $count++;
        }

        return ['cancelled_recipients' => $count];
    }

    public function sendEmailMessage(CampaignEmailMessage $message, Request $request, bool $testOnly = false, ?string $testEmail = null): array
    {
        $this->assertEmailReady($message, $testOnly, $testEmail);

        $message->update(['status' => 'sending']);
        $recipients = $testOnly
            ? collect([(object) ['email' => $testEmail, 'name' => 'Test recipient', 'company_name' => null, 'phone' => null, 'id' => null, 'contact_id' => null, 'contact_group_id' => null, 'is_valid_email' => true, 'is_unsubscribed' => false, 'status' => 'ready']])
            : $message->recipients()->get();

        $sent = $failed = $skipped = 0;

        foreach ($recipients as $recipient) {
            if (!$recipient->is_valid_email || $recipient->status === 'invalid' || !$this->validEmail((string) $recipient->email)) {
                $skipped++;
                $this->writeEmailLog($message, $recipient, 'skipped', 'Invalid email address');
                continue;
            }

            if ($recipient->is_unsubscribed || $recipient->status === 'unsubscribed') {
                $skipped++;
                $this->writeEmailLog($message, $recipient, 'unsubscribed', 'Recipient is unsubscribed');
                continue;
            }

            if (!$testOnly && in_array($recipient->status, ['cancelled', 'skipped'], true)) {
                $skipped++;
                $this->writeEmailLog($message, $recipient, 'skipped', 'Recipient is inactive for this send');
                continue;
            }

            $this->writeEmailLog($message, $recipient, 'queued');
            $subject = $this->renderTemplate($message->subject, $recipient, $message->campaign);
            $body = $this->renderTemplate($message->body, $recipient, $message->campaign);

            try {
                Mail::html($body, function ($mail) use ($message, $recipient, $subject) {
                    $mail->to($recipient->email, $recipient->name)->subject($subject);

                    if ($message->sender_email) {
                        $mail->from($message->sender_email, $message->sender_name);
                    }

                    if ($message->reply_to_email) {
                        $mail->replyTo($message->reply_to_email);
                    }

                    foreach ($message->attachments()->where('is_active', true)->get() as $attachment) {
                        $path = Storage::disk('public')->path($attachment->file_path);
                        if (is_file($path)) {
                            $mail->attach($path, ['as' => $attachment->original_name, 'mime' => $attachment->mime_type]);
                        }
                    }
                });

                $sent++;
                $this->writeEmailLog($message, $recipient, 'sent');
                if (!$testOnly && $recipient instanceof CampaignEmailRecipient) {
                    $recipient->update(['status' => 'sent', 'sent_at' => now(), 'last_log_status' => 'sent']);
                }
            } catch (Throwable $exception) {
                $failed++;
                $this->writeEmailLog($message, $recipient, 'failed', $exception->getMessage());
                if (!$testOnly && $recipient instanceof CampaignEmailRecipient) {
                    $recipient->update(['status' => 'failed', 'last_log_status' => 'failed']);
                }
            }
        }

        $this->finalizeMessageStatus($message, $sent, $failed);

        return compact('sent', 'failed', 'skipped');
    }

    public function sendSmsMessage(CampaignSmsMessage $message, Request $request, SmsService $smsService, bool $testOnly = false, ?string $testPhone = null): array
    {
        $this->assertSmsReady($message, $testOnly, $testPhone);

        $message->update(['status' => 'sending']);
        $recipients = $testOnly
            ? collect([(object) ['phone' => $this->normalizePhone((string) $testPhone), 'name' => 'Test recipient', 'company_name' => null, 'email' => null, 'id' => null, 'contact_id' => null, 'contact_group_id' => null, 'is_valid_phone' => true, 'is_unsubscribed' => false, 'status' => 'ready']])
            : $message->recipients()->get();

        $sent = $failed = $skipped = 0;

        foreach ($recipients as $recipient) {
            if (!$recipient->is_valid_phone || $recipient->status === 'invalid' || !$this->validPhone((string) $recipient->phone)) {
                $skipped++;
                $this->writeSmsLog($message, $recipient, 'skipped', 'Invalid phone number');
                continue;
            }

            if ($recipient->is_unsubscribed || $recipient->status === 'unsubscribed') {
                $skipped++;
                $this->writeSmsLog($message, $recipient, 'unsubscribed', 'Recipient is unsubscribed');
                continue;
            }

            if (!$testOnly && in_array($recipient->status, ['cancelled', 'skipped'], true)) {
                $skipped++;
                $this->writeSmsLog($message, $recipient, 'skipped', 'Recipient is inactive for this send');
                continue;
            }

            $this->writeSmsLog($message, $recipient, 'queued');
            $body = $this->renderTemplate($message->body, $recipient, $message->campaign);
            $result = $smsService->send($recipient->phone, $body, null, [
                'sms_config_id' => $message->sms_config_id ?? null,
                'provider' => $message->provider_override ?? null,
                'sender_id' => $message->sender_id ?? null,
                'campaign_id' => $message->campaign_id,
                'campaign_sms_message_id' => $message->id,
                'campaign_sms_recipient_id' => $recipient instanceof CampaignSmsRecipient ? $recipient->id : null,
                'module' => 'campaign',
                'module_id' => $message->campaign_id,
                'recipient_name' => $recipient->name ?? null,
            ]);

            if ($result->success) {
                $sent++;
                $this->writeSmsLog($message, $recipient, 'sent', null, $result->provider, $result->providerMessageId, $result->smsLogId, $result->providerResponse);
                if (!$testOnly && $recipient instanceof CampaignSmsRecipient) {
                    $recipient->update(['status' => 'sent', 'sent_at' => now(), 'last_log_status' => 'sent']);
                }
            } else {
                $failed++;
                $this->writeSmsLog($message, $recipient, 'failed', $result->error, $result->provider, $result->providerMessageId, $result->smsLogId, $result->providerResponse);
                if (!$testOnly && $recipient instanceof CampaignSmsRecipient) {
                    $recipient->update(['status' => 'failed', 'last_log_status' => 'failed']);
                }
            }
        }

        $this->finalizeMessageStatus($message, $sent, $failed);

        return compact('sent', 'failed', 'skipped');
    }

    public function retryLog(CampaignSendLog $log, Request $request, SmsService $smsService): array
    {
        if ($log->type === 'sms' || $log->channel === 'sms') {
            $message = $log->smsMessage;
            if (!$message || !$log->smsRecipient) {
                return ['sent' => 0, 'failed' => 0, 'skipped' => 1];
            }

            $log->smsRecipient->update(['status' => 'ready']);

            return $this->sendSmsMessage($message, $request, $smsService);
        }

        $message = $log->emailMessage;
        if (!$message || !$log->emailRecipient) {
            return ['sent' => 0, 'failed' => 0, 'skipped' => 1];
        }

        $log->emailRecipient->update(['status' => 'ready']);

        return $this->sendEmailMessage($message, $request);
    }

    public function campaignStats(CrmCampaign $campaign): array
    {
        $emailMessages = $campaign->emailMessages()->withCount(['recipients', 'attachments'])->get();
        $smsMessages = $campaign->smsMessages()->withCount('recipients')->get();
        $logs = $campaign->sendLogs()->get();

        return [
            'total_email_messages' => $emailMessages->count(),
            'total_sms_messages' => $smsMessages->count(),
            'total_recipients' => $campaign->emailRecipients()->count() + $campaign->smsRecipients()->count(),
            'scheduled_messages' => $emailMessages->where('status', 'scheduled')->count() + $smsMessages->where('status', 'scheduled')->count(),
            'sent_messages' => $emailMessages->whereIn('status', ['sent', 'partially_sent'])->count() + $smsMessages->whereIn('status', ['sent', 'partially_sent'])->count(),
            'failed_sends' => $logs->where('status', 'failed')->count(),
            'bounce_count' => $logs->where('status', 'bounced')->count(),
            'delivered_count' => $logs->where('status', 'delivered')->count(),
            'open_count' => $logs->where('status', 'opened')->count(),
            'click_count' => $logs->where('status', 'clicked')->count(),
            'queued_count' => $logs->where('status', 'queued')->count(),
            'sent_count' => $logs->where('status', 'sent')->count(),
            'skipped_count' => $logs->where('status', 'skipped')->count(),
            'unsubscribed_count' => $logs->where('status', 'unsubscribed')->count(),
            'attachment_count' => $campaign->emailAttachments()->where('is_active', true)->count(),
        ];
    }

    public function messageStats(CampaignEmailMessage|CampaignSmsMessage $message): array
    {
        $logs = $message->sendLogs()->get();

        return [
            'recipients_count' => $message->recipients()->count(),
            'attachments_count' => $message instanceof CampaignEmailMessage ? $message->attachments()->where('is_active', true)->count() : 0,
            'sent_count' => $logs->where('status', 'sent')->count(),
            'delivered_count' => $logs->where('status', 'delivered')->count(),
            'failed_count' => $logs->where('status', 'failed')->count(),
            'bounced_count' => $logs->where('status', 'bounced')->count(),
            'opened_count' => $logs->where('status', 'opened')->count(),
            'clicked_count' => $logs->where('status', 'clicked')->count(),
        ];
    }

    public function renderTemplate(?string $template, mixed $recipient, ?CrmCampaign $campaign = null): string
    {
        if (!$template) {
            return '';
        }

        $name = (string) ($recipient->name ?? $recipient->recipient_name ?? '');
        $parts = preg_split('/\s+/', trim($name), 2) ?: [];

        return strtr($template, [
            '{{contact_name}}' => $name,
            '{{first_name}}' => $parts[0] ?? '',
            '{{last_name}}' => $parts[1] ?? '',
            '{{company_name}}' => (string) ($recipient->company_name ?? ''),
            '{{email}}' => (string) ($recipient->email ?? ''),
            '{{phone}}' => (string) ($recipient->phone ?? ''),
            '{{campaign_title}}' => (string) ($campaign?->name ?? ''),
            '{{campaign_code}}' => (string) ($campaign?->code ?? ''),
            '{{unsubscribe_link}}' => url('/unsubscribe/' . ($campaign?->id ?? 'campaign')),
        ]);
    }

    private function contactsForGroup(string $groupId): EloquentCollection
    {
        $ids = $this->descendantGroupIds($groupId);

        return Contact::query()
            ->with(['contactGroup', 'account', 'crmAccount'])
            ->whereIn('contact_group_id', $ids)
            ->where(function ($query) {
                $query->whereNull('active')->orWhere('active', '!=', false);
            })
            ->orderBy('name')
            ->get();
    }

    private function descendantGroupIds(string $groupId): array
    {
        $ids = [$groupId];
        $queue = [$groupId];

        while ($queue) {
            $children = ContactGroup::query()->whereIn('parent_id', $queue)->pluck('id')->all();
            if (!$children) {
                break;
            }

            $ids = array_merge($ids, $children);
            $queue = $children;
        }

        return array_values(array_unique($ids));
    }

    private function nextCode(string $prefix, mixed $query, string $field): string
    {
        $date = now()->format('ymd');
        $count = (clone $query)->where($field, 'like', "{$prefix}-{$date}-%")->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, $date, $count);
    }

    private function nextMessageCode(CrmCampaign $campaign, mixed $query, string $prefix): string
    {
        $count = (clone $query)->where('campaign_id', $campaign->id)->count() + 1;

        return sprintf('%s-%s-%02d', $campaign->code ?: 'CMP', $prefix, $count);
    }

    private function validEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function normalizePhone(string $phone): string
    {
        return trim(preg_replace('/[^\d+]/', '', $phone) ?: '');
    }

    private function validPhone(string $phone): bool
    {
        $digits = preg_replace('/\D/', '', $phone) ?: '';

        return strlen($digits) >= 7;
    }

    private function emailExists(CampaignEmailMessage $message, string $email): bool
    {
        return $message->recipients()->whereRaw('LOWER(email) = ?', [Str::lower($email)])->exists();
    }

    private function phoneExists(CampaignSmsMessage $message, string $phone): bool
    {
        return $message->recipients()->where('phone', $phone)->exists();
    }

    private function isUnsubscribed(Contact $contact, string $channel): bool
    {
        $flags = ['is_unsubscribed', 'unsubscribed', 'do_not_contact'];
        $flags[] = $channel === 'email' ? 'email_unsubscribed' : 'sms_unsubscribed';

        foreach ($flags as $flag) {
            if (array_key_exists($flag, $contact->getAttributes()) && (bool) $contact->{$flag}) {
                return true;
            }
        }

        return false;
    }

    private function assertEmailReady(CampaignEmailMessage $message, bool $testOnly = false, ?string $testEmail = null): void
    {
        abort_unless($message->is_active, 422, 'Inactive email messages cannot be sent.');
        abort_if(trim((string) $message->subject) === '', 422, 'Email subject is required before sending.');
        abort_if(trim((string) $message->body) === '', 422, 'Email body is required before sending.');
        abort_if($testOnly && !$this->validEmail((string) $testEmail), 422, 'A valid test email is required.');
        abort_if(!$testOnly && !$message->recipients()->where('is_valid_email', true)->where('is_unsubscribed', false)->whereNotIn('status', ['cancelled', 'skipped'])->exists(), 422, 'At least one valid email recipient is required.');
    }

    private function assertSmsReady(CampaignSmsMessage $message, bool $testOnly = false, ?string $testPhone = null): void
    {
        abort_unless($message->is_active, 422, 'Inactive SMS messages cannot be sent.');
        abort_if(trim((string) $message->body) === '', 422, 'SMS body is required before sending.');
        abort_if($testOnly && !$this->validPhone((string) $testPhone), 422, 'A valid test phone is required.');
        abort_if(!$testOnly && !$message->recipients()->where('is_valid_phone', true)->where('is_unsubscribed', false)->whereNotIn('status', ['cancelled', 'skipped'])->exists(), 422, 'At least one valid SMS recipient is required.');
    }

    private function finalizeMessageStatus(CampaignEmailMessage|CampaignSmsMessage $message, int $sent, int $failed): void
    {
        $status = $failed > 0 && $sent > 0 ? 'partially_sent' : ($failed > 0 ? 'failed' : 'sent');
        $message->update([
            'status' => $status,
            'sent_at' => $sent > 0 ? now() : $message->sent_at,
            'completed_at' => now(),
        ]);

        $campaign = $message->campaign()->first();
        if ($campaign) {
            $campaign->update([
                'status' => $status === 'failed' ? 'failed' : 'partially_sent',
                'sent_at' => $campaign->sent_at ?: now(),
            ]);
        }
    }

    private function logSkippedEmail(CampaignEmailMessage $message, array $row, string $error, string $source): void
    {
        $this->writeLog([
            'campaign_id' => $message->campaign_id,
            'campaign_email_message_id' => $message->id,
            'type' => 'email',
            'channel' => 'email',
            'message_title' => $message->title,
            'recipient_name' => $row['name'] ?? null,
            'company_name' => $row['company_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'contact_id' => $row['contact_id'] ?? null,
            'contact_group_id' => $row['contact_group_id'] ?? null,
            'status' => 'skipped',
            'error_message' => $error,
            'metadata' => ['source' => $source],
        ]);
    }

    private function logSkippedSms(CampaignSmsMessage $message, array $row, string $error, string $source): void
    {
        $this->writeLog([
            'campaign_id' => $message->campaign_id,
            'campaign_sms_message_id' => $message->id,
            'type' => 'sms',
            'channel' => 'sms',
            'message_title' => $message->title,
            'recipient_name' => $row['name'] ?? null,
            'company_name' => $row['company_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'contact_id' => $row['contact_id'] ?? null,
            'contact_group_id' => $row['contact_group_id'] ?? null,
            'status' => 'skipped',
            'error_message' => $error,
            'metadata' => ['source' => $source],
        ]);
    }

    private function writeEmailLog(CampaignEmailMessage $message, mixed $recipient, string $status, ?string $error = null, ?string $provider = 'mail', ?string $externalId = null): CampaignSendLog
    {
        return $this->writeLog([
            'campaign_id' => $message->campaign_id,
            'campaign_email_message_id' => $message->id,
            'campaign_email_recipient_id' => $recipient instanceof CampaignEmailRecipient ? $recipient->id : null,
            'contact_id' => $recipient->contact_id ?? null,
            'contact_group_id' => $recipient->contact_group_id ?? null,
            'type' => 'email',
            'channel' => 'email',
            'message_title' => $message->title,
            'recipient_name' => $recipient->name ?? null,
            'company_name' => $recipient->company_name ?? null,
            'email' => $recipient->email ?? null,
            'phone' => $recipient->phone ?? null,
            'to_address' => $recipient->email ?? null,
            'provider' => $provider,
            'status' => $status,
            'external_message_id' => $externalId,
            'provider_message_id' => $externalId,
            'error_message' => $error,
            'error' => $error,
        ]);
    }

    private function writeSmsLog(CampaignSmsMessage $message, mixed $recipient, string $status, ?string $error = null, ?string $provider = null, ?string $externalId = null, ?string $smsLogId = null, array|string|null $providerResponse = null): CampaignSendLog
    {
        return $this->writeLog([
            'campaign_id' => $message->campaign_id,
            'campaign_sms_message_id' => $message->id,
            'campaign_sms_recipient_id' => $recipient instanceof CampaignSmsRecipient ? $recipient->id : null,
            'sms_log_id' => $smsLogId,
            'contact_id' => $recipient->contact_id ?? null,
            'contact_group_id' => $recipient->contact_group_id ?? null,
            'type' => 'sms',
            'channel' => 'sms',
            'message_title' => $message->title,
            'recipient_name' => $recipient->name ?? null,
            'company_name' => $recipient->company_name ?? null,
            'email' => $recipient->email ?? null,
            'phone' => $recipient->phone ?? null,
            'to_address' => $recipient->phone ?? null,
            'provider' => $provider,
            'status' => $status,
            'external_message_id' => $externalId,
            'provider_message_id' => $externalId,
            'error_message' => $error,
            'error' => $error,
            'provider_response' => is_array($providerResponse) ? $providerResponse : ($providerResponse ? ['response' => $providerResponse] : null),
        ]);
    }

    private function writeLog(array $payload): CampaignSendLog
    {
        $status = $payload['status'] ?? 'pending';
        $timestampColumn = match ($status) {
            'queued' => 'queued_at',
            'sent' => 'sent_at',
            'delivered' => 'delivered_at',
            'opened' => 'opened_at',
            'clicked' => 'clicked_at',
            'failed' => 'failed_at',
            'bounced' => 'bounced_at',
            'skipped', 'unsubscribed', 'cancelled' => 'skipped_at',
            default => null,
        };

        if ($timestampColumn && empty($payload[$timestampColumn])) {
            $payload[$timestampColumn] = now();
        }

        $payload['user_add_id'] = auth()->id();

        return CampaignSendLog::query()->create($payload);
    }
}
