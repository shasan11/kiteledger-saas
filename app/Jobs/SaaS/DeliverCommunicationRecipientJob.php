<?php

namespace App\Jobs\SaaS;

use App\Models\Central\CommunicationCampaign;
use App\Models\Central\CommunicationDelivery;
use App\Models\Central\CommunicationRecipient;
use App\Models\Central\CommunicationSuppression;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class DeliverCommunicationRecipientJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $recipientId) {}

    public function handle(PlatformSettingsService $settings): void
    {
        $recipient = CommunicationRecipient::with('campaign')->findOrFail($this->recipientId);
        $campaign = $recipient->campaign;
        if ($campaign->status === 'cancelled') {
            $recipient->update(['status' => 'cancelled']);

            return;
        }
        $destination = $campaign->channel === 'email' ? $recipient->email : $recipient->phone;
        $delivery = CommunicationDelivery::firstOrCreate(['campaign_id' => $campaign->id, 'recipient_id' => $recipient->id]);

        if (! $destination || ! $recipient->consented_at || CommunicationSuppression::where(['channel' => $campaign->channel, 'destination' => $destination])->exists()) {
            $delivery->update(['status' => 'suppressed', 'error_message' => 'Recipient is missing consent, destination, or is suppressed.']);
            $recipient->update(['status' => 'suppressed']);
            $this->completeCampaignWhenFinished($campaign->id);

            return;
        }

        $delivery->increment('attempts');
        try {
            if ($campaign->channel === 'email') {
                $settings->applyMailConfiguration();
                $unsubscribe = route('central.communication.unsubscribe', $recipient->unsubscribe_token);
                $html = $campaign->content.'<p style="font-size:12px;color:#667"><a href="'.e($unsubscribe).'">Unsubscribe from marketing emails</a></p>';
                Mail::html($html, fn ($mail) => $mail->to($recipient->email, $recipient->name)->subject($campaign->subject ?: $campaign->name));
                $reference = null;
            } else {
                $sid = $settings->get('communication.twilio_account_sid');
                $token = $settings->get('communication.twilio_auth_token');
                $from = $settings->get('communication.twilio_from_number');
                if (! $settings->get('communication.sms_enabled', false) || ! $sid || ! $token || ! $from) {
                    throw new \RuntimeException('Central SMS delivery is not configured.');
                }
                $response = Http::withBasicAuth($sid, $token)->asForm()->timeout(20)->post(
                    "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json",
                    ['From' => $from, 'To' => $recipient->phone, 'Body' => trim(strip_tags($campaign->content))]
                )->throw();
                $reference = $response->json('sid');
            }
            $delivery->update(['status' => 'sent', 'provider_reference' => $reference, 'error_message' => null, 'sent_at' => now()]);
            $recipient->update(['status' => 'sent']);
            $this->completeCampaignWhenFinished($campaign->id);
        } catch (\Throwable $exception) {
            $delivery->update(['status' => 'failed', 'error_message' => str($exception->getMessage())->limit(500)]);
            $recipient->update(['status' => 'failed']);
            throw $exception;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $recipient = CommunicationRecipient::find($this->recipientId);
        CommunicationDelivery::where('recipient_id', $this->recipientId)->update(['status' => 'failed', 'error_message' => str($exception->getMessage())->limit(500)]);
        if ($recipient) {
            $this->completeCampaignWhenFinished($recipient->campaign_id);
        }
    }

    private function completeCampaignWhenFinished(int $campaignId): void
    {
        $unfinished = CommunicationRecipient::where('campaign_id', $campaignId)->whereIn('status', ['pending', 'queued', 'sending'])->exists();
        if (! $unfinished) {
            CommunicationCampaign::whereKey($campaignId)->whereNotIn('status', ['cancelled'])->update(['status' => 'completed', 'completed_at' => now()]);
        }
    }
}
