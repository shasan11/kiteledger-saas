import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import { Col, Row, Tabs, Tag, Typography, theme } from 'antd';
import { ApartmentOutlined, ContactsOutlined, FunnelPlotOutlined, SettingOutlined, MessageOutlined } from '@ant-design/icons';
import { api } from '../Shared/crmApi';
import { buildContactGroupCrud, buildPipelineCrud, buildStageCrud, buildSmsConfigCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';
import * as Yup from 'yup';

const { Text } = Typography;

const pipelineColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
        title: 'Default',
        dataIndex: 'is_default',
        key: 'is_default',
        render: (v) => v ? <Tag color="blue">Default</Tag> : null,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
        title: 'Active',
        dataIndex: 'active',
        key: 'active',
        render: (v) => <Tag color={v === false ? 'red' : 'green'}>{v === false ? 'Inactive' : 'Active'}</Tag>,
    },
];

const stageColumns = [
    {
        title: 'Pipeline',
        key: 'pipeline',
        render: (_, r) => r.deal_pipeline?.name || '-',
    },
    { title: 'Stage Name', dataIndex: 'name', key: 'name' },
    {
        title: 'Color',
        dataIndex: 'color',
        key: 'color',
        render: (v) => v ? <Tag color={v}>{v}</Tag> : '-',
    },
    {
        title: 'Probability',
        dataIndex: 'probability',
        key: 'probability',
        render: (v) => v != null ? `${v}%` : '-',
    },
    { title: 'Order', dataIndex: 'sort_order', key: 'sort_order' },
    {
        title: 'Type',
        key: 'type',
        render: (_, r) => {
            if (r.is_won_stage) return <Tag color="green">Won</Tag>;
            if (r.is_lost_stage) return <Tag color="red">Lost</Tag>;
            return <Tag>Regular</Tag>;
        },
    },
];

const contactGroupColumns = [
    { title: 'Group', dataIndex: 'name', key: 'name', sorter: true },
    {
        title: 'Parent',
        key: 'parent',
        render: (_, r) => r.parent?.name || '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
        title: 'Status',
        dataIndex: 'active',
        key: 'active',
        render: (v) => <Tag color={v === false ? 'red' : 'green'}>{v === false ? 'Inactive' : 'Active'}</Tag>,
    },
];

export default function Configuration({ auth, embedded = false }) {
    const { token } = theme.useToken();

    const pipelineCfg = buildPipelineCrud();
    const stageCfg = buildStageCrud();
    const contactGroupCfg = buildContactGroupCrud();
    const smsCfg = buildSmsConfigCrud();

    const smsConfigColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Provider', dataIndex: 'provider', key: 'provider', width: 110,
            render: (v) => <Tag color={v === 'twilio' ? 'red' : 'blue'}>{(v || '').toUpperCase()}</Tag>,
        },
        {
            title: 'From / Sender', key: 'from', width: 180,
            render: (_, r) => r.from_number || r.sender_id || '-',
        },
        {
            title: 'Default', dataIndex: 'is_default', key: 'is_default', width: 90,
            render: (v) => v ? <Tag color="gold">Default</Tag> : null,
        },
        {
            title: 'Active', dataIndex: 'active', key: 'active', width: 90,
            render: (v) => <Tag color={v === false ? 'red' : 'green'}>{v === false ? 'Inactive' : 'Active'}</Tag>,
        },
    ];

    const tabs = [
        {
            key: 'pipelines',
            label: (
                <span>
                    <FunnelPlotOutlined /> Pipelines
                </span>
            ),
            children: (
                <ReusableCrud
                    title="Deal Pipelines"
                    apiUrl={api('/api/deal-pipelines/')}
                    columns={pipelineColumns}
                    fields={pipelineCfg.fields}
                    validationSchema={pipelineCfg.validationSchema}
                    crudInitialValues={pipelineCfg.crudInitialValues}
                    transformPayload={pipelineCfg.transformPayload}
                    form_ui="drawer"
                    drawerWidth={700}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                />
            ),
        },
        {
            key: 'stages',
            label: (
                <span>
                    <ApartmentOutlined /> Stages
                </span>
            ),
            children: (
                <ReusableCrud
                    title="Deal Stages"
                    apiUrl={api('/api/deal-stages/')}
                    columns={stageColumns}
                    fields={stageCfg.fields}
                    validationSchema={stageCfg.validationSchema}
                    crudInitialValues={stageCfg.crudInitialValues}
                    transformPayload={stageCfg.transformPayload}
                    relations={['dealPipeline']}
                    form_ui="drawer"
                    drawerWidth={600}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                />
            ),
        },
        {
            key: 'contact-groups',
            label: (
                <span>
                    <ContactsOutlined /> Contact Groups
                </span>
            ),
            children: (
                <ReusableCrud
                    title="Contact Groups"
                    apiUrl={api('/api/contact-groups/')}
                    columns={contactGroupColumns}
                    fields={contactGroupCfg.fields}
                    validationSchema={contactGroupCfg.validationSchema}
                    crudInitialValues={contactGroupCfg.crudInitialValues}
                    transformPayload={contactGroupCfg.transformPayload}
                    form_ui="drawer"
                    drawerWidth={620}
                    searchParam="search"
                    pageParam="page"
                    pageSizeParam="page_size"
                    sortMode="ordering"
                    orderingParam="ordering"
                    activeParam="active"
                    enableServerPagination
                    enableInactiveDrawer
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    canView
                    hasActions
                    hasActionColumns
                    backendFilter={{ active: 'active', parent: 'parent_id' }}
                    backendSort={{ name: 'name', active: 'active', created_at: 'created_at' }}
                />
            ),
        },
        {
            key: 'sms-configs',
            label: (
                <span>
                    <MessageOutlined /> SMS Configuration
                </span>
            ),
            children: (
                <ReusableCrud
                    title="SMS Providers"
                    apiUrl={api('/api/sms-configs/')}
                    columns={smsConfigColumns}
                    fields={smsCfg.fields}
                    validationSchema={smsCfg.validationSchema}
                    crudInitialValues={smsCfg.crudInitialValues}
                    transformPayload={smsCfg.transformPayload}
                    form_ui="modal"
                    modalWidth={620}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                />
            ),
        },
    ];

    const content = (
        <>
            <Head title="CRM Settings" />
            <div style={{ padding: token.padding }}>
                <Row align="middle" style={{ marginBottom: token.marginMD }}>
                    <Col>
                        <Text strong style={{ fontSize: token.fontSizeLG }}>
                            <SettingOutlined style={{ marginRight: 8 }} />
                            CRM Settings
                        </Text>
                    </Col>
                </Row>
                <div style={{ background: token.colorBgContainer, padding: token.padding, borderRadius: token.borderRadiusLG }}>
                    <Tabs defaultActiveKey="pipelines" items={tabs} size="middle" />
                </div>
            </div>
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <AuthenticatedLayout user={auth?.user}>
            {content}
        </AuthenticatedLayout>
    );
}
