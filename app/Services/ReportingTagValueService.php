<?php

namespace App\Services;

use App\Models\ReportingTag;
use App\Models\ReportingTagLine;
use App\Models\ReportingTagValue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ReportingTagValueService
{
    /**
     * Sync the document-level reporting tag values for a taggable model.
     *
     * @param  array<int, array<string, mixed>>  $items  list of { reporting_tag_id, value }
     */
    public function sync(Model $taggable, array $items): void
    {
        if (! method_exists($taggable, 'reportingTagValues')) {
            return;
        }

        $items = array_values(array_filter($items, fn ($row) => is_array($row) && ! empty($row['reporting_tag_id'])));

        $tagIds = collect($items)->pluck('reporting_tag_id')->unique()->values();

        /** @var Collection<string, ReportingTag> $tags */
        $tags = ReportingTag::query()
            ->with('reportingTagLines')
            ->whereIn('id', $tagIds)
            ->get()
            ->keyBy('id');

        $errors = [];
        $resolved = [];

        foreach ($items as $index => $row) {
            $tagId = (string) $row['reporting_tag_id'];
            $tag = $tags->get($tagId);

            if (! $tag) {
                $errors["reporting_tags.$index.reporting_tag_id"] = ['The selected reporting tag does not exist.'];
                continue;
            }

            if (! $tag->active) {
                $errors["reporting_tags.$index.reporting_tag_id"] = ["Reporting tag \"{$tag->name}\" is inactive."];
                continue;
            }

            $value = $row['value'] ?? null;

            // Empty values mean "no selection" -> the tag is simply not stored.
            if ($this->isEmptyValue($value)) {
                continue;
            }

            try {
                $resolved[$tagId] = $this->mapValueColumns($tag, $value, $index);
            } catch (ValidationException $e) {
                foreach ($e->errors() as $field => $messages) {
                    $errors[$field] = $messages;
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        $keepTagIds = array_keys($resolved);

        // Remove values for tags that are no longer present (or were cleared).
        $taggable->reportingTagValues()
            ->when(
                count($keepTagIds) > 0,
                fn ($query) => $query->whereNotIn('reporting_tag_id', $keepTagIds),
                fn ($query) => $query
            )
            ->delete();

        foreach ($resolved as $tagId => $columns) {
            $taggable->reportingTagValues()->updateOrCreate(
                ['reporting_tag_id' => $tagId],
                $columns
            );
        }
    }

    /**
     * Serialize a taggable's reporting tag values for the API (frontend friendly).
     *
     * @return array<int, array<string, mixed>>
     */
    public function serializeFor(Model $taggable): array
    {
        if (! method_exists($taggable, 'reportingTagValues')) {
            return [];
        }

        $taggable->loadMissing('reportingTagValues');

        return $taggable->reportingTagValues
            ->map(fn (ReportingTagValue $value) => [
                'id' => $value->id,
                'reporting_tag_id' => $value->reporting_tag_id,
                'reporting_tag_line_id' => $value->reporting_tag_line_id,
                'value_text' => $value->value_text,
                'value_number' => $value->value_number !== null ? (float) $value->value_number : null,
                'value_date' => optional($value->value_date)->format('Y-m-d'),
                'value_boolean' => $value->value_boolean,
                'value_json' => $value->value_json,
                // Canonical value the frontend can consume directly.
                'value' => $this->canonicalValue($value),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapValueColumns(ReportingTag $tag, mixed $value, int $index): array
    {
        $blank = [
            'reporting_tag_line_id' => null,
            'value_text' => null,
            'value_number' => null,
            'value_date' => null,
            'value_boolean' => null,
            'value_json' => null,
        ];

        switch ($tag->type) {
            case 'number':
                if (! is_numeric($value)) {
                    $this->fail($index, 'value', "Reporting tag \"{$tag->name}\" expects a number.");
                }

                return array_merge($blank, ['value_number' => (float) $value]);

            case 'date':
                try {
                    $date = Carbon::parse((string) $value)->format('Y-m-d');
                } catch (\Throwable) {
                    $this->fail($index, 'value', "Reporting tag \"{$tag->name}\" expects a valid date.");
                    $date = null;
                }

                return array_merge($blank, ['value_date' => $date]);

            case 'boolean':
                return array_merge($blank, ['value_boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);

            case 'select':
                $line = $this->resolveLine($tag, $value);

                if (! $line) {
                    $this->fail($index, 'value', "The selected option is not valid for reporting tag \"{$tag->name}\".");
                }

                return array_merge($blank, [
                    'reporting_tag_line_id' => $line->id,
                    'value_text' => $line->value ?: $line->name,
                ]);

            case 'multi_select':
                $ids = is_array($value) ? $value : [$value];
                $ids = array_values(array_filter(array_map('strval', $ids)));

                if (empty($ids)) {
                    // Treated as empty by caller, but guard anyway.
                    return $blank;
                }

                $lines = collect($ids)->map(fn ($id) => $this->resolveLine($tag, $id));

                if ($lines->contains(null)) {
                    $this->fail($index, 'value', "One or more selected options are not valid for reporting tag \"{$tag->name}\".");
                }

                return array_merge($blank, [
                    'value_json' => $lines->pluck('id')->values()->all(),
                ]);

            case 'text':
            default:
                return array_merge($blank, ['value_text' => (string) $value]);
        }
    }

    protected function resolveLine(ReportingTag $tag, mixed $lineId): ?ReportingTagLine
    {
        return $tag->reportingTagLines
            ->first(fn (ReportingTagLine $line) => (string) $line->id === (string) $lineId && $line->active);
    }

    protected function isEmptyValue(mixed $value): bool
    {
        if (is_array($value)) {
            return count(array_filter($value, fn ($v) => $v !== null && $v !== '')) === 0;
        }

        return $value === null || $value === '';
    }

    protected function canonicalValue(ReportingTagValue $value): mixed
    {
        if ($value->value_json !== null) {
            return $value->value_json;
        }

        if ($value->reporting_tag_line_id !== null) {
            return $value->reporting_tag_line_id;
        }

        if ($value->value_boolean !== null) {
            return $value->value_boolean;
        }

        if ($value->value_number !== null) {
            return (float) $value->value_number;
        }

        if ($value->value_date !== null) {
            return $value->value_date->format('Y-m-d');
        }

        return $value->value_text;
    }

    protected function fail(int $index, string $field, string $message): void
    {
        throw ValidationException::withMessages([
            "reporting_tags.$index.$field" => [$message],
        ]);
    }
}
