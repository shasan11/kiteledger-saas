import PageHeader from '@/Components/Central/PageHeader';
import RichTextEditor from '@/Components/Central/RichTextEditor';
import SectionCard from '@/Components/Central/SectionCard';
import { humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { fetchPublicBrandSettings, publishBrandSettings } from '@/brandSettings';
import { categoryLabels, orderedSections, sectionMatches } from './sectionRegistry';
import {
    ApiOutlined,
    BgColorsOutlined,
    DatabaseOutlined,
    DollarOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    TeamOutlined,
    ToolOutlined,
    CheckOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { router } from '@inertiajs/react';
import {
    Alert,
    Button,
    ColorPicker,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Tag,
    Typography,
    Upload,
    message,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

const { Text } = Typography;

const selectOptions = {
    currency_position: ['before', 'after'],
    default_billing_cycle: ['monthly', 'yearly'],
    default_scheme: ['https', 'http'],
    default_priority: ['low', 'normal', 'high', 'urgent'],
    mode: ['sandbox', 'live'],
};

const wideInputs = new Set(['textarea', 'code editor', 'key-value editor', 'rich-text editor', 'image']);

const sectionDescriptions = {
    general: 'Core defaults used across the platform.',
    branding: 'Control how your product and organization appear.',
    email: 'Configure outbound email delivery and sender details.',
    storage: 'Choose where files are stored and how they are handled.',
    notifications: 'Manage system notifications and delivery behavior.',
    security: 'Review authentication and security-related preferences.',
    billing: 'Set billing defaults, currencies, and invoice behavior.',
};

export default function Settings({ groups, activeGroup }) {
    const [section, setSection] = useState(activeGroup);
    const [search, setSearch] = useState('');
    const [dirty, setDirty] = useState(false);
    const [changedKeys, setChangedKeys] = useState(() => new Set());
    const [processing, setProcessing] = useState(false);
    const [errorCount, setErrorCount] = useState(0);
    const [confirmation, setConfirmation] = useState(null);
    const [confirmationPassword, setConfirmationPassword] = useState('');
    const [form] = Form.useForm();
    const provisioningQueueEnabled = Form.useWatch('provisioning.queue_tenant_provisioning', form);
    const queueEnabled = Form.useWatch('queue_scheduler.queue_enabled', form);
    const schedulerEnabled = Form.useWatch('queue_scheduler.scheduler_enabled', form);
    const settings = groups[section] || [];
    const hydrated = useRef({ section: null, signature: null });
    const awaitingServer = useRef(false);
    const serverSignature = useMemo(() => JSON.stringify(settings.map(({ key, value, preview_url, has_secret, updated_at }) => ({ key, value, preview_url, has_secret, updated_at }))), [settings]);

    useEffect(() => {
        const sectionChanged = hydrated.current.section !== section;
        const serverChanged = hydrated.current.signature !== serverSignature;
        if (!sectionChanged && (!serverChanged || (dirty && !awaitingServer.current))) return;
        form.resetFields();
        form.setFieldsValue(Object.fromEntries(settings.map((item) => [item.key, initialValue(item)])));
        hydrated.current = { section, signature: serverSignature };
        awaitingServer.current = false;
        setDirty(false);
        setChangedKeys(new Set());
    }, [section, serverSignature]);

    useEffect(() => {
        const block = (event) => {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', block);
        return () => window.removeEventListener('beforeunload', block);
    }, [dirty]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return settings;

        return settings.filter((item) =>
            `${item.label} ${item.key}`.toLowerCase().includes(term),
        );
    }, [settings, search]);

    const grouped = useMemo(() => groupSettings(filtered), [filtered]);
    const sections = useMemo(() => orderedSections(groups), [groups]);
    const visibleSections = useMemo(() => sections.filter((item) => sectionMatches(item, groups[item.key] || [], search)), [sections, groups, search]);
    const currentLabel = humanize(section);
    const currentSection = sections.find((item) => item.key === section);

    const clearConfirmation = () => {
        setConfirmation(null);
        setConfirmationPassword('');
    };

    const discardChanges = () => {
        form.setFieldsValue(Object.fromEntries(settings.map((item) => [item.key, initialValue(item)])));
        setDirty(false);
        setChangedKeys(new Set());
        setErrorCount(0);
    };

    const prepare = (values) => {
        const payload = { ...values };
        settings
            .filter((item) => item.input_type === 'key-value editor' && Object.prototype.hasOwnProperty.call(payload, item.key))
            .forEach((item) => {
                try {
                    payload[item.key] = JSON.parse(payload[item.key] || '{}');
                } catch {
                    form.setFields([{ name: item.key, errors: ['Enter valid JSON.'] }]);
                    throw new Error('invalid-json');
                }
            });

        return payload;
    };

    const submit = (values, password) => {
        const request = {
            values,
            confirmation_password: password || undefined,
        };
        const options = {
            preserveScroll: true,
            forceFormData: hasUpload(values),
            onStart: () => { setProcessing(true); awaitingServer.current = true; },
            onSuccess: () => {
                setDirty(false);
                setChangedKeys(new Set());
                setErrorCount(0);
                clearConfirmation();
                message.success('Settings saved.');
                if (section === 'branding') {
                    fetchPublicBrandSettings().then(publishBrandSettings).catch(() => {});
                }
            },
            onError: (errors) => {
                awaitingServer.current = false;
                setErrorCount(Object.keys(errors).filter((name) => name !== 'confirmation_password').length);
                Object.entries(errors).forEach(([name, error]) => {
                    const field = name.replace(/^values\./, '');
                    if (field !== 'confirmation_password') form.setFields([{ name: field, errors: [error] }]);
                });
                message.error('Settings could not be saved. Review the highlighted fields.');
            },
            onFinish: () => setProcessing(false),
        };

        if (hasUpload(values)) {
            router.post(route('central.settings.update', section), { ...request, _method: 'put' }, options);
            return;
        }

        router.put(route('central.settings.update', section), request, options);
    };

    const save = () =>
        form.validateFields([...changedKeys]).then((allValues) => {
            try {
                const values = Object.fromEntries([...changedKeys].map((key) => [key, allValues[key]]));
                const payload = prepare(values);
                settings.some((item) => changedKeys.has(item.key) && item.requires_confirmation)
                    ? setConfirmation({ type: 'save', values: payload })
                    : submit(payload);
            } catch {
                /* validation is displayed beside the field */
            }
        });

    const changeSection = (group) => {
        const visit = () => {
            setSection(group);
            setChangedKeys(new Set());
            router.get(route('central.settings.index'), { group }, { preserveState: true, replace: true });
        };
        if (!dirty) return visit();
        Modal.confirm({
            title: 'Discard unsaved changes?',
            content: 'Changes in the current section have not been saved.',
            okText: 'Discard',
            okButtonProps: { danger: true },
            onOk: visit,
        });
    };

    const reset = () =>
        settings.some((item) => item.requires_confirmation)
            ? setConfirmation({ type: 'reset' })
            : Modal.confirm({
                  title: `Reset ${currentLabel}?`,
                  content: 'Every value in this section will return to its installation default.',
                  okText: 'Reset section',
                  okButtonProps: { danger: true },
                  onOk: () =>
                      router.post(route('central.settings.reset', section), {}, { onSuccess: () => setDirty(false) }),
              });

    const confirmSensitive = () =>
        confirmation?.type === 'reset'
            ? router.post(
                  route('central.settings.reset', section),
                  { confirmation_password: confirmationPassword },
                  {
                      preserveScroll: true,
                      onStart: () => setProcessing(true),
                      onSuccess: () => {
                          setDirty(false);
                          setChangedKeys(new Set());
                          clearConfirmation();
                          message.success('Settings reset to defaults.');
                      },
                      onError: () => message.error('The password was rejected. The reset was not applied.'),
                      onFinish: () => setProcessing(false),
                  },
              )
            : submit(confirmation.values, confirmationPassword);

    return (
        <CentralLayout title="Platform Settings">
            <PageHeader
                eyebrow="Administration"
                title="Platform Settings"
                actions={
                    <Space wrap>
                        {['email', 'storage', 'notifications', 'ai'].includes(section) && (
                            <Button onClick={() => router.post(route('central.settings.test', section))}>
                                Test configuration
                            </Button>
                        )}
                        <Button icon={<ReloadOutlined />} onClick={reset}>
                            Reset to defaults
                        </Button>
                    </Space>
                }
            />

            <div className="platform-settings-shell">
                <div className="platform-settings-mobile">
                    <Input prefix={<SearchOutlined />} placeholder="Search settings" value={search} onChange={(event) => setSearch(event.target.value)} />
                    <Select value={section} onChange={changeSection} options={visibleSections.map((entry) => ({ value: entry.key, label: entry.label }))} style={{ width: '100%' }} aria-label="Settings section" />
                </div>
                <aside className="platform-settings-nav">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search settings"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="platform-settings-nav__list">
                        {Object.entries(categoryLabels).map(([category, label]) => {
                            const entries = visibleSections.filter((entry) => entry.category === category);
                            if (!entries.length) return null;
                            return <div key={category} className="platform-settings-nav__category">
                                <Text type="secondary">{label}</Text>
                                {entries.map((entry) => <button
                                    key={entry.key}
                                    type="button"
                                    className={section === entry.key ? 'is-active' : ''}
                                    aria-current={section === entry.key ? 'page' : undefined}
                                    onClick={() => changeSection(entry.key)}
                                ><span>{sectionIcon(entry.key)} {entry.label}</span>{section === entry.key && <span>{dirty && <Tag color="warning">Dirty</Tag>}{errorCount > 0 && <Tag color="error">{errorCount}</Tag>}{settings.some((item) => item.requires_restart) && <Tag>Restart</Tag>}</span>}</button>)}
                            </div>;
                        })}
                        {search && <Text type="secondary">{visibleSections.length} sections match</Text>}
                    </div>
                </aside>

                <main className="platform-settings-main">
                    <SectionCard
                        title={currentLabel}
                        description={
                            currentSection?.description || sectionDescriptions[section] ||
                            `Manage ${currentLabel.toLowerCase()} preferences for your organization.`
                        }
                    >
                        <Form form={form} layout="vertical" onValuesChange={(changed) => { setDirty(true); setChangedKeys((current) => new Set([...current, ...Object.keys(changed)])); }}>
                            {section === 'provisioning' && (
                                <Alert
                                    type={provisioningQueueEnabled ? 'warning' : 'info'}
                                    showIcon
                                    message={provisioningQueueEnabled ? 'Queue worker cron job required' : 'Immediate provisioning is enabled'}
                                    description={provisioningQueueEnabled
                                        ? <><div>Add this cron/worker command before creating tenants:</div><code>php artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300</code></>
                                        : 'Tenants are provisioned during the request. No provisioning queue worker is required.'}
                                    style={{ marginBottom: 18 }}
                                />
                            )}
                            {section === 'queue_scheduler' && (
                                <Alert
                                    type={queueEnabled && schedulerEnabled ? 'success' : 'warning'}
                                    showIcon
                                    message={`Queue processing is ${queueEnabled ? 'on' : 'off'} · Cron jobs are ${schedulerEnabled ? 'on' : 'off'}`}
                                    description={<Space direction="vertical" size={4}>
                                        <span>Saving these switches takes effect immediately. Queue off makes supported mail and customer setup run during the request. Cron off pauses automatic subscription checks, timed resumes, invoice generation, usage collection, publishing, and cleanup.</span>
                                        <Button size="small" onClick={() => router.visit(route('central.settings.operations-guide'))}>Read setup commands and detailed documentation</Button>
                                    </Space>}
                                    style={{ marginBottom: 18 }}
                                />
                            )}
                            {grouped.map((group) => (
                                <section className="platform-settings-panel" key={group.title}>
                                    <div className="platform-settings-panel__header">
                                        <Typography.Title level={5}>{group.title}</Typography.Title>
                                    </div>
                                    <div className="platform-settings-list">
                                        {group.items.map((item) => (
                                            <SettingField key={item.key} item={item} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </Form>
                        {!filtered.length && <Empty description="No settings match your search." />}
                    </SectionCard>

                    {dirty && (
                        <div className="platform-settings-savebar" role="status">
                            <Text>You have unsaved changes.</Text>
                            <Space>
                                <Button onClick={discardChanges}>Discard</Button>
                                <Button type="primary" icon={<CheckOutlined />} onClick={save} loading={processing} disabled={processing || changedKeys.size === 0}>
                                    Save changes
                                </Button>
                            </Space>
                        </div>
                    )}
                </main>
            </div>


            <Modal
                open={Boolean(confirmation)}
                title={confirmation?.type === 'reset' ? `Confirm reset of ${currentLabel}` : 'Confirm sensitive settings change'}
                okText={confirmation?.type === 'reset' ? 'Confirm reset' : 'Confirm and save'}
                onCancel={clearConfirmation}
                onOk={confirmSensitive}
                confirmLoading={processing}
                okButtonProps={{ disabled: !confirmationPassword || processing, danger: confirmation?.type === 'reset' }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="This section contains security-sensitive values. Enter your current administrator password to continue."
                    style={{ marginBottom: 16 }}
                />
                <Input.Password
                    autoComplete="current-password"
                    value={confirmationPassword}
                    onChange={(event) => setConfirmationPassword(event.target.value)}
                    onPressEnter={() => confirmationPassword && confirmSensitive()}
                />
            </Modal>

            <style>{`
                .platform-settings-shell {
                    display: grid;
                    grid-template-columns: 240px minmax(0, 1fr);
                    gap: 24px;
                    align-items: start;
                }
                .platform-settings-nav {
                    position: sticky;
                    top: 88px;
                    display: grid;
                    gap: 10px;
                    padding: 10px;
                    border: 1px solid #e8edf3;
                    border-radius: 12px;
                    background: #fff;
                }
                .platform-settings-nav__list {
                    display: grid;
                    gap: 2px;
                    max-height: calc(100vh - 190px);
                    overflow: auto;
                }
                .platform-settings-mobile { display: none; }
                .platform-settings-nav__category { display: grid; gap: 2px; }
                .platform-settings-nav__category > .ant-typography { padding: 10px 11px 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
                .platform-settings-nav button {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    width: 100%;
                    border: 0;
                    border-radius: 8px;
                    background: transparent;
                    cursor: pointer;
                    padding: 10px 11px;
                    color: #334155;
                    text-align: left;
                    transition: background 120ms ease, color 120ms ease;
                }
                .platform-settings-nav button:hover {
                    background: #f8fafc;
                }
                .platform-settings-nav button.is-active {
                    background: rgba(15, 118, 110, 0.1);
                    color: #0f766e;
                    font-weight: 600;
                }
                .platform-settings-main {
                    min-width: 0;
                    width: 100%;
                    max-width: 1040px;
                }
                .platform-settings-panel {
                    overflow: hidden;
                    margin-top: 22px;
                    border: 1px solid #e8edf3;
                    border-radius: 12px;
                    background: #fff;
                }
                .platform-settings-panel:first-child {
                    margin-top: 0;
                }
                .platform-settings-panel__header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e8edf3;
                    background: #fafbfc;
                }
                .platform-settings-panel__header h5 {
                    margin: 0;
                    font-size: 15px;
                }
                .platform-settings-list {
                    display: grid;
                }
                .platform-setting-field {
                    display: grid;
                    grid-template-columns: minmax(220px, 1fr) minmax(280px, 440px);
                    gap: 24px;
                    align-items: center;
                    min-width: 0;
                    padding: 18px 20px;
                    border-bottom: 1px solid #eef2f6;
                }
                .platform-setting-field:last-child {
                    border-bottom: 0;
                }
                .platform-setting-field:hover {
                    background: #fcfdfe;
                }
                .platform-setting-field.is-wide {
                    grid-template-columns: minmax(0, 1fr);
                    align-items: start;
                }
                .platform-setting-field.is-wide .platform-setting-field__control {
                    grid-column: 1 / -1;
                    grid-row: 2;
                }
                .platform-setting-field__copy {
                    min-width: 0;
                }
                .platform-setting-field__label-text {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 7px;
                    min-width: 0;
                }
                .platform-setting-field__required {
                    color: #dc2626;
                }
                .platform-setting-field__control {
                    min-width: 0;
                }
                .platform-setting-field .ant-form-item {
                    margin-bottom: 0;
                }
                .platform-setting-field .ant-select,
                .platform-setting-field .ant-input-number {
                    width: 100%;
                }
                .platform-setting-image {
                    display: grid;
                    grid-template-columns: minmax(140px, 210px) minmax(0, 1fr);
                    gap: 16px;
                    align-items: center;
                }
                .platform-setting-image__preview {
                    display: grid;
                    place-items: center;
                    min-height: 112px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 10px;
                    background: #f8fafc;
                    overflow: hidden;
                }
                .platform-setting-image__preview img {
                    display: block;
                    max-width: 100%;
                    max-height: 130px;
                    object-fit: contain;
                }
                .platform-setting-color {
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr);
                    gap: 10px;
                    align-items: center;
                }
                .platform-settings-savebar {
                    position: sticky;
                    bottom: 16px;
                    z-index: 20;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 18px auto 0;
                    padding: 12px 14px 12px 18px;
                    border: 1px solid #dbe3ea;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.96);
                    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.14);
                    backdrop-filter: blur(10px);
                }
                @media (max-width: 1100px) {
                    .platform-settings-shell {
                        grid-template-columns: 1fr;
                    }
                .platform-settings-nav {
                        position: static;
                    }
                    .platform-settings-nav__list {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        max-height: none;
                    }
                    .platform-settings-main {
                        max-width: none;
                    }
                }
                @media (max-width: 760px) {
                    .platform-settings-nav { display: none; }
                    .platform-settings-mobile { display: grid; gap: 10px; }
                    .platform-settings-nav__list,
                    .platform-setting-image {
                        grid-template-columns: 1fr;
                    }
                    .platform-setting-field,
                    .platform-setting-field.is-wide {
                        grid-template-columns: minmax(0, 1fr);
                        gap: 14px;
                    }
                    .platform-setting-field__control {
                        grid-column: 1 / -1;
                    }
                    .platform-settings-savebar {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            `}</style>
        </CentralLayout>
    );
}

function SettingField({ item }) {
    const isWide = wideInputs.has(item.input_type);

    return (
        <div className={`platform-setting-field ${isWide ? 'is-wide' : ''}`}>
            <div className="platform-setting-field__copy">
                <div className="platform-setting-field__label-text">
                    <Text strong>
                        {item.label}
                        {item.is_required && <span className="platform-setting-field__required"> *</span>}
                    </Text>
                    {item.requires_restart && <Tag color="gold">Restart required</Tag>}
                    {item.is_readonly && <Tag>Read-only</Tag>}
                </div>
            </div>

            <div className="platform-setting-field__control">
                <Form.Item
                    name={item.key}
                    rules={[
                        ...(item.is_required ? [{ required: true, message: `${item.label} is required.` }] : []),
                        ...(item.input_type === 'key-value editor'
                            ? [
                                  {
                                      validator: (_, value) => {
                                          try {
                                              JSON.parse(value || '{}');
                                              return Promise.resolve();
                                          } catch {
                                              return Promise.reject(new Error('Enter valid JSON.'));
                                          }
                                      },
                                  },
                              ]
                            : []),
                    ]}
                    valuePropName={item.input_type === 'switch' ? 'checked' : 'value'}
                >
                    {control(item)}
                </Form.Item>
            </div>
        </div>
    );
}

function ColorControl({ value, onChange, disabled }) {
    const current = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#0f766e';

    return (
        <div className="platform-setting-color">
            <ColorPicker
                disabled={disabled}
                value={current}
                showText
                onChangeComplete={(color) => onChange?.(color.toHexString())}
            />
            <Input
                disabled={disabled}
                value={value || ''}
                placeholder="#0f766e"
                onChange={(event) => onChange?.(event.target.value)}
            />
        </div>
    );
}

function ImageControl({ value, onChange, item }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const preview = objectUrl || (typeof value === 'string' ? item.preview_url || value : item.preview_url);

    useEffect(() => {
        if (!(value instanceof File)) return undefined;
        const nextUrl = URL.createObjectURL(value);
        setObjectUrl(nextUrl);
        return () => URL.revokeObjectURL(nextUrl);
    }, [value]);

    return (
        <div className="platform-setting-image">
            <div className="platform-setting-image__preview">
                {preview ? <img src={preview} alt={item.label} /> : <Text type="secondary">No image</Text>}
            </div>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Upload
                    accept="image/*,.ico"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(file) => {
                        onChange?.(file);
                        return false;
                    }}
                    disabled={item.is_readonly}
                >
                    <Button icon={<CloudUploadOutlined />} disabled={item.is_readonly}>
                        Choose image
                    </Button>
                </Upload>
                <Input
                    value={value instanceof File ? value.name : value || ''}
                    onChange={(event) => onChange?.(event.target.value)}
                    placeholder="Paste image URL or upload a file"
                    disabled={item.is_readonly}
                />
                {(value || item.preview_url) && (
                    <Button icon={<DeleteOutlined />} onClick={() => onChange?.('')} disabled={item.is_readonly}>
                        Clear image
                    </Button>
                )}
            </Space>
        </div>
    );
}

function control(item) {
    const common = { disabled: item.is_readonly };
    const input = item.input_type;
    if (input === 'switch') return <Switch {...common} />;
    if (input === 'number' || input === 'decimal') {
        return <InputNumber {...common} precision={input === 'decimal' ? 2 : 0} style={{ width: '100%' }} />;
    }
    if (input === 'rich-text editor') return <RichTextEditor autosaveKey={`setting.${item.key}`} />;
    if (['textarea', 'code editor', 'key-value editor'].includes(input)) {
        return (
            <Input.TextArea
                {...common}
                rows={input === 'code editor' || input === 'key-value editor' ? 8 : 4}
                className={input !== 'textarea' ? 'central-code' : undefined}
            />
        );
    }
    if (['select', 'timezone', 'currency', 'country'].includes(input)) {
        return (
            <Select
                {...common}
                showSearch
                allowClear
                options={(selectOptions[item.key.split('.').pop()] || item.options || []).map((value) =>
                    typeof value === 'object' ? value : { value, label: humanize(value) },
                )}
            />
        );
    }
    if (input === 'multiselect') {
        return (
            <Select
                {...common}
                mode="tags"
                tokenSeparators={[',']}
                options={(item.options || []).map((value) => ({ value, label: String(value) }))}
            />
        );
    }
    if (input === 'secret' || input === 'password') {
        return (
            <Input.Password
                {...common}
                autoComplete="new-password"
                placeholder={item.has_secret ? 'Stored securely - enter a replacement' : 'Enter secret'}
            />
        );
    }
    if (input === 'color') return <ColorControl disabled={item.is_readonly} />;
    if (input === 'image') return <ImageControl item={item} />;

    return (
        <Input
            {...common}
            type={input === 'email' ? 'email' : input === 'url' ? 'url' : input === 'date' ? 'date' : input === 'date and time' ? 'datetime-local' : 'text'}
            placeholder={item.has_secret ? 'Stored securely' : ''}
        />
    );
}

function initialValue(item) {
    if (item.input_type === 'key-value editor') {
        return JSON.stringify(item.value || {}, null, 2);
    }

    return item.value;
}

function groupSettings(settings) {
    if (!settings.length) return [];

    const buckets = [
        {
            title: 'Identity',
            test: (item) =>
                matches(item, [
                    'name',
                    'logo',
                    'favicon',
                    'color',
                    'tagline',
                    'description',
                    'company',
                    'address',
                    'phone',
                    'email',
                    'website',
                    'footer',
                    'signatory',
                ]),
            items: [],
        },
        {
            title: 'Access & Defaults',
            test: (item) =>
                matches(item, [
                    'default',
                    'allow',
                    'require',
                    'enabled',
                    'mode',
                    'timezone',
                    'locale',
                    'currency',
                    'country',
                    'format',
                    'cycle',
                    'trial',
                ]),
            items: [],
        },
        {
            title: 'Delivery & Operations',
            test: (item) =>
                matches(item, [
                    'driver',
                    'host',
                    'port',
                    'queue',
                    'schedule',
                    'retry',
                    'timeout',
                    'notification',
                    'webhook',
                    'storage',
                    'provider',
                    'ssl',
                    'domain',
                ]),
            items: [],
        },
        {
            title: 'Rules & Limits',
            test: (item) =>
                matches(item, [
                    'limit',
                    'maximum',
                    'minimum',
                    'retention',
                    'period',
                    'attempts',
                    'threshold',
                    'expiration',
                    'days',
                    'size',
                    'rate',
                    'tax',
                    'grace',
                ]),
            items: [],
        },
        {
            title: 'Content',
            test: (item) => matches(item, ['message', 'notes', 'template', 'schema', 'robots', 'meta', 'title', 'label', 'url', 'text']),
            items: [],
        },
    ];

    const other = { title: 'Other', items: [] };

    settings.forEach((item) => {
        const bucket = buckets.find((candidate) => candidate.test(item));
        (bucket || other).items.push(item);
    });

    return [...buckets, other].filter((bucket) => bucket.items.length);
}

function matches(item, needles) {
    const text = `${item.key} ${item.label}`.toLowerCase();
    return needles.some((needle) => text.includes(needle));
}

function hasUpload(values) {
    return Object.values(values).some((value) => value instanceof File);
}

function sectionIcon(key) {
    if (key === 'branding') return <BgColorsOutlined />;
    if (['tenant_registration', 'subscriptions', 'trials'].includes(key)) return <TeamOutlined />;
    if (['billing', 'invoice_customization'].includes(key)) return <DollarOutlined />;
    if (key === 'email' || key === 'notifications') return <MailOutlined />;
    if (['storage', 'database_pool', 'provisioning'].includes(key)) return <DatabaseOutlined />;
    if (['security', 'privacy'].includes(key)) return <SafetyCertificateOutlined />;
    if (['api', 'analytics', 'seo'].includes(key)) return <ApiOutlined />;
    if (['general', 'company', 'domains'].includes(key)) return <SettingOutlined />;
    return <ToolOutlined />;
}
