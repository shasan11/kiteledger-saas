<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactGroupResource;
use App\Models\ContactGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ContactGroupController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(ContactGroup::class)
            ->allowedIncludes(...['branch', 'parent', 'contacts'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('description', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('parent_id'),
            ])
            ->allowedSorts([
                'id',
                'name',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ContactGroupResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateContactGroup($request);

        $record = ContactGroup::create($data);

        return new ContactGroupResource($record->fresh());
    }

    public function show(ContactGroup $contactGroup)
    {
        return new ContactGroupResource($contactGroup);
    }

    public function update(Request $request, ContactGroup $contactGroup)
    {
        $data = $this->validateContactGroup($request, true, $contactGroup->id);

        $contactGroup->update($data);

        return new ContactGroupResource($contactGroup->fresh());
    }

    public function destroy(ContactGroup $contactGroup)
    {
        DB::transaction(function () use ($contactGroup) {
            $contactGroup->delete();
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
            'records.*.name' => ['required', 'string', 'max:120'],
            'records.*.parent_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
            'records.*.description' => ['nullable', 'string'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => ContactGroup::create($record));
        });

        return ContactGroupResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:contact_groups,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.name' => ['sometimes', 'required', 'string', 'max:120'],
            'records.*.parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = ContactGroup::findOrFail($record['id']);

                if (array_key_exists('parent_id', $record) && $record['parent_id'] === $model->id) {
                    abort(422, 'Parent cannot be the same as the current contact group.');
                }

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return ContactGroupResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:contact_groups,id'],
        ]);

        DB::transaction(function () use ($data) {
            ContactGroup::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateContactGroup(Request $request, bool $partial = false, ?string $currentId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';

        $data = $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'name' => [$required, 'string', 'max:120'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        if ($currentId && array_key_exists('parent_id', $data) && $data['parent_id'] === $currentId) {
            abort(422, 'Parent cannot be the same as the current contact group.');
        }

        return $data;
    }
}
