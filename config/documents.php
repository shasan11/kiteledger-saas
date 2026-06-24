<?php

return [
    'disk' => env('DOCUMENT_DISK', 'local'),
    'max_upload_mb' => (int) env('DOCUMENT_MAX_UPLOAD_MB', 10),
    'scan_timeout_seconds' => (int) env('DOCUMENT_SCAN_TIMEOUT', 120),
    'ai_scan_enabled' => (bool) env('AI_DOCUMENT_SCAN_ENABLED', true),
    'ai_provider' => env('DOCUMENT_AI_PROVIDER'), // null => use AI module setting
    'ai_model' => env('DOCUMENT_AI_MODEL'),
];
