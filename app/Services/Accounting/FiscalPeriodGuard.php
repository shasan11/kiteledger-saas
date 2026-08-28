<?php

namespace App\Services\Accounting;

use App\Models\FiscalYear;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Keeps postings out of periods the business has closed.
 *
 * A fiscal year can be closed outright (status CLOSED) or locked up to a date
 * (lock_date). Until this guard existed both were advisory: FiscalYearController
 * refused to edit a closed year, but nothing stopped a journal entry being
 * posted into one, so a closed period could still be restated after the fact.
 */
class FiscalPeriodGuard
{
    /**
     * @throws ValidationException when $date falls inside a closed or locked period.
     */
    public function assertOpen(mixed $date, string $field = 'date'): void
    {
        $reason = $this->closedReason($date);

        if ($reason !== null) {
            throw ValidationException::withMessages([$field => [$reason]]);
        }
    }

    public function isOpen(mixed $date): bool
    {
        return $this->closedReason($date) === null;
    }

    /**
     * Null when the date may be posted to, otherwise the human-readable reason.
     */
    public function closedReason(mixed $date): ?string
    {
        $postingDate = $this->normalize($date);

        if (! $postingDate) {
            return null;
        }

        $year = $this->fiscalYearFor($postingDate);

        // No fiscal year covers this date, so there is no period to be closed.
        // Left permissive on purpose: tenants that never configured fiscal years
        // must keep working exactly as before.
        if (! $year) {
            return null;
        }

        if (strtoupper((string) $year->status) === 'CLOSED') {
            return sprintf('%s is closed. Reopen it before posting on %s.', $year->name ?: 'That fiscal year', $postingDate->toDateString());
        }

        $lockDate = $year->lock_date ? Carbon::parse($year->lock_date)->endOfDay() : null;

        if ($lockDate && $postingDate->lte($lockDate)) {
            return sprintf('%s is locked up to %s. Choose a later date or move the lock date.', $year->name ?: 'That fiscal year', $lockDate->toDateString());
        }

        return null;
    }

    protected function fiscalYearFor(Carbon $date): ?FiscalYear
    {
        try {
            return FiscalYear::query()
                ->whereDate('start_date', '<=', $date->toDateString())
                ->whereDate('end_date', '>=', $date->toDateString())
                ->first();
        } catch (\Throwable) {
            // Tenant schema without fiscal years (or an early install) must not
            // block posting.
            return null;
        }
    }

    protected function normalize(mixed $date): ?Carbon
    {
        if (blank($date)) {
            return null;
        }

        try {
            return Carbon::parse($date)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
