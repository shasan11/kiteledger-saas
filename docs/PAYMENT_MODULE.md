# SaaS payment module

`payment_gateways` stores public identifiers plus encrypted secrets/webhook secrets and encrypted provider configuration. No secret fields are serialized to Inertia.

`PaymentManager` resolves `manual`, `stripe`, `paypal`, or `razorpay`. Manual invoices and marking paid are implemented. External adapters are intentionally fail-closed until the project installs/configures the provider's supported SDK or HTTP contract; this prevents a placeholder integration from accepting money incorrectly. Add webhook signature verification before activating any external gateway.

Platform billing records are `tenant_invoices` and `payment_transactions`; these are distinct from ERP customer invoices/payments in tenant databases. Run `billing:generate-invoices` daily. Raw provider responses must be redacted before persistence and must never include credentials or full card/bank data.
