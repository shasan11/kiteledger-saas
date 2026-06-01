<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContactQueryTool extends BaseQueryTool
{
    public function search(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['contacts'])) {
            return $this->empty('contact.search', 'Contact search', $request);
        }

        $term = trim((string) $request->input('q', $request->input('message', '')));
        $query = DB::table('contacts')->select(['id', 'name', 'code', 'contact_type', 'phone', 'email', 'active']);
        $this->applyActive($query, 'contacts');

        if ($term !== '') {
            $query->where(function ($query) use ($term) {
                $query->where('name', 'like', '%' . $term . '%')
                    ->orWhere('code', 'like', '%' . $term . '%')
                    ->orWhere('phone', 'like', '%' . $term . '%')
                    ->orWhere('email', 'like', '%' . $term . '%');
            });
        }

        $records = $query->limit(20)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'name' => $row->name,
            'code' => $row->code,
            'contact_type' => $row->contact_type,
            'phone' => $row->phone,
            'email' => $row->email,
            'open_url' => '/crm/contacts/' . $row->id,
        ])->all();

        return AiToolResult::query('contact.search', 'Contact search', $records, $this->contextFilters($request), count($records) ? 'Matching contacts were found in the database.' : 'No matching contacts were found.', '/crm/contacts')->toArray();
    }
}
