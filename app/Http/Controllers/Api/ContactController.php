<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(Contact::class)
            ->allowedIncludes(...['branch', 'contactGroup', 'creditTerm'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('phone', 'like', "%{$value}%")
                            ->orWhere('email', 'like', "%{$value}%")
                            ->orWhere('pan', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('contact_group_id'),
                AllowedFilter::exact('contact_type'),
                AllowedFilter::exact('accept_purchase'),
                AllowedFilter::exact('credit_term_id'),
            ])
            ->allowedSorts([
                'id',
                'name',
                'code',
                'contact_type',
                'credit_limit',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ContactResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateContact($request);

        $record = Contact::create($data);

        return new ContactResource($record->fresh());
    }

    public function show(Contact $contact)
    {
        return new ContactResource($contact);
    }

    public function update(Request $request, Contact $contact)
    {
        $data = $this->validateContact($request, true);

        $contact->update($data);

        return new ContactResource($contact->fresh());
    }

    public function destroy(Contact $contact)
    {
        DB::transaction(function () use ($contact) {
            $contact->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'records.*.contact_group_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
            'records.*.contact_type' => ['required', 'in:customer,supplier,lead'],
            'records.*.name' => ['required', 'string', 'max:180'],
            'records.*.code' => ['nullable', 'string', 'max:50'],
            'records.*.address' => ['nullable', 'string'],
            'records.*.pan' => ['nullable', 'string', 'max:80'],
            'records.*.phone' => ['nullable', 'string', 'max:40'],
            'records.*.accept_purchase' => ['nullable', 'boolean'],
            'records.*.email' => ['nullable', 'email', 'max:120'],
            'records.*.credit_term_id' => ['nullable', 'uuid', 'exists:credit_terms,id'],
            'records.*.credit_limit' => ['nullable', 'numeric', 'min:0'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => Contact::create($record));
        });

        return ContactResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:contacts,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.contact_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'records.*.contact_type' => ['sometimes', 'required', 'in:customer,supplier,lead'],
            'records.*.name' => ['sometimes', 'required', 'string', 'max:180'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.address' => ['sometimes', 'nullable', 'string'],
            'records.*.pan' => ['sometimes', 'nullable', 'string', 'max:80'],
            'records.*.phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'records.*.accept_purchase' => ['sometimes', 'nullable', 'boolean'],
            'records.*.email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'records.*.credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'records.*.credit_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = Contact::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return ContactResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:contacts,id'],
        ]);

        DB::transaction(function () use ($data) {
            Contact::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateContact(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'contact_group_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'contact_type' => [$required, 'in:customer,supplier,lead'],
            'name' => [$required, 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string'],
            'pan' => ['sometimes', 'nullable', 'string', 'max:80'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'accept_purchase' => ['sometimes', 'nullable', 'boolean'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'credit_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
