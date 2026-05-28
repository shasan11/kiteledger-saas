<?php

namespace App\Http\Controllers\Api;

use App\Models\EmailConfig;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Email;

class EmailConfigController extends BaseCrudApiController
{
    protected string $modelClass = EmailConfig::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch'];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'email_config_name',
        'email_host',
        'email_user',
        'branch.name',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = ['active'];

    protected array $sortable = [
        'id', 'email_config_name', 'email_host', 'email_port',
        'email_user', 'branch_id', 'active', 'created_at', 'updated_at',
    ];

    protected string $defaultSort = 'email_config_name';

    protected array $storeRules = [
        'branch_id'         => ['nullable', 'uuid', 'exists:branches,id'],
        'email_config_name' => ['required', 'string', 'max:120'],
        'mailer'            => ['nullable', 'string', 'max:40'],
        'email_host'        => ['required', 'string', 'max:180'],
        'email_port'        => ['required', 'integer', 'min:1', 'max:65535'],
        'encryption'        => ['nullable', 'string', 'max:20'],
        'email_user'        => ['required', 'string', 'max:180'],
        'email_pass'        => ['required', 'string', 'max:255'],
        'from_name'         => ['nullable', 'string', 'max:120'],
        'from_address'      => ['nullable', 'email', 'max:180'],
        'active'            => ['nullable', 'boolean'],
        'user_add_id'       => ['nullable', 'integer', 'exists:users,id'],
    ];

    public function index(Request $request)
    {
        $this->checkAccess($request, 'index');

        $record = $this->singleConfig();

        return response()->json($record ? $this->serializeRecord($record) : null);
    }

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $record = $this->singleConfig();
        $rules = $record ? $this->makeRulesPartial($this->storeRules) : $this->storeRules;
        $validated = $this->validateCompat($request->all(), $rules);

        if ($record && array_key_exists('email_pass', $validated) && empty($validated['email_pass'])) {
            unset($validated['email_pass']);
        }

        $record = $record ?: new EmailConfig();
        $record->fill($validated);
        $record->save();
        $record->load($this->eagerLoadRelations());

        return response()->json($this->serializeRecord($record), $record->wasRecentlyCreated ? 201 : 200);
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'         => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'email_config_name' => ['sometimes', 'required', 'string', 'max:120'],
            'mailer'            => ['sometimes', 'nullable', 'string', 'max:40'],
            'email_host'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_port'        => ['sometimes', 'required', 'integer', 'min:1', 'max:65535'],
            'encryption'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'email_user'        => ['sometimes', 'required', 'string', 'max:180'],
            'email_pass'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'from_name'         => ['sometimes', 'nullable', 'string', 'max:120'],
            'from_address'      => ['sometimes', 'nullable', 'email', 'max:180'],
            'active'            => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'       => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        unset($data['email_pass']);
        return $data;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (array_key_exists('email_pass', $parentData) && empty($parentData['email_pass'])) {
            unset($parentData['email_pass']);
        }
        return $parentData;
    }

    protected function singleConfig(): ?EmailConfig
    {
        return EmailConfig::query()
            ->with($this->eagerLoadRelations())
            ->orderByDesc('active')
            ->orderBy('created_at')
            ->first();
    }

    /**
     * Test SMTP credentials by attempting to send a real test message.
     *
     * Accepts either:
     *   - the full form payload (so the user can validate before saving), or
     *   - blank password fields, in which case we fall back to the stored
     *     password from the active EmailConfig row (useful for re-testing
     *     after a partial edit).
     *
     * The test always uses a freshly-built Symfony EsmtpTransport so it
     * never depends on Laravel's cached mailer instance, and never mutates
     * runtime config.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $this->checkAccess($request, 'store');

        $validated = $request->validate([
            'email_host'   => ['nullable', 'string', 'max:180'],
            'email_port'   => ['nullable', 'integer', 'min:1', 'max:65535'],
            'encryption'   => ['nullable', 'string', 'max:20'],
            'email_user'   => ['nullable', 'string', 'max:180'],
            'email_pass'   => ['nullable', 'string', 'max:255'],
            'from_name'    => ['nullable', 'string', 'max:120'],
            'from_address' => ['nullable', 'email', 'max:180'],
            'to'           => ['nullable', 'email', 'max:180'],
        ]);

        // Pull a stored config to backfill anything the user didn't type in
        // (commonly: an unchanged password during edit-and-test flow).
        $stored = $this->singleConfig();

        $host       = $validated['email_host']   ?? $stored?->email_host;
        $port       = (int) ($validated['email_port'] ?? $stored?->email_port ?? 0);
        $encryption = $validated['encryption']   ?? $stored?->encryption;
        $username   = $validated['email_user']   ?? $stored?->email_user;
        $password   = !empty($validated['email_pass']) ? $validated['email_pass'] : $stored?->email_pass;
        $fromName   = $validated['from_name']    ?? $stored?->from_name;
        $fromAddr   = $validated['from_address'] ?? $stored?->from_address ?? $username;
        $to         = $validated['to']           ?? $request->user()?->email ?? $fromAddr;

        if (!$host || !$port || !$username || !$password || !$fromAddr || !$to) {
            return response()->json([
                'success' => false,
                'stage'   => 'validation',
                'message' => 'Host, port, username, password, from-address and recipient are all required to run a test.',
            ], 422);
        }

        // Map Laravel-style encryption hints onto the Symfony transport
        // options. 'ssl' implies an implicit-TLS connection, 'tls' (or 'starttls')
        // upgrades after EHLO, anything else (or 'none') stays plaintext.
        $useImplicitTls = strtolower((string) $encryption) === 'ssl';

        try {
            $transport = new EsmtpTransport($host, $port, $useImplicitTls);
            $transport->setUsername($username);
            $transport->setPassword($password);

            // Open the SMTP connection eagerly so authentication failures
            // surface here (rather than only on first send).
            $transport->start();

            $message = (new Email())
                ->from($fromName ? "{$fromName} <{$fromAddr}>" : $fromAddr)
                ->to($to)
                ->subject('KiteLedger SMTP connection test')
                ->text("This is a test message from KiteLedger confirming your SMTP credentials work.\n\nIf you received this, your email configuration is valid.");

            (new Mailer($transport))->send($message);

            return response()->json([
                'success' => true,
                'stage'   => 'sent',
                'message' => "Test email sent to {$to}. Check the inbox to confirm delivery.",
                'host'    => $host,
                'port'    => $port,
                'to'      => $to,
            ]);
        } catch (\Symfony\Component\Mailer\Exception\TransportExceptionInterface $e) {
            // Authentication / connection failures land here with the
            // provider's actual error message — most useful for the user.
            return response()->json([
                'success' => false,
                'stage'   => 'transport',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'stage'   => 'unknown',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
