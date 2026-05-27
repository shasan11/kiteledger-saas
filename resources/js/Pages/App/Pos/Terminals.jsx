import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Badge, Card, Col, Row, Space, Tag, theme, Typography } from 'antd';
import * as Yup from 'yup';
import PosLayout from '@/Layouts/PosLayout.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { api, fetchList } from './Shared/posHelpers';

const { Text, Title } = Typography;

export default function PosTerminalsPage() {
    const { props } = usePage();
    const { token } = theme.useToken();
    const branchContext = props.branchContext || {};
    const canViewAllBranches = !!branchContext.canViewAllBranches;
    const selectedBranchId = branchContext.selectedBranchId || props.auth?.currentBranchId || null;
    const [stats, setStats] = useState({ total: 0, active: 0, defaultCount: 0 });

    useEffect(() => {
        fetchList('/api/pos-terminals', { page_size: 200 })
            .then((payload) => {
                const rows = payload.results || [];
                setStats({
                    total: rows.length,
                    active: rows.filter((row) => row.active).length,
                    defaultCount: rows.filter((row) => row.is_default).length,
                });
            })
            .catch(() => {});
    }, []);

    const accountQuickAdd = useMemo(() => ({
        title: 'Account',
        apiUrl: api('/api/accounts/'),
        allowEdit: false,
        initialValues: {
            name: '',
            code: '',
            nature: 'cash',
            active: true,
        },
        validationSchema: Yup.object().shape({
            name: Yup.string().trim().required('Name is required'),
            code: Yup.string().nullable(),
            nature: Yup.string().oneOf(['cash', 'bank']).required('Nature is required'),
        }),
        fields: [
            { name: 'name', label: 'Name', type: 'text', required: true, col: 24, placeholder: 'Account name' },
            { name: 'code', label: 'Code', type: 'text', col: 12, placeholder: 'Optional code' },
            {
                name: 'nature',
                label: 'Nature',
                type: 'select',
                required: true,
                col: 12,
                options: [
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank', label: 'Bank / Card' },
                ],
            },
        ],
    }), []);

    const columns = useMemo(() => [
        { title: 'Terminal', key: 'terminal', render: (_, record) => (
            <Space direction="vertical" size={0}>
                <Space>
                    <Text strong>{record.name}</Text>
                    {record.is_default ? <Tag color="blue">Default</Tag> : null}
                </Space>
                <Text type="secondary">{record.code || '-'}</Text>
            </Space>
        ) },
        { title: 'Branch', key: 'branch', render: (_, record) => record.branch?.name || '-' },
        { title: 'Warehouse', key: 'warehouse', render: (_, record) => record.warehouse?.name || '-' },
        { title: 'Cash Account', key: 'cash_account', render: (_, record) => record.cash_account?.name || record.cashAccount?.name || '-' },
        { title: 'Card Account', key: 'card_account', render: (_, record) => record.card_account?.name || record.cardAccount?.name || '-' },
        { title: 'Online Account', key: 'online_account', render: (_, record) => record.online_account?.name || record.onlineAccount?.name || '-' },
        { title: 'Default Customer', key: 'customer', render: (_, record) => record.default_customer?.name || record.defaultCustomer?.name || '-' },
        { title: 'Status', dataIndex: 'active', key: 'active', render: (value) => <Badge status={value ? 'success' : 'default'} text={value ? 'Active' : 'Inactive'} /> },
    ], []);

    const fields = useMemo(() => [
        {
            name: 'branch_id',
            label: 'Branch',
            type: 'fkSelect',
            col: 8,
            condition: () => canViewAllBranches,
            fkUrl: api('/api/branches/'),
            fkSearchParam: 'search',
            fkPageSize: 50,
            fkValueKey: 'id',
            fkLabelKey: 'name',
        },
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'name', label: 'Name', type: 'text', required: true, col: 8 },
        { name: 'code', label: 'Code', type: 'text', col: 8, readOnly: true, placeholder: 'Auto generated' },
        { name: 'location', label: 'Location', type: 'text', col: 8 },
        { name: 'receipt_printer_name', label: 'Receipt Printer Name', type: 'text', col: 8 },
        { name: 'cash_account_id', label: 'Cash Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name', quickAdd: { ...accountQuickAdd, initialValues: { ...accountQuickAdd.initialValues, nature: 'cash' } } },
        { name: 'card_account_id', label: 'Card Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name', quickAdd: { ...accountQuickAdd, initialValues: { ...accountQuickAdd.initialValues, nature: 'bank' } } },
        { name: 'online_account_id', label: 'Online Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'is_default', label: 'Is Default', type: 'switch', col: 6 },
        { name: 'active', label: 'Active', type: 'switch', col: 6 },
    ], [accountQuickAdd, canViewAllBranches]);

    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required'),
        code: Yup.string().nullable(),
    });

    return (
        <PosLayout>
            <Head title="POS Terminals" />
            <div style={{ padding: '18px 24px' }}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Row gutter={[12, 12]}>
                        {[
                            ['Total Terminals', stats.total],
                            ['Active Terminals', stats.active],
                            ['Default Terminals', stats.defaultCount],
                        ].map(([label, value]) => (
                            <Col xs={24} md={8} key={label}>
                                <Card bordered={false}>
                                    <Text type="secondary">{label}</Text>
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

            <ReusableCrud
                title="POS Terminals"
                apiUrl={api('/api/pos-terminals/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={{
                    branch_id: selectedBranchId,
                    warehouse_id: null,
                    name: '',
                    code: '',
                    location: '',
                    receipt_printer_name: '',
                    cash_account_id: null,
                    card_account_id: null,
                    online_account_id: null,
                    is_default: false,
                    active: true,
                }}
                form_ui="drawer"
                drawerWidth="min(640px, 100vw)"
                enableServerPagination
                showSearch
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
            />
                </Space>
            </div>
        </PosLayout>
    );
}
