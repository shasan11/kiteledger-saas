<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsConfig;
use App\Services\Sms\SmsConfigResolver;
use App\Services\Sms\SmsPhoneNormalizer;
use App\Services\Sms\SmsSender;
use App\Services\Sms\SmsTemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsUtilityController extends Controller
{
    public function sendTest(Request $request, SmsSender $sender, SmsConfigResolver $resolver): JsonResponse
    {
        $this->authorizeSms($request, 'sms.send');

        $data = $request->validate([
            'sms_config_id' => ['nullable', 'uuid', 'exists:sms_configs,id'],
            'provider' => ['nullable', 'string', 'max:40'],
            'phone' => ['required', 'string', 'max:80'],
            'message' => ['required', 'string', 'max:1600'],
        ]);

        $config = $resolver->activeDefault($data['provider'] ?? null, $data['sms_config_id'] ?? null);
        $result = $config
            ? $sender->test($config, $data['phone'], $data['message'])
            : $sender->send($data['phone'], $data['message'], $data);

        return response()->json([
            'success' => $result->success,
            'provider' => $result->provider,
            'provider_message_id' => $result->providerMessageId,
            'provider_response' => $result->providerResponse,
            'error' => $result->error,
        ], $result->success ? 200 : 422);
    }

    public function previewTemplate(Request $request, SmsTemplateRenderer $renderer, SmsSender $sender): JsonResponse
    {
        $this->authorizeSms($request, 'sms_template.view');

        $data = $request->validate([
            'body' => ['required', 'string', 'max:1600'],
            'data' => ['nullable', 'array'],
        ]);
        $body = $renderer->render($data['body'], $data['data'] ?? []);

        return response()->json([
            'body' => $body,
            'characters' => mb_strlen($body),
            'segments' => $sender->segmentCount($body),
        ]);
    }

    public function validatePhone(Request $request, SmsPhoneNormalizer $normalizer): JsonResponse
    {
        $this->authorizeSms($request, 'sms.send');

        $data = $request->validate([
            'phone' => ['required', 'string', 'max:80'],
            'default_country_code' => ['nullable', 'string', 'max:12'],
        ]);
        $normalized = $normalizer->normalize($data['phone'], $data['default_country_code'] ?? null);

        return response()->json([
            'phone' => $data['phone'],
            'normalized_phone' => $normalized,
            'valid' => $normalizer->isValid($normalized),
        ]);
    }

    private function authorizeSms(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $role = method_exists($user, 'getRoleNames') ? $user->getRoleNames()->map(fn ($name) => strtolower((string) $name))->all() : [];
        $isAdmin = in_array('super admin', $role, true) || in_array('super-admin', $role, true) || in_array('admin', $role, true);

        abort_unless($isAdmin || (method_exists($user, 'can') && $user->can($permission)), 403, "Missing permission: {$permission}");
    }
}
