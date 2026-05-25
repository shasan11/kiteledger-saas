<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnlinePaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class OnlinePaymentSettingController extends Controller
{
    public function show(Request $request)
    {
        $settings = OnlinePaymentSetting::current();

        return response()->json($this->serialize($settings));
    }

    public function upsert(Request $request)
    {
        $validated = $request->validate([
            'enable_online_payment' => ['boolean'],
            'allow_public_invoice_payment' => ['boolean'],
            'allow_partial_invoice_payment' => ['boolean'],
            'allow_invoice_overpayment' => ['boolean'],
            'minimum_partial_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_link_expiry_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'default_gateway' => ['nullable', 'string', 'max:40'],
            'receipt_email_enabled' => ['boolean'],
            'webhook_logging_enabled' => ['boolean'],
            'enable_google_login' => ['boolean'],
            'google_client_id' => ['nullable', 'string', 'max:255'],
            'google_client_secret' => ['nullable', 'string', 'max:500'],
            'google_redirect_uri' => ['nullable', 'string', 'max:500'],
            'google_allowed_domains' => ['nullable', 'string', 'max:500'],
        ]);

        $settings = OnlinePaymentSetting::query()->first() ?? new OnlinePaymentSetting();

        $fillable = array_diff_key($validated, array_flip(['google_client_secret']));
        $settings->fill($fillable);

        if (!empty($validated['google_client_secret']) && !str_contains($validated['google_client_secret'] ?? '', '****')) {
            $settings->google_client_secret_encrypted = Crypt::encryptString($validated['google_client_secret']);
        }

        $settings->active = true;
        $settings->save();

        return response()->json($this->serialize($settings));
    }

    private function serialize(OnlinePaymentSetting $settings): array
    {
        $data = $settings->toArray();
        unset($data['google_client_secret_encrypted']);

        $data['google_client_secret_configured'] = !empty($settings->google_client_secret_encrypted);
        $data['google_redirect_uri'] = $settings->google_redirect_uri ?? url('/auth/google/callback');

        return $data;
    }
}
