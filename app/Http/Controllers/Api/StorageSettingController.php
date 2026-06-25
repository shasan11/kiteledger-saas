<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Settings\StorageSettingService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StorageSettingController extends Controller
{
    public function show(StorageSettingService $settings)
    {
        return response()->json($settings->all(masked: true));
    }

    public function update(Request $request, StorageSettingService $settings)
    {
        $validated = $this->validatePayload($request, $settings);

        return response()->json($settings->save($validated));
    }

    public function test(Request $request, StorageSettingService $settings)
    {
        $validated = $this->validatePayload($request, $settings);
        $settings->save($validated);

        try {
            $settings->test();
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'AWS storage connection failed. Please check credentials, region, and bucket.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'AWS storage connection successful.',
        ]);
    }

    private function validatePayload(Request $request, StorageSettingService $settings): array
    {
        $driver = $request->input('media_disk', $request->input('storage_driver', 'public'));
        $request->merge(['media_disk' => $driver === 's3' ? 's3' : 'public']);
        $s3 = $request->input('media_disk') === 's3';

        $credentialRule = fn (string $key) => [
            Rule::requiredIf($s3 && ! $settings->hasCredential($key)),
            'nullable',
            'string',
            'max:500',
        ];

        return $request->validate([
            'media_disk' => ['required', Rule::in(['public', 's3'])],
            'aws_access_key_id' => $credentialRule('aws_access_key_id'),
            'aws_secret_access_key' => $credentialRule('aws_secret_access_key'),
            'aws_default_region' => [Rule::requiredIf($s3), 'nullable', 'string', 'max:100'],
            'aws_bucket' => [Rule::requiredIf($s3), 'nullable', 'string', 'max:255'],
            'aws_url' => ['nullable', 'url', 'max:500'],
            'aws_endpoint' => ['nullable', 'url', 'max:500'],
            'aws_use_path_style_endpoint' => ['nullable', 'boolean'],
            'aws_media_prefix' => ['nullable', 'string', 'max:255'],
            'aws_visibility' => ['nullable', Rule::in(['public', 'private'])],
        ]);
    }
}
