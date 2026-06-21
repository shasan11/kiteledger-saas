import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const nullIfEmpty = (v) => (v === '' || v == null ? null : v);

const COUNTRY_OPTIONS = [
    { value: 'NP', label: 'NP — Nepal' },
    { value: 'IN', label: 'IN — India' },
    { value: 'US', label: 'US — United States' },
];

const TAX_SYSTEM_OPTIONS = [
    { value: 'nepal_vat',     label: 'Nepal VAT' },
    { value: 'india_gst',     label: 'India GST' },
    { value: 'usa_sales_tax', label: 'USA Sales Tax' },
    { value: 'withholding',   label: 'Withholding' },
    { value: 'custom',        label: 'Custom' },
];

export default function TaxJurisdictions({ auth }) {
    const columns = useMemo(
        () => [
            { title: 'Name',        dataIndex: 'name',         key: 'name',         sorter: true },
            { title: 'Code',        dataIndex: 'code',         key: 'code',         width: 120 },
            { title: 'Country',     dataIndex: 'country_code', key: 'country_code', width: 110,
                render: (v) => <Tag>{v || '—'}</Tag> },
            { title: 'Tax System',  dataIndex: 'tax_system',   key: 'tax_system',
                render: (v) => TAX_SYSTEM_OPTIONS.find((o) => o.value === v)?.label || v || '—' },
            { title: 'Active',      dataIndex: 'active',       key: 'active',       width: 90,
                render: (v) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Active' : 'Inactive'}</Tag> },
        ],
        []
    );

    const fields = useMemo(
        () => [
            { name: 'name',         label: 'Name',       type: 'text',   col: 12, required: true, placeholder: 'Nepal VAT' },
            { name: 'code',         label: 'Code',       type: 'text',   col: 12, required: true, placeholder: 'NP-VAT' },
            { name: 'country_code', label: 'Country',    type: 'select', col: 8,  required: true, options: COUNTRY_OPTIONS },
            { name: 'tax_system',   label: 'Tax System', type: 'select', col: 12, options: TAX_SYSTEM_OPTIONS },
            { name: 'description',  label: 'Description', type: 'textarea', col: 24, rows: 2 },
            { name: 'active',       label: 'Active',     type: 'switch', col: 6 },
        ],
        []
    );

    const validationSchema = useMemo(
        () =>
            Yup.object({
                name:         Yup.string().required('Name is required'),
                code:         Yup.string().required('Code is required'),
                country_code: Yup.string().required('Country is required'),
            }),
        []
    );

    const crudInitialValues = {
        name: '', code: '', country_code: 'NP', tax_system: 'nepal_vat',
        description: '', active: true,
    };

    const transformPayload = (values) => ({
        name:         nullIfEmpty(values.name),
        code:         nullIfEmpty(values.code),
        country_code: values.country_code || 'NP',
        tax_system:   values.tax_system || 'nepal_vat',
        description:  nullIfEmpty(values.description),
        active:       values.active !== false,
    });

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Where Tax Applies" />
            <ReusableCrud
                title="Where Tax Applies"
                addTitle="New Jurisdiction"
                editTitle="Edit Jurisdiction"
                icon={<GlobalOutlined />}
                apiUrl={api('/api/tax-jurisdictions/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                form_ui="drawer"
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
                sortMode="ordering"
                orderingParam="ordering"
                enableServerPagination
                showSearch
                canAdd canEdit canDelete hasActions hasActionColumns
            />
        </AuthenticatedLayout>
    );
}
