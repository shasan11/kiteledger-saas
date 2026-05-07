import { useMemo } from 'react';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { DesktopOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { api } from './Shared/posHelpers';

export default function PosTerminalsPage() {
    const columns = useMemo(() => [
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Branch', key: 'branch', render: (_, record) => record.branch?.name || '-' },
        { title: 'Warehouse', key: 'warehouse', render: (_, record) => record.warehouse?.name || '-' },
        { title: 'Default', dataIndex: 'is_default', key: 'is_default', render: (value) => value ? 'Yes' : 'No' },
        { title: 'Active', dataIndex: 'active', key: 'active', render: (value) => value ? 'Yes' : 'No' },
    ], []);

    const fields = useMemo(() => [
        { name: 'branch_id', label: 'Branch', type: 'fkSelect', col: 8, fkUrl: api('/api/branches/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'warehouse_id', label: 'Warehouse', type: 'fkSelect', col: 8, fkUrl: api('/api/warehouses/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'default_customer_id', label: 'Default Customer', type: 'fkSelect', col: 8, fkUrl: api('/api/contacts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'name', label: 'Name', type: 'text', required: true, col: 8 },
        { name: 'code', label: 'Code', type: 'text', required: true, col: 8 },
        { name: 'location', label: 'Location', type: 'text', col: 8 },
        { name: 'receipt_printer_name', label: 'Receipt Printer Name', type: 'text', col: 8 },
        { name: 'cash_account_id', label: 'Cash Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'card_account_id', label: 'Card Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'online_account_id', label: 'Online Account', type: 'fkSelect', col: 8, fkUrl: api('/api/accounts/'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name' },
        { name: 'is_default', label: 'Is Default', type: 'switch', col: 6 },
        { name: 'active', label: 'Active', type: 'switch', col: 6 },
    ], []);

    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required'),
        code: Yup.string().required('Code is required'),
    });

    return (
        <AuthenticatedLayout header={<h2 style={{ margin: 0 }}>POS Terminals</h2>}>
            <Head title="POS Terminals" />
            <ReusableCrud
                icon={<DesktopOutlined />}
                title="POS Terminals"
                apiUrl={api('/api/pos-terminals/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={{
                    branch_id: null,
                    warehouse_id: null,
                    name: '',
                    code: '',
                    location: '',
                    receipt_printer_name: '',
                    cash_account_id: null,
                    card_account_id: null,
                    online_account_id: null,
                    default_customer_id: null,
                    is_default: false,
                    active: true,
                }}
                form_ui="drawer"
                drawerWidth={720}
                enableServerPagination
                showSearch
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
            />
        </AuthenticatedLayout>
    );
}
