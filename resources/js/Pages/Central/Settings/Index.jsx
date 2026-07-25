import PageHeader from '@/Components/Central/PageHeader';
import RichTextEditor from '@/Components/Central/RichTextEditor';
import SectionCard from '@/Components/Central/SectionCard';
import { humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import {
    CheckOutlined,
    CloseOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    HistoryOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { router } from '@inertiajs/react';
import {
    Alert,
    Button,
    ColorPicker,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

const selectOptions = {
    currency_position: ['before', 'after'],
    default_billing_cycle: ['monthly', 'yearly'],
    default_scheme: ['https', 'http'],
    default_priority: ['low', 'normal', 'high', 'urgent'],
    mode: ['sandbox', 'live'],
};

const wideInputs = new Set(['textarea', 'code editor', 'key-value editor', 'rich-text editor', 'image']);

export default function Settings({ groups, activeGroup }) {
    const [section, setSection] = useState(activeGroup);
    const [search, setSearch] = useState('');
    const [dirty, setDirty] = useState(false);
    const [history, setHistory] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);
    const [confirmation, setConfirmation] = useState(null);
    const [confirmationPassword, setConfirmationPassword] = useState('');
    const [form] = Form.useForm();
    const settings = groups[section] || [];

    useEffect(() => {
        form.setFieldsValue(Object.fromEntries(settings.map((item) => [item.key, initialValue(item)])));
        setDirty(false);
    }, [section]);

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
            `${item.label} ${item.description} ${item.help_text} ${item.key}`.toLowerCase().includes(term),
        );
    }, [settings, search]);

    const grouped = useMemo(() => groupSettings(filtered), [filtered]);
    const currentLabel = humanize(section);
    const imageCount = settings.filter((item) => item.input_type === 'image').length;
    const sensitiveCount = settings.filter((item) => item.requires_confirmation).length;

    const clearConfirmation = () => {
        setConfirmation(null);
        setConfirmationPassword('');
    };

    const prepare = (values) => {
        const payload = { ...values };
        settings
            .filter((item) => item.input_type === 'key-value editor')
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
            onSuccess: () => {
                setDirty(false);
                clearConfirmation();
            },
        };

        if (hasUpload(values)) {
            router.post(route('central.settings.update', section), { ...request, _method: 'put' }, options);
            return;
        }

        router.put(route('central.settings.update', section), request, options);
    };

    const save = () =>
        form.validateFields().then((values) => {
            try {
                const payload = prepare(values);
                settings.some((item) => item.requires_confirmation)
                    ? setConfirmation({ type: 'save', values: payload })
                    : submit(payload);
            } catch {
                /* validation is displayed beside the field */
            }
        });

    const changeSection = (group) => {
        const visit = () => {
            setSection(group);
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
                      onSuccess: () => {
                          setDirty(false);
                          clearConfirmation();
                      },
                  },
              )
            : submit(confirmation.values, confirmationPassword);

    const openHistory = async (item) => {
        setHistory(item);
        const { data } = await axios.get(route('central.settings.history', item.id));
        setHistoryRows(data);
    };

    return (
        <CentralLayout title="Platform Settings">
            <PageHeader
                eyebrow="Administration"
                title="Platform Settings"
                actions={
                    <Space wrap>
                        {['email', 'storage', 'notifications'].includes(section) && (
                            <Button onClick={() => router.post(route('central.settings.test', section))}>
                                Test configuration
                            </Button>
                        )}
                        <Button icon={<ReloadOutlined />} onClick={reset}>
                            Reset section
                        </Button>
                        <Button type="primary" icon={<CheckOutlined />} onClick={save} disabled={!dirty}>
                            Save changes
                        </Button>
                    </Space>
                }
            />

            <div className="platform-settings-shell">
                <aside className="platform-settings-nav">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search settings"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="platform-settings-nav__list">
                        {Object.entries(groups).map(([group, rows]) => (
                            <button
                                key={group}
                                type="button"
                                className={section === group ? 'is-active' : ''}
                                onClick={() => changeSection(group)}
                            >
                                <span>{humanize(group)}</span>
                                <Text type="secondary">{rows.length}</Text>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="platform-settings-main">
                    <SectionCard
                        title={currentLabel}
                        description={`${settings.length} settings${imageCount ? ` · ${imageCount} image fields` : ''}${sensitiveCount ? ` · ${sensitiveCount} sensitive` : ''}`}
                    >
                        <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)}>
                            {grouped.map((group) => (
                                <section className="platform-settings-panel" key={group.title}>
                                    <div className="platform-settings-panel__header">
                                        <div>
                                            <Typography.Title level={5}>{group.title}</Typography.Title>
                                            <Text type="secondary">{group.items.length} fields</Text>
                                        </div>
                                    </div>
                                    <div className="platform-settings-grid">
                                        {group.items.map((item) => (
                                            <SettingField key={item.key} item={item} onHistory={openHistory} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </Form>
                        {!filtered.length && <Empty description="No settings match your search." />}
                    </SectionCard>
                </main>
            </div>

            <Drawer
                open={Boolean(history)}
                onClose={() => setHistory(null)}
                title={history ? `${history.label} details` : 'Setting details'}
                width={560}
            >
                {history && (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <SettingMeta item={history} />
                        {history.is_encrypted && (
                            <Alert type="warning" showIcon message="Secret values are never returned to the browser." />
                        )}
                        {historyRows.length ? (
                            historyRows.map((row) => (
                                <div className="central-attention" key={row.id}>
                                    <span className="central-attention__copy">
                                        <Text strong>Administrator #{row.admin_id || 'system'}</Text>
                                        <Text type="secondary">{row.changed_at}</Text>
                                        {!history.is_encrypted && (
                                            <Text code>
                                                {String(row.old_value ?? 'empty')} {'->'} {String(row.new_value ?? 'empty')}
                                            </Text>
                                        )}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <Empty description="No changes recorded yet." />
                        )}
                    </Space>
                )}
            </Drawer>

            <Modal
                open={Boolean(confirmation)}
                title={confirmation?.type === 'reset' ? `Confirm reset of ${currentLabel}` : 'Confirm sensitive settings change'}
                okText={confirmation?.type === 'reset' ? 'Confirm reset' : 'Confirm and save'}
                onCancel={clearConfirmation}
                onOk={confirmSensitive}
                okButtonProps={{ disabled: !confirmationPassword, danger: confirmation?.type === 'reset' }}
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
                    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
                    gap: 18px;
                    align-items: start;
                }
                .platform-settings-nav {
                    position: sticky;
                    top: 90px;
                    display: grid;
                    gap: 12px;
                }
                .platform-settings-nav__list {
                    display: grid;
                    gap: 4px;
                    max-height: calc(100vh - 190px);
                    overflow: auto;
                    padding-right: 2px;
                }
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
                    padding: 9px 10px;
                    color: inherit;
                    text-align: left;
                }
                .platform-settings-nav button:hover,
                .platform-settings-nav button.is-active {
                    background: rgba(15, 118, 110, 0.09);
                    color: #0f766e;
                }
                .platform-settings-main {
                    min-width: 0;
                }
                .platform-settings-panel {
                    border-top: 1px solid #eef2f7;
                    padding-top: 20px;
                    margin-top: 20px;
                }
                .platform-settings-panel:first-child {
                    border-top: 0;
                    margin-top: 0;
                    padding-top: 0;
                }
                .platform-settings-panel__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 14px;
                }
                .platform-settings-panel__header h5 {
                    margin: 0;
                }
                .platform-settings-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 16px 18px;
                }
                .platform-setting-field {
                    min-width: 0;
                    border: 1px solid #eef2f7;
                    border-radius: 8px;
                    padding: 14px;
                    background: #fff;
                }
                .platform-setting-field.is-wide {
                    grid-column: 1 / -1;
                }
                .platform-setting-field__label {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                .platform-setting-field__label-text {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    min-width: 0;
                }
                .platform-setting-field .ant-form-item {
                    margin-bottom: 0;
                }
                .platform-setting-image {
                    display: grid;
                    grid-template-columns: minmax(140px, 220px) 1fr;
                    gap: 14px;
                    align-items: center;
                }
                .platform-setting-image__preview {
                    display: grid;
                    place-items: center;
                    min-height: 112px;
                    border: 1px dashed #d9e2ec;
                    border-radius: 8px;
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
                .platform-setting-meta {
                    display: grid;
                    gap: 10px;
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
                }
                @media (max-width: 760px) {
                    .platform-settings-grid,
                    .platform-settings-nav__list,
                    .platform-setting-image {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </CentralLayout>
    );
}

function SettingField({ item, onHistory }) {
    const isWide = wideInputs.has(item.input_type);

    return (
        <div className={`platform-setting-field ${isWide ? 'is-wide' : ''}`}>
            <div className="platform-setting-field__label">
                <div className="platform-setting-field__label-text">
                    <Text strong>{item.label}</Text>
                    {item.is_required && <Tag color="red">Required</Tag>}
                    {item.requires_restart && <Tag color="gold">Restart</Tag>}
                    {item.is_readonly && <Tag>Read-only</Tag>}
                </div>
                <Space size={4}>
                    <Tooltip title="Details and history">
                        <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => onHistory(item)} />
                    </Tooltip>
                </Space>
            </div>

            <Form.Item
                name={item.key}
                rules={[
                    ...(item.is_required ? [{ required: true }] : []),
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
    );
}

function SettingMeta({ item }) {
    const rows = [
        ['Key', item.key],
        ['Environment', item.environment ? humanize(item.environment) : 'All'],
        ['Default', item.default_value ?? 'Empty'],
    ];

    return (
        <div className="platform-setting-meta">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <Text type="secondary">{label}</Text>
                    <br />
                    <Text>{String(value)}</Text>
                </div>
            ))}
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
    if (input === 'switch') return <Switch {...common} checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />;
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
                    'backup',
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
