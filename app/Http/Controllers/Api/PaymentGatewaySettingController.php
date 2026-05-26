<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\Request;

class PaymentGatewaySettingController extends Controller
{
    protected array $providers = ['stripe', 'paypal', 'razorpay', 'khalti', 'esewa'];

    protected array $credentialFields = [
        'stripe' => ['publishable_key', 'secret_key', 'webhook_secret', 'statement_descriptor'],
        'paypal' => ['client_id', 'client_secret', 'webhook_id'],
        'razorpay' => ['key_id', 'key_secret', 'webhook_secret'],
        'khalti' => ['public_key', 'secret_key', 'live_secret_key', 'webhook_secret'],
        'esewa' => ['merchant_id', 'secret_key'],
    ];

    protected array $publicFields = [
        'stripe' => ['publishable_key'],
        'razorpay' => ['key_id'],
        'khalti' => ['public_key'],
    ];

    public function index(Request $request)
    {
        $manager = app(PaymentGatewayManager::class);
        $settings = PaymentGatewaySetting::query()->get()->keyBy('provider');

        $result = collect($this->providers)->map(function ($provider) use ($settings, $manager) {
            $setting = $settings->get($provider);
            return $this->serializeSetting($provider, $setting);
        });

        return response()->json(['data' => $result->values()]);
    }

    public function show(Request $request, string $provider)
    {
        $this->validateProvider($provider);
        $setting = PaymentGatewaySetting::forProvider($provider);
        return response()->json($this->serializeSetting($provider, $setting));
    }

    public function upsert(Request $request, string $provider)
    {
        $this->validateProvider($provider);

        $validated = $request->validate([
            'enabled' => ['boolean'],
            'mode' => ['nullable', 'in:test,live,sandbox'],
            'display_name' => ['nullable', 'string', 'max:100'],
            'allowed_currencies' => ['nullable', 'array'],
            'allowed_currencies.*' => ['string', 'max:10'],
            'default_currency' => ['nullable', 'string', 'max:10'],
            'webhook_enabled' => ['boolean'],
            'credentials' => ['nullable', 'array'],
        ]);

        $setting = PaymentGatewaySetting::forProvider($provider) ?? new PaymentGatewaySetting(['provider' => $provider]);

        $setting->fill([
            'provider' => $provider,
            'enabled' => $validated['enabled'] ?? $setting->enabled ?? false,
            'mode' => $validated['mode'] ?? $setting->mode ?? 'test',
            'display_name' => $validated['display_name'] ?? $setting->display_name,
            'allowed_currencies' => $validated['allowed_currencies'] ?? $setting->allowed_currencies,
            'default_currency' => $validated['default_currency'] ?? $setting->default_currency,
            'webhook_enabled' => $validated['webhook_enabled'] ?? $setting->webhook_enabled ?? true,
            'active' => true,
        ]);

        // Store credentials encrypted
        if (!empty($validated['credentials'])) {
            $existing = $setting->exists ? $setting->getCredentials() : [];
            $incoming = $validated['credentials'];

            // Only update non-empty values so masked/unchanged fields don't wipe real ones
            foreach ($incoming as $key => $value) {
                if ($value !== null && $value !== '' && !$this->isMasked($value)) {
                    $existing[$key] = $value;
                }
            }

            // Store public config (safe keys)
            $publicKeys = $this->publicFields[$provider] ?? [];
            $publicConfig = array_intersect_key($existing, array_flip($publicKeys));
            $setting->public_config = $publicConfig;

            $setting->setCredentials($existing);
        }

        $setting->save();

        return response()->json($this->serializeSetting($provider, $setting));
    }

    public function testCredentials(Request $request, string $provider)
    {
        $this->validateProvider($provider);
        $setting = PaymentGatewaySetting::forProvider($provider);

        if (!$setting) {
            return response()->json(['success' => false, 'message' => 'Gateway not configured.']);
        }

        $credentials = $setting->getCredentials();
        $required = $this->credentialFields[$provider] ?? [];

        foreach ($required as $field) {
            if (empty($credentials[$field])) {
                return response()->json([
                    'success' => false,
                    'message' => "Missing required credential: {$field}",
                ]);
            }
        }

        // Basic connectivity test per provider
        try {
            $this->runConnectivityTest($provider, $credentials, $setting->mode);
            return response()->json(['success' => true, 'message' => 'Credentials appear valid.']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function runConnectivityTest(string $provider, array $credentials, string $mode): void
    {
        match ($provider) {
            'stripe' => $this->testStripe($credentials),
            'paypal' => $this->testPaypal($credentials, $mode),
            'razorpay' => $this->testRazorpay($credentials),
            default => null, // Skip test for providers without simple ping
        };
    }

    private function testStripe(array $credentials): void
    {
        $ch = curl_init('https://api.stripe.com/v1/account');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $credentials['secret_key']],
        ]);
        $response = json_decode(curl_exec($ch), true);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200) {
            throw new \RuntimeException($response['error']['message'] ?? 'Stripe authentication failed.');
        }
    }

    private function testPaypal(array $credentials, string $mode): void
    {
        $baseUrl = $mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
        $ch = curl_init($baseUrl . '/v1/oauth2/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
            CURLOPT_USERPWD => $credentials['client_id'] . ':' . $credentials['client_secret'],
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (empty($response['access_token'])) {
            throw new \RuntimeException('PayPal authentication failed. Check credentials.');
        }
    }

    private function testRazorpay(array $credentials): void
    {
        $ch = curl_init('https://api.razorpay.com/v1/orders?count=1');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $credentials['key_id'] . ':' . $credentials['key_secret'],
        ]);
        $response = json_decode(curl_exec($ch), true);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200) {
            throw new \RuntimeException($response['error']['description'] ?? 'Razorpay authentication failed.');
        }
    }

    private function serializeSetting(string $provider, ?PaymentGatewaySetting $setting): array
    {
        $requiredCreds = $this->credentialFields[$provider] ?? [];
        $maskedCreds = [];

        if ($setting) {
            $credentials = $setting->getCredentials();
            foreach ($requiredCreds as $field) {
                $value = $credentials[$field] ?? null;
                if ($value) {
                    $maskedCreds[$field] = $setting->maskCredential($value);
                } else {
                    $maskedCreds[$field] = null;
                }
            }
        } else {
            foreach ($requiredCreds as $field) {
                $maskedCreds[$field] = null;
            }
        }

        return [
            'provider' => $provider,
            'display_name' => $setting?->display_name ?? ucfirst($provider),
            'enabled' => $setting?->enabled ?? false,
            'mode' => $setting?->mode ?? 'test',
            'allowed_currencies' => $setting?->allowed_currencies ?? [],
            'default_currency' => $setting?->default_currency,
            'webhook_enabled' => $setting?->webhook_enabled ?? true,
            'configured' => $setting && count($setting->getCredentials()) > 0,
            'masked_credentials' => $maskedCreds,
            'webhook_url' => url('/api/webhooks/payments/' . $provider),
        ];
    }

    private function validateProvider(string $provider): void
    {
        if (!in_array($provider, $this->providers, true)) {
            abort(404, "Unknown payment provider: {$provider}");
        }
    }

    private function isMasked(string $value): bool
    {
        return str_contains($value, '****');
    }
}
