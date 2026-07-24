import PageHeader from '@/Components/Central/PageHeader';
import RichTextEditor from '@/Components/Central/RichTextEditor';
import SectionCard from '@/Components/Central/SectionCard';
import { humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { HistoryOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Alert, Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select, Switch, Typography } from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const selectOptions = { currency_position: ['before', 'after'], default_billing_cycle: ['monthly', 'yearly'], default_scheme: ['https', 'http'], default_priority: ['low', 'normal', 'high', 'urgent'], mode: ['sandbox', 'live'] };

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
        form.setFieldsValue(Object.fromEntries(settings.map((item) => [item.key, item.input_type === 'key-value editor' ? JSON.stringify(item.value || {}, null, 2) : item.value])));
        setDirty(false);
    }, [section]);
    useEffect(() => {
        const block = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', block);
        return () => window.removeEventListener('beforeunload', block);
    }, [dirty]);

    const filtered = useMemo(() => settings.filter((item) => `${item.label} ${item.description} ${item.key}`.toLowerCase().includes(search.toLowerCase())), [settings, search]);
    const clearConfirmation = () => { setConfirmation(null); setConfirmationPassword(''); };
    const prepare = (values) => {
        const payload = { ...values };
        settings.filter((item) => item.input_type === 'key-value editor').forEach((item) => {
            try { payload[item.key] = JSON.parse(payload[item.key] || '{}'); }
            catch { form.setFields([{ name: item.key, errors: ['Enter valid JSON.'] }]); throw new Error('invalid-json'); }
        });
        return payload;
    };
    const submit = (values, password) => router.put(route('central.settings.update', section), { values, confirmation_password: password || undefined }, { preserveScroll: true, onSuccess: () => { setDirty(false); clearConfirmation(); } });
    const save = () => form.validateFields().then((values) => {
        try {
            const payload = prepare(values);
            settings.some((item) => item.requires_confirmation) ? setConfirmation({ type: 'save', values: payload }) : submit(payload);
        } catch { /* validation is displayed beside the field */ }
    });
    const changeSection = (group) => {
        const visit = () => { setSection(group); router.get(route('central.settings.index'), { group }, { preserveState: true, replace: true }); };
        if (!dirty) return visit();
        Modal.confirm({ title: 'Discard unsaved changes?', content: 'Changes in the current section have not been saved.', okText: 'Discard', okButtonProps: { danger: true }, onOk: visit });
    };
    const reset = () => settings.some((item) => item.requires_confirmation)
        ? setConfirmation({ type: 'reset' })
        : Modal.confirm({ title: `Reset ${humanize(section)}?`, content: 'Every value in this section will return to its installation default.', okText: 'Reset section', okButtonProps: { danger: true }, onOk: () => router.post(route('central.settings.reset', section), {}, { onSuccess: () => setDirty(false) }) });
    const confirmSensitive = () => confirmation?.type === 'reset'
        ? router.post(route('central.settings.reset', section), { confirmation_password: confirmationPassword }, { preserveScroll: true, onSuccess: () => { setDirty(false); clearConfirmation(); } })
        : submit(confirmation.values, confirmationPassword);
    const openHistory = async (item) => { setHistory(item); const { data } = await axios.get(route('central.settings.history', item.id)); setHistoryRows(data); };

    return <CentralLayout title="Platform Settings">
        <PageHeader eyebrow="Administration" title="Platform Settings" description="Structured, validated configuration with encrypted secrets, change history, cache invalidation, and password-confirmed sensitive changes." actions={<><Button icon={<ReloadOutlined/>} onClick={reset}>Reset section</Button><Button type="primary" onClick={save} disabled={!dirty}>Save section</Button></>}/>
        <Row gutter={[18, 18]}>
            <Col xs={24} lg={6}><SectionCard><Input prefix={<SearchOutlined/>} placeholder="Search settings" value={search} onChange={(event) => setSearch(event.target.value)} style={{ marginBottom: 12 }}/><div style={{ display: 'grid', gap: 4 }}>{Object.keys(groups).map((group) => <Button key={group} type={section === group ? 'primary' : 'text'} style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => changeSection(group)}>{humanize(group)}</Button>)}</div></SectionCard></Col>
            <Col xs={24} lg={18}><SectionCard title={humanize(section)} description={`${settings.length} configurable values`} extra={['email', 'storage', 'notifications'].includes(section) && <Button onClick={() => router.post(route('central.settings.test', section))}>Test configuration</Button>}>
                <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)}>{filtered.map((item) => <div key={item.key} style={{ position: 'relative', paddingRight: 42 }}>
                    <Form.Item name={item.key} label={item.label} extra={<span>{item.description}{item.help_text && <> · {item.help_text}</>}{item.requires_restart && <Typography.Text type="warning"> · Requires restart</Typography.Text>}<br/><Typography.Text type="secondary">Last updated {item.updated_at || 'during installation'}{item.updated_by ? ` by ${item.updated_by}` : ''}{item.last_tested_at ? ` · tested ${item.last_tested_at}` : ''}{item.environment ? ` · ${humanize(item.environment)}` : ''}</Typography.Text></span>} rules={[...(item.is_required ? [{ required: true }] : []), ...(item.input_type === 'key-value editor' ? [{ validator: (_, value) => { try { JSON.parse(value || '{}'); return Promise.resolve(); } catch { return Promise.reject(new Error('Enter valid JSON.')); } } }] : [])]} valuePropName={item.input_type === 'switch' ? 'checked' : 'value'}>{control(item)}</Form.Item>
                    <Button type="text" size="small" icon={<HistoryOutlined/>} aria-label={`History for ${item.label}`} onClick={() => openHistory(item)} style={{ position: 'absolute', right: 0, top: 30 }}/>
                </div>)}</Form>
                {!filtered.length && <Alert type="info" showIcon message="No settings match your search."/>}
            </SectionCard></Col>
        </Row>
        <Drawer open={Boolean(history)} onClose={() => setHistory(null)} title={`${history?.label || ''} history`} width={520}>{history?.is_encrypted && <Alert type="warning" showIcon message="Secret values are never returned to the browser." style={{ marginBottom: 16 }}/>} {historyRows.map((row) => <div className="central-attention" key={row.id}><span className="central-attention__copy"><Typography.Text strong>Administrator #{row.admin_id || 'system'}</Typography.Text><Typography.Text type="secondary">{row.changed_at}</Typography.Text>{!history?.is_encrypted && <Typography.Text code>{String(row.old_value ?? 'empty')} → {String(row.new_value ?? 'empty')}</Typography.Text>}</span></div>)}</Drawer>
        <Modal open={Boolean(confirmation)} title={confirmation?.type === 'reset' ? `Confirm reset of ${humanize(section)}` : 'Confirm sensitive settings change'} okText={confirmation?.type === 'reset' ? 'Confirm reset' : 'Confirm and save'} onCancel={clearConfirmation} onOk={confirmSensitive} okButtonProps={{ disabled: !confirmationPassword, danger: confirmation?.type === 'reset' }}><Alert type="warning" showIcon message="This section contains security-sensitive values. Enter your current administrator password to continue." style={{ marginBottom: 16 }}/><Input.Password autoComplete="current-password" value={confirmationPassword} onChange={(event) => setConfirmationPassword(event.target.value)} onPressEnter={() => confirmationPassword && confirmSensitive()}/></Modal>
    </CentralLayout>;
}

function control(item) {
    const common = { disabled: item.is_readonly };
    const input = item.input_type;
    if (input === 'switch') return <Switch {...common}/>;
    if (input === 'number' || input === 'decimal') return <InputNumber {...common} precision={input === 'decimal' ? 2 : 0} style={{ width: '100%' }}/>;
    if (input === 'rich-text editor') return <RichTextEditor autosaveKey={`setting.${item.key}`}/>;
    if (['textarea', 'code editor', 'key-value editor'].includes(input)) return <Input.TextArea {...common} rows={input === 'code editor' || input === 'key-value editor' ? 8 : 4} className={input !== 'textarea' ? 'central-code' : undefined}/>;
    if (['select', 'timezone', 'currency', 'country'].includes(input)) return <Select {...common} showSearch allowClear options={(selectOptions[item.key.split('.').pop()] || item.options || []).map((value) => typeof value === 'object' ? value : { value, label: humanize(value) })}/>;
    if (input === 'multiselect') return <Select {...common} mode="tags" tokenSeparators={[',']} options={(item.options || []).map((value) => ({ value, label: String(value) }))}/>;
    if (input === 'secret' || input === 'password') return <Input.Password {...common} autoComplete="new-password" placeholder={item.has_secret ? 'Stored securely — enter a replacement' : 'Enter secret'}/>;
    if (input === 'color') return <Input {...common} type="color"/>;
    return <Input {...common} type={input === 'email' ? 'email' : input === 'url' ? 'url' : input === 'date' ? 'date' : input === 'date and time' ? 'datetime-local' : 'text'} placeholder={item.has_secret ? 'Stored securely' : ''}/>;
}
