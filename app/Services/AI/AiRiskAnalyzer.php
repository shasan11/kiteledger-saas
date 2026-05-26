<?php

namespace App\Services\AI;

use App\DTO\Ai\AiRiskReviewData;
use App\Enums\Ai\AiRiskLevel;
use App\Models\AiRiskReview;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\PurchaseBill;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Deterministic risk checks first, AI summary second. Score 0–100.
 */
class AiRiskAnalyzer
{
    public function reviewRecord(string $module, string $recordId): AiRiskReviewData
    {
        [$reasons, $recommendations, $score, $payload] = match ($module) {
            'invoices', 'invoice'             => $this->reviewInvoice($recordId),
            'purchase-bills', 'purchase_bill' => $this->reviewPurchaseBill($recordId),
            'journal-vouchers', 'journal_voucher' => $this->reviewJournalVoucher($recordId),
            default                           => [['Unknown module — basic checks only'], [], 10, []],
        };

        $level = AiRiskLevel::fromScore($score);

        $review = AiRiskReview::create([
            'user_id'         => Auth::id(),
            'module'          => $module,
            'target_type'     => $module,
            'target_id'       => $recordId,
            'risk_level'      => $level->value,
            'score'           => $score,
            'reasons'         => $reasons,
            'recommendations' => $recommendations,
            'checked_payload' => $payload,
        ]);

        return new AiRiskReviewData(
            riskLevel:       $level,
            score:           $score,
            reasons:         $reasons,
            recommendations: $recommendations,
            module:          $module,
            targetType:      $module,
            targetId:        $recordId,
        );
    }

    public function reviewPayload(array $payload, string $module): AiRiskReviewData
    {
        $reasons = [];
        $score   = 0;

        if (empty($payload['contact_id']) && empty($payload['vendor_id'])) {
            $reasons[] = 'Missing customer/vendor reference';
            $score += 25;
        }
        if (empty($payload['tax_total']) && !empty($payload['total']) && $payload['total'] > 1000) {
            $reasons[] = 'No tax applied on a large transaction';
            $score += 15;
        }
        if (!empty($payload['total']) && fmod((float) $payload['total'], 1000) === 0.0 && $payload['total'] >= 10000) {
            $reasons[] = 'Suspicious round amount';
            $score += 10;
        }

        return new AiRiskReviewData(
            riskLevel: AiRiskLevel::fromScore($score),
            score:     $score,
            reasons:   $reasons,
            module:    $module,
        );
    }

    private function reviewInvoice(string $id): array
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            return [['Invoice not found'], [], 100, []];
        }

        $reasons = [];
        $recs    = [];
        $score   = 0;

        if (!$invoice->contact_id) {
            $reasons[] = 'Invoice has no customer';
            $recs[]    = 'Set a customer before approval';
            $score    += 25;
        }

        $dup = Invoice::where('invoice_no', $invoice->invoice_no)
            ->where('id', '!=', $invoice->id)
            ->exists();
        if ($dup) {
            $reasons[] = 'Duplicate invoice number detected';
            $recs[]    = 'Verify numbering before posting';
            $score    += 30;
        }

        $avg = Invoice::where('contact_id', $invoice->contact_id)
            ->where('id', '!=', $invoice->id)
            ->avg('total');
        if ($avg && $invoice->total > $avg * 2.5) {
            $reasons[] = 'Total is ' . number_format(($invoice->total / max($avg, 1)) * 100, 0) . '% of historical average for this customer';
            $recs[]    = 'Confirm pricing and quantities';
            $score    += 20;
        }

        if ($invoice->total > 0 && $invoice->total >= 10000 && fmod((float) $invoice->total, 1000) === 0.0) {
            $reasons[] = 'Suspicious round amount';
            $score    += 10;
        }

        return [$reasons, $recs, min(100, $score), ['invoice_id' => $invoice->id, 'total' => $invoice->total]];
    }

    private function reviewPurchaseBill(string $id): array
    {
        try {
            $bill = PurchaseBill::find($id);
        } catch (Throwable) {
            $bill = null;
        }
        if (!$bill) {
            return [['Purchase bill not found'], [], 100, []];
        }

        $reasons = [];
        $recs    = [];
        $score   = 0;

        if (DB::table('purchase_bills')->where('bill_no', $bill->bill_no)->where('id', '!=', $bill->id)->exists()) {
            $reasons[] = 'Duplicate supplier bill number';
            $recs[]    = 'Check if the bill has already been recorded';
            $score    += 35;
        }

        return [$reasons, $recs, min(100, $score), ['purchase_bill_id' => $bill->id]];
    }

    private function reviewJournalVoucher(string $id): array
    {
        $jv = JournalVoucher::with('lines')->find($id);
        if (!$jv) {
            return [['Journal voucher not found'], [], 100, []];
        }

        $reasons = [];
        $recs    = [];
        $score   = 0;

        $debit  = (float) $jv->lines->sum('debit');
        $credit = (float) $jv->lines->sum('credit');
        if (abs($debit - $credit) > 0.01) {
            $reasons[] = "Unbalanced: debit {$debit} vs credit {$credit}";
            $recs[]    = 'Fix balance before posting';
            $score    += 50;
        }

        if (empty(trim((string) $jv->narration))) {
            $reasons[] = 'Missing narration';
            $score    += 10;
        }

        return [$reasons, $recs, min(100, $score), ['jv_id' => $jv->id]];
    }
}
