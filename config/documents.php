<?php

return [
    'disk' => env('DOCUMENT_DISK', 'local'),

    /*
     * Application-level authority for upload size. Controller validation,
     * storage validation and the frontend hint all derive from this value.
     *
     * The web server and PHP must allow at least this much, otherwise the
     * request is rejected before Laravel ever sees it:
     *   php.ini      upload_max_filesize, post_max_size
     *   nginx        client_max_body_size
     *   apache       LimitRequestBody
     */
    'max_upload_mb' => (int) env('DOCUMENT_MAX_UPLOAD_MB', 10),

    'scan_timeout_seconds' => (int) env('DOCUMENT_SCAN_TIMEOUT', 120),

    /*
     * Queue the extraction job is dispatched onto. Leave as "default" unless a
     * dedicated worker is running for it, otherwise scans will never execute.
     */
    'queue' => env('DOCUMENT_SCAN_QUEUE', 'default'),
    'scan_tries' => (int) env('DOCUMENT_SCAN_TRIES', 3),

    /* Upper bound on DOCX text handed to the model, to protect the context window. */
    'max_plain_text_chars' => (int) env('DOCUMENT_MAX_PLAIN_TEXT_CHARS', 60000),

    'ai_scan_enabled' => (bool) env('AI_DOCUMENT_SCAN_ENABLED', true),
    'ai_provider' => env('DOCUMENT_AI_PROVIDER'), // null => use AI module setting
    'ai_model' => env('DOCUMENT_AI_MODEL'),
];
