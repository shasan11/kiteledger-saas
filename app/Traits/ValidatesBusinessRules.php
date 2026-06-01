<?php

namespace App\Traits;

use App\Services\BusinessRules\TransactionRuleValidator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;

trait ValidatesBusinessRules
{
    protected ?array $lastBusinessRuleResult = null;

    protected function validateBusinessRulesForSave(string $module, Model|array $transaction): array
    {
        return $this->rememberBusinessRuleResult(app(TransactionRuleValidator::class)->validateForSave($module, $transaction));
    }

    protected function validateBusinessRulesForEdit(string $module, Model|array $transaction): array
    {
        return $this->rememberBusinessRuleResult(app(TransactionRuleValidator::class)->validateForEdit($module, $transaction));
    }

    protected function validateBusinessRulesForApproval(string $module, Model|array $transaction): array
    {
        return $this->rememberBusinessRuleResult(app(TransactionRuleValidator::class)->validateForApproval($module, $transaction));
    }

    protected function blockIfBusinessRuleErrors(array $result): void
    {
        if (!($result['has_errors'] ?? false)) {
            return;
        }

        throw new HttpResponseException(response()->json([
            'message' => 'Transaction blocked by business rules.',
            'business_rules' => $result,
        ], 422));
    }

    protected function respondWithBusinessRuleWarnings(array $payload, int $status = 200)
    {
        if ($this->lastBusinessRuleResult) {
            $payload['business_rules'] = $this->lastBusinessRuleResult;
            if ($this->lastBusinessRuleResult['has_warnings'] ?? false) {
                $payload['message'] = $payload['message'] ?? 'Saved with warnings.';
            }
        }

        return response()->json($payload, $status);
    }

    private function rememberBusinessRuleResult(array $result): array
    {
        $this->lastBusinessRuleResult = $result;

        return $result;
    }
}
