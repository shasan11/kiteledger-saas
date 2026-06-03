<?php

namespace App\Http\Controllers\Api;

use App\Models\Email;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmailController extends BaseCrudApiController
{
    protected string $modelClass = Email::class;

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
        'sender_email',
        'receiver_email',
        'subject',
        'body',
        'branch.name',
    ];

    protected array $filterable = [
        'branch_id',
        'email_status',
    ];

    protected array $booleanFilters = ['active'];

    protected array $sortable = [
        'id', 'sender_email', 'receiver_email', 'subject',
        'email_status', 'branch_id', 'active', 'created_at', 'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id'      => ['nullable', 'uuid', 'exists:branches,id'],
        'sender_email'   => ['required', 'email', 'max:180'],
        'receiver_email' => ['required', 'email', 'max:180'],
        'subject'        => ['required', 'string', 'max:255'],
        'body'           => ['nullable', 'string'],
        'email_status'   => ['nullable', 'string', 'in:PENDING,SENT,FAILED'],
        'active'         => ['nullable', 'boolean'],
        'user_add_id'    => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'      => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'sender_email'   => ['sometimes', 'required', 'email', 'max:180'],
            'receiver_email' => ['sometimes', 'required', 'email', 'max:180'],
            'subject'        => ['sometimes', 'required', 'string', 'max:255'],
            'body'           => ['sometimes', 'nullable', 'string'],
            'email_status'   => ['sometimes', 'nullable', 'string', 'in:PENDING,SENT,FAILED'],
            'active'         => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'    => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function sendDocumentEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => ['required', 'string', 'max:2000'],
            'cc' => ['nullable', 'string', 'max:2000'],
            'bcc' => ['nullable', 'string', 'max:2000'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'attachment' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $to = $this->parseEmailList($validated['to']);
        $cc = $this->parseEmailList($validated['cc'] ?? '');
        $bcc = $this->parseEmailList($validated['bcc'] ?? '');

        if ($to === []) {
            throw ValidationException::withMessages([
                'to' => ['At least one valid recipient email is required.'],
            ]);
        }

        $attachment = $request->file('attachment');
        $attachmentName = Str::of($attachment->getClientOriginalName() ?: 'document.pdf')
            ->replaceMatches('/[^\w.\- ]+/', '_')
            ->trim()
            ->toString();

        $attachmentName = $attachmentName !== '' ? $attachmentName : 'document.pdf';
        $body = nl2br(e($validated['body']));

        Mail::html($body, function ($message) use ($to, $cc, $bcc, $validated, $attachment, $attachmentName) {
            $message->to($to)->subject($validated['subject']);

            if ($cc !== []) {
                $message->cc($cc);
            }

            if ($bcc !== []) {
                $message->bcc($bcc);
            }

            $message->attach($attachment->getRealPath(), [
                'as' => $attachmentName,
                'mime' => 'application/pdf',
            ]);
        });

        foreach (array_keys($to) as $recipient) {
            Email::query()->create([
                'sender_email' => config('mail.from.address') ?: 'system@localhost',
                'receiver_email' => $recipient,
                'subject' => $validated['subject'],
                'body' => $validated['body'],
                'email_status' => 'SENT',
                'active' => true,
                'user_add_id' => auth()->id(),
            ]);
        }

        return response()->json([
            'message' => 'Email sent successfully.',
            'recipients' => count($to),
        ]);
    }

    private function parseEmailList(?string $value): array
    {
        return collect(preg_split('/[,;]+/', (string) $value) ?: [])
            ->map(fn ($item) => trim($item))
            ->filter()
            ->map(function (string $item) {
                if (preg_match('/^(.*?)<([^>]+)>$/', $item, $matches)) {
                    return [
                        'name' => trim($matches[1], " \t\n\r\0\x0B\"'"),
                        'address' => trim($matches[2]),
                    ];
                }

                return ['address' => $item];
            })
            ->filter(function (array $recipient) {
                return Validator::make(
                    ['email' => $recipient['address'] ?? null],
                    ['email' => ['required', 'email']]
                )->passes();
            })
            ->mapWithKeys(function (array $recipient) {
                $address = $recipient['address'];
                $name = $recipient['name'] ?? null;

                return [$address => $name ?: null];
            })
            ->all();
    }
}
