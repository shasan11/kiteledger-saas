import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import { Col, Row, Tabs, Tag, Typography, theme } from 'antd';
import { ApartmentOutlined, FunnelPlotOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../Shared/crmApi';
import { buildPipelineCrud, buildStageCrud } from '@/Pages/App/Crm/Shared/crmCrudConfigs';

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

export default function Configuration({ auth }) {
    const { token } = theme.useToken();

    const pipelineCfg = buildPipelineCrud();
    const stageCfg = buildStageCrud();

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
    ];

    return (
        <AuthenticatedLayout user={auth?.user}>
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
        </AuthenticatedLayout>
    );
}
