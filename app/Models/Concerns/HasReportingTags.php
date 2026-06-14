<?php

namespace App\Models\Concerns;

use App\Models\ReportingTagValue;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Opt-in trait that makes a model taggable with document-level Reporting Tags.
 *
 * Adding this trait to a transaction model is all that is required: the
 * BaseCrudApiController auto-detects the trait and wires validation, saving and
 * serialization of the `reporting_tags` payload. No controller changes needed.
 */
trait HasReportingTags
{
    public function reportingTagValues(): MorphMany
    {
        return $this->morphMany(ReportingTagValue::class, 'taggable');
    }

    protected static function bootHasReportingTags(): void
    {
        // Clean up tag values when the owning record is hard-deleted.
        static::deleting(function ($model) {
            if (method_exists($model, 'isForceDeleting') && ! $model->isForceDeleting()) {
                return;
            }

            $model->reportingTagValues()->delete();
        });
    }
}
