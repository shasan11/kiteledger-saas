import CentralLayout from "@/Layouts/CentralLayout";
import PageHeader from "@/Components/Central/PageHeader";
import SectionCard from "@/Components/Central/SectionCard";
import axios from "axios";
import { router, useForm } from "@inertiajs/react";
import { Alert, Button, Checkbox, Col, DatePicker, Descriptions, Form, Input, InputNumber, message, Row, Select, Space, Steps, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

const currencies = ["USD", "EUR", "GBP", "NPR", "INR", "AED"];

export default function TenantForm(props) {
    return props.tenant ? <EditTenant {...props} /> : <OnboardingWizard {...props} />;
}

function OnboardingWizard({ plans = [], templates = [], billingCycles = ["monthly", "yearly"], subscriptionModes = ["active"], provisioningModes = ["manual"], tenantBaseDomain, databasePool = [], payment = {}, defaults = {}, provisioningQueueEnabled = false, provisioningQueueCommand = "" }) {
    const callingCodes = defaults.calling_codes || {};
    const [antForm] = Form.useForm();
    const [step, setStep] = useState(0);
    const [testing, setTesting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const initial = useMemo(() => ({
        company_name: "", legal_name: "", owner_name: "", owner_email: "", owner_phone: "", phone_country_code: callingCodes[defaults.country] || "+1", country: defaults.country || "US", address: "",
        timezone: defaults.timezone || "UTC", currency: defaults.currency || "USD", subdomain: "", owner_password: "", owner_password_confirmation: "",
        plan_id: plans[0]?.id, default_template_id: null, billing_cycle: billingCycles[0] || "monthly", subscription_start_mode: plans[0]?.trial_days > 0 ? "trial" : "active", effective_at: dayjs(),
        onboarding_idempotency_key: crypto.randomUUID(), provisioning_mode: provisioningModes[0] || "manual", database_pool_id: null,
        tenancy_db_host: "127.0.0.1", tenancy_db_port: 3306, tenancy_db_name: "", tenancy_db_username: "", tenancy_db_password: "",
        initial_payment: { enabled: false, amount: null, currency: plans[0]?.currency || defaults.currency || "USD", payment_method: payment.methods?.[0] || "bank_transfer", payment_date: dayjs(), reference: "", notes: "", proof: null, send_receipt: true, adjustment_acknowledged: false },
    }), []);
    const submission = useForm(initial);
    const mode = Form.useWatch("provisioning_mode", antForm) || initial.provisioning_mode;
    const planId = Form.useWatch("plan_id", antForm) || initial.plan_id;
    const startMode = Form.useWatch("subscription_start_mode", antForm) || initial.subscription_start_mode;
    const paymentEnabled = Form.useWatch(["initial_payment", "enabled"], antForm);
    const selectedPlan = plans.find((plan) => plan.id === planId);
    const steps = [
        { title: "Company & owner", fields: ["company_name", "owner_name", "owner_email", "subdomain", "owner_password", "owner_password_confirmation"] },
        { title: "Plan & billing", fields: ["plan_id", "billing_cycle", "subscription_start_mode", "effective_at"] },
        { title: "Workspace setup", fields: mode === "manual" ? ["provisioning_mode", "tenancy_db_host", "tenancy_db_port", "tenancy_db_name", "tenancy_db_username"] : ["provisioning_mode", "database_pool_id"] },
        { title: "Review", fields: [] },
    ];
    const normalizeSubdomain = () => antForm.setFieldValue("subdomain", String(antForm.getFieldValue("subdomain") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, ""));
    const fieldLabels = {
        company_name: "company name", owner_name: "owner name", owner_email: "owner email", subdomain: "workspace hostname",
        owner_password: "owner password", owner_password_confirmation: "password confirmation", plan_id: "plan",
        billing_cycle: "billing cycle", subscription_start_mode: "subscription start mode", effective_at: "effective date",
        timezone: "timezone", currency: "currency", provisioning_mode: "provisioning mode", database_pool_id: "database",
        tenancy_db_host: "database host", tenancy_db_port: "database port", tenancy_db_name: "database name",
        tenancy_db_username: "database username",
    };
    const validationMessage = (errorFields = []) => {
        const labels = [...new Set(errorFields.map(({ name }) => fieldLabels[name?.[0]] || String(name?.[0] || "field").replaceAll("_", " ")))];
        return labels.length ? `Please complete: ${labels.join(", ")}.` : "Review the highlighted fields before provisioning.";
    };
    const next = async () => {
        try {
            await antForm.validateFields(steps[step].fields);
            setStep((value) => Math.min(3, value + 1));
        } catch (error) {
            message.error(validationMessage(error?.errorFields));
        }
    };
    const testDatabase = async () => {
        try {
            const values = await antForm.validateFields(steps[2].fields);
            setTesting(true);
            const { data } = await axios.post(route("central.tenants.database-test"), values);
            message.success(data.message);
        } catch (error) {
            if (error.response) message.error(error.response.data?.message || "Database verification failed");
        } finally { setTesting(false); }
    };
    const stepForField = (name) => steps.findIndex(({ fields }) => fields.includes(String(name).split(".")[0]));
    const submit = (values) => {
        if (submitting || submission.processing) return;
        setSubmitting(true);
        const payload = { ...values, onboarding_idempotency_key: values.onboarding_idempotency_key || initial.onboarding_idempotency_key, effective_at: values.effective_at?.toISOString(), initial_payment: { ...values.initial_payment, payment_date: values.initial_payment?.payment_date?.toISOString(), proof: values.initial_payment?.proof?.fileList?.[0]?.originFileObj || null } };
        try {
            submission.transform(() => payload);
            submission.post(route("central.tenants.store"), {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => {
                    antForm.setFields(Object.entries(errors).map(([name, fieldErrors]) => ({ name: name.split("."), errors: [Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors] })));
                    const errorStep = stepForField(Object.keys(errors)[0]);
                    if (errorStep >= 0) setStep(errorStep);
                    message.error(Object.values(errors)[0] || "Customer could not be created. Review the highlighted fields.");
                },
                onFinish: () => setSubmitting(false),
            });
        } catch (error) {
            setSubmitting(false);
            message.error(error?.message || "Customer setup could not be started.");
        }
    };
    const provision = async () => {
        if (submitting || submission.processing) return;
        try {
            const values = await antForm.validateFields();
            submit(values);
        } catch (error) {
            if (error?.errorFields) submitFailed(error);
            else message.error(error?.message || "Customer setup could not be started.");
        }
    };
    const submitFailed = ({ errorFields }) => {
        const errorStep = stepForField(errorFields?.[0]?.name?.[0]);
        if (errorStep >= 0) setStep(errorStep);
        message.error(validationMessage(errorFields));
    };
    const price = selectedPlan ? (Form.useWatch("billing_cycle", antForm) === "yearly" ? selectedPlan.price_yearly : selectedPlan.price_monthly) : null;

    return <CentralLayout title="Create customer" breadcrumbs={[{ title: "Customers" }]}>
        <PageHeader eyebrow="Customer onboarding" title="Create a customer" description="Set up the customer, owner, subscription, and workspace through a guided flow." />
        <SectionCard><Steps current={step} items={steps.map(({ title }) => ({ title }))} responsive style={{ marginBottom: 28 }} />
            <Form form={antForm} layout="vertical" initialValues={initial} onFinish={submit} onFinishFailed={submitFailed}>
                <Form.Item name="onboarding_idempotency_key" hidden><Input /></Form.Item>
                <div hidden={step !== 0}><Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item name="company_name" label="Company name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="legal_name" label="Legal name"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="owner_name" label="Owner name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="owner_email" label="Owner email" rules={[{ required: true }, { type: "email" }]}><Input type="email" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Owner phone"><Space.Compact block><Form.Item name="phone_country_code" noStyle><Select showSearch style={{width:145}} options={Object.entries(callingCodes).map(([country,code])=>({value:code,label:`${country} ${code}`}))}/></Form.Item><Form.Item name="owner_phone" noStyle><Input inputMode="tel" placeholder="Phone number"/></Form.Item></Space.Compact></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="country" label="Country" rules={[{ len: 2 }]}><Select showSearch options={Object.keys(callingCodes).map(value=>({value,label:value}))} onChange={country=>antForm.setFieldValue('phone_country_code',callingCodes[country])}/></Form.Item></Col>
                    <Col xs={24}><Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item></Col>
                    <Col xs={24}><Form.Item name="subdomain" label="Workspace hostname" rules={[{ required: true }, { pattern: /^(?!-)[a-z0-9-]+(?<!-)$/, message: "Use lowercase letters, numbers, and internal hyphens." }]}><Input onBlur={normalizeSubdomain} addonAfter={`.${tenantBaseDomain || window.location.hostname}`} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="owner_password" label="Owner password" rules={[{ required: true }, { min: 12 }]}><Input.Password autoComplete="new-password" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="owner_password_confirmation" label="Confirm password" dependencies={["owner_password"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue("owner_password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match.")) })]}><Input.Password autoComplete="new-password" /></Form.Item></Col>
                </Row></div>
                <div hidden={step !== 1}><Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item name="plan_id" label="Plan" rules={[{ required: true }]}><Select options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} — ${plan.currency} ${plan.price_monthly}/month` }))} onChange={(id) => { const plan = plans.find((item) => item.id === id); antForm.setFieldValue("subscription_start_mode", plan?.trial_days > 0 ? "trial" : "active"); antForm.setFieldValue(["initial_payment", "currency"], plan?.currency); }} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="default_template_id" label="Data template"><Select allowClear options={templates.map((template) => ({ value: template.id, label: template.name }))} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="billing_cycle" label="Billing cycle" rules={[{ required: true }]}><Select options={billingCycles.map((value) => ({ value, label: value }))} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="subscription_start_mode" label="Start mode" rules={[{ required: true }]}><Select options={subscriptionModes.filter((value) => value !== "trial" || selectedPlan?.trial_days > 0).map((value) => ({ value, label: value === "trial" ? `Trial (${selectedPlan?.trial_days} days)` : "Active" }))} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="effective_at" label="Effective at" rules={[{ required: true }]}><DatePicker showTime style={{ width: "100%" }} disabledDate={(date) => date?.isAfter(dayjs(), "day")} /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="timezone" label="Timezone" rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={24} md={8}><Form.Item name="currency" label="Customer currency" rules={[{ required: true }]}><Select options={currencies.map((value) => ({ value, label: value }))} /></Form.Item></Col>
                    {payment.enabled && startMode === "active" && Number(price) > 0 && <Col xs={24}><Form.Item name={["initial_payment", "enabled"]} valuePropName="checked"><Checkbox>Record a manual payment against the generated initial invoice</Checkbox></Form.Item>{paymentEnabled && <Row gutter={12}>
                        <Col xs={12} md={6}><Form.Item name={["initial_payment", "amount"]} label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col xs={12} md={6}><Form.Item name={["initial_payment", "currency"]} label="Currency" rules={[{ required: true }]}><Input disabled /></Form.Item></Col>
                        <Col xs={12} md={6}><Form.Item name={["initial_payment", "payment_method"]} label="Method" rules={[{ required: true }]}><Select options={(payment.methods || []).map((value) => ({ value, label: value }))} /></Form.Item></Col><Col xs={12} md={6}><Form.Item name={["initial_payment", "payment_date"]} label="Paid at" rules={[{ required: true }]}><DatePicker showTime style={{ width: "100%" }} /></Form.Item></Col>
                        <Col xs={24} md={12}><Form.Item name={["initial_payment", "reference"]} label="Reference" rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={24} md={12}><Form.Item name={["initial_payment", "proof"]} label="Payment proof" rules={payment.proof_required ? [{ required: true }] : []}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Select proof</Button></Upload></Form.Item></Col>
                        <Col xs={24}><Form.Item name={["initial_payment", "adjustment_acknowledged"]} valuePropName="checked"><Checkbox>I acknowledge that a submitted amount different from the server-calculated invoice is subject to the configured partial/overpayment policy.</Checkbox></Form.Item></Col>
                    </Row>}</Col>}
                </Row></div>
                <div hidden={step !== 2}><Alert type="info" showIcon message="Credentials are used only for provisioning and are never returned to the browser." style={{ marginBottom: 18 }} /><Row gutter={16}>
                    <Col xs={24}><Form.Item name="provisioning_mode" label="Provisioning mode" rules={[{ required: true }]}><Select options={provisioningModes.map((value) => ({ value, label: value }))} /></Form.Item></Col>
                    {mode === "pool" ? <Col xs={24}><Form.Item name="database_pool_id" label="Validated database" rules={[{ required: true }]}><Select options={databasePool.map((row) => ({ value: row.id, label: row.database_name }))} /></Form.Item></Col> : mode === "manual" && <><Col xs={16}><Form.Item name="tenancy_db_host" label="Host" rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={8}><Form.Item name="tenancy_db_port" label="Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: "100%" }} /></Form.Item></Col><Col xs={24}><Form.Item name="tenancy_db_name" label="Database name" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_]+$/ }]}><Input /></Form.Item></Col><Col xs={24}><Form.Item name="tenancy_db_username" label="Username" rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={24}><Form.Item name="tenancy_db_password" label="Password (optional)" extra="Leave blank when this MySQL user has no password."><Input.Password /></Form.Item></Col><Col xs={24}><Button loading={testing} onClick={testDatabase}>Test database connection</Button></Col></>}
                </Row></div>
                <div hidden={step !== 3}><Alert type={provisioningQueueEnabled ? "warning" : "info"} showIcon message={provisioningQueueEnabled ? "Provisioning will be queued" : "Provisioning will run immediately"} description={provisioningQueueEnabled ? <span>A queue worker is required: <code>{provisioningQueueCommand}</code></span> : "No provisioning queue or queue cron job is required."} style={{ marginBottom: 18 }} /><Descriptions bordered column={{ xs: 1, md: 2 }} items={[
                    { key: "company", label: "Company", children: antForm.getFieldValue("company_name") }, { key: "owner", label: "Owner", children: antForm.getFieldValue("owner_email") },
                    { key: "host", label: "Hostname", children: `${antForm.getFieldValue("subdomain")}.${tenantBaseDomain}` }, { key: "plan", label: "Plan", children: selectedPlan?.name },
                    { key: "subscription", label: "Subscription", children: `${startMode} / ${antForm.getFieldValue("billing_cycle")}` }, { key: "database", label: "Database", children: mode === "pool" ? databasePool.find((row) => row.id === antForm.getFieldValue("database_pool_id"))?.database_name : antForm.getFieldValue("tenancy_db_name") },
                ]} /></div>
                <Space style={{ width: "100%", justifyContent: "space-between", marginTop: 28 }}><Button onClick={() => step ? setStep(step - 1) : window.history.back()}>{step ? "Back" : "Cancel"}</Button>{step < 3 ? <Button type="primary" onClick={next}>Continue</Button> : <Button type="primary" onClick={provision} loading={submitting || submission.processing} disabled={submitting || submission.processing}>Create customer</Button>}</Space>
            </Form>
        </SectionCard>
    </CentralLayout>;
}

function EditTenant({ tenant, plans = [], templates = [], defaults = {} }) {
    const codes=defaults.calling_codes||{};const callingCode=codes[tenant.country]||'+1';const localPhone=String(tenant.owner_phone||'').startsWith(callingCode)?String(tenant.owner_phone).slice(callingCode.length):tenant.owner_phone||'';
    const form = useForm({ company_name: tenant.company_name || "", legal_name: tenant.legal_name || "", owner_name: tenant.owner_name || "", owner_phone: localPhone, phone_country_code: callingCode, country: tenant.country || defaults.country || "US", address: tenant.address || "", timezone: tenant.timezone || "UTC", currency: tenant.currency || "USD", plan_id: tenant.plan_id || null, default_template_id: tenant.default_template_id || null, tenancy_db_host: tenant.tenancy_db_host || "127.0.0.1", tenancy_db_port: tenant.tenancy_db_port || 3306, tenancy_db_name: tenant.tenancy_db_name || tenant.database_name || "", tenancy_db_username: tenant.tenancy_db_username || "", tenancy_db_password: "" });
    const field = (name, label, node, required = false) => <Form.Item label={label} required={required} validateStatus={form.errors[name] ? "error" : ""} help={form.errors[name]}>{node || <Input value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} />}</Form.Item>;
    return <CentralLayout title="Edit tenant"><PageHeader eyebrow="Tenant" title={`Edit ${tenant.company_name}`} description="Update workspace identity and its existing database connection." /><Form layout="vertical" onFinish={() => form.put(route("central.tenants.update", tenant.id))}><SectionCard><Row gutter={16}><Col xs={24} md={12}>{field("company_name", "Company name", null, true)}</Col><Col xs={24} md={12}>{field("legal_name", "Legal name")}</Col><Col xs={24} md={12}>{field("owner_name", "Owner name", null, true)}</Col><Col xs={24} md={12}>{field("owner_phone", "Owner phone")}</Col><Col xs={24} md={12}>{field("timezone", "Timezone", null, true)}</Col><Col xs={24} md={12}>{field("currency", "Currency", <Select value={form.data.currency} onChange={(value) => form.setData("currency", value)} options={currencies.map((value) => ({ value, label: value }))} />, true)}</Col><Col xs={24} md={12}>{field("plan_id", "Plan", <Select allowClear value={form.data.plan_id} onChange={(value) => form.setData("plan_id", value)} options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} />)}</Col><Col xs={24} md={12}>{field("default_template_id", "Template", <Select allowClear value={form.data.default_template_id} onChange={(value) => form.setData("default_template_id", value)} options={templates.map((item) => ({ value: item.id, label: item.name }))} />)}</Col><Col xs={24}>{field("tenancy_db_host", "Database host", null, true)}</Col><Col xs={24}>{field("tenancy_db_name", "Database name", null, true)}</Col><Col xs={24}>{field("tenancy_db_username", "Database username", null, true)}</Col><Col xs={24}>{field("tenancy_db_password", "Database password (leave blank to keep)", <Input.Password value={form.data.tenancy_db_password} onChange={(event) => form.setData("tenancy_db_password", event.target.value)} />)}</Col></Row><Space><Button onClick={() => window.history.back()}>Cancel</Button><Button type="primary" htmlType="submit" loading={form.processing}>Save changes</Button></Space></SectionCard></Form></CentralLayout>;
}
