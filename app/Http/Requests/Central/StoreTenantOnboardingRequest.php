<?php

namespace App\Http\Requests\Central;

use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\PhoneNumber;

class StoreTenantOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $prepared = ['subdomain' => str($this->input('subdomain'))->trim()->lower()->toString()];
        $prepared['owner_phone'] = PhoneNumber::join($this->input('phone_country_code', PhoneNumber::callingCode($this->input('country'))), $this->input('owner_phone'));
        if ($this->input('provisioning_mode') === 'manual') {
            $prepared['tenancy_db_password'] = (string) ($this->input('tenancy_db_password') ?? '');
        }

        $this->merge($prepared);
    }

    public function rules(): array
    {
        $modes = config('saas.database.allowed_modes', [config('saas.database.mode', 'manual')]);
        $manual = $this->input('provisioning_mode') === 'manual';
        $named = in_array($this->input('provisioning_mode'), ['manual', 'mysql'], true);

        return [
            'company_name' => ['required', 'string', 'max:255'], 'legal_name' => ['nullable', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'], 'owner_email' => ['required', 'email', 'max:255', 'unique:tenants,owner_email'],
            'owner_phone' => ['nullable', 'regex:/^\+[1-9][0-9]{6,14}$/'], 'phone_country_code' => ['nullable', 'regex:/^\+[1-9][0-9]{0,3}$/'], 'country' => ['nullable', 'string', 'size:2'], 'address' => ['nullable', 'string'],
            'timezone' => ['required', 'timezone'], 'currency' => ['required', 'string', 'size:3'],
            'plan_id' => ['required', 'exists:plans,id'], 'default_template_id' => ['nullable', 'exists:default_data_templates,id'],
            'subdomain' => ['required', 'string', 'min:2', 'max:63', 'regex:/^(?!-)[a-z0-9-]+(?<!-)$/', Rule::notIn(config('saas.reserved_subdomains')), 'unique:tenants,slug'],
            'owner_password' => ['required', 'string', 'min:12', 'confirmed'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
            'subscription_start_mode' => ['required', Rule::in(['trial', 'active'])],
            'effective_at' => ['required', 'date', 'before_or_equal:now'],
            'onboarding_idempotency_key' => ['required', 'uuid'],
            'provisioning_mode' => ['required', Rule::in($modes)],
            'database_pool_id' => ['nullable', 'required_if:provisioning_mode,pool', Rule::exists('tenant_database_pool', 'id')->where(fn ($query) => $query->where('status', 'available')->whereNotNull('validated_at'))],
            'tenancy_db_host' => [$manual ? 'required' : 'nullable', 'string', 'max:255'],
            'tenancy_db_port' => [$manual ? 'required' : 'nullable', 'integer', 'between:1,65535'],
            'tenancy_db_name' => [$named ? 'required' : 'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', 'unique:tenants,tenancy_db_name'],
            'tenancy_db_username' => [$manual ? 'required' : 'nullable', 'string', 'max:255'],
            'tenancy_db_password' => ['nullable', 'string', 'max:1024'],
            'initial_payment' => ['nullable', 'array'], 'initial_payment.enabled' => ['nullable', 'boolean'],
            'initial_payment.amount' => ['nullable', 'numeric', 'min:0.01'], 'initial_payment.currency' => ['nullable', 'string', 'size:3'],
            'initial_payment.payment_method' => ['nullable', Rule::in(['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'])],
            'initial_payment.payment_date' => ['nullable', 'date', 'before_or_equal:now'], 'initial_payment.reference' => ['nullable', 'string', 'max:255'],
            'initial_payment.bank_reference' => ['nullable', 'string', 'max:255'], 'initial_payment.notes' => ['nullable', 'string', 'max:2000'],
            'initial_payment.proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'initial_payment.send_receipt' => ['nullable', 'boolean'], 'initial_payment.adjustment_acknowledged' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $plan = Plan::find($this->input('plan_id'));
            if ($plan && $this->input('subscription_start_mode') === 'trial' && (int) $plan->trial_days < 1) {
                $validator->errors()->add('subscription_start_mode', 'This plan does not offer a trial.');
            }
            if ($plan && $this->boolean('initial_payment.enabled')) {
                if ($this->input('subscription_start_mode') !== 'active' || ((float) $plan->price_monthly === 0.0 && (float) $plan->price_yearly === 0.0)) {
                    $validator->errors()->add('initial_payment.enabled', 'Initial payment is available only for an active paid subscription.');
                }
                foreach (['payment_method', 'payment_date', 'currency', 'reference'] as $field) {
                    if (blank($this->input('initial_payment.'.$field))) {
                        $validator->errors()->add('initial_payment.'.$field, 'This field is required.');
                    }
                }
                if (strtoupper((string) $this->input('initial_payment.currency')) !== strtoupper((string) $plan->currency)) {
                    $validator->errors()->add('initial_payment.currency', 'Payment currency must match the plan currency.');
                }
                if ($this->file('initial_payment.proof') === null) {
                    $gateway = PaymentGateway::where('slug', 'manual')->where('is_active', true)->first();
                    if ((bool) ($gateway?->config['proof_required'] ?? false)) {
                        $validator->errors()->add('initial_payment.proof', 'Payment proof is required.');
                    }
                }
            }
        });
    }
}
