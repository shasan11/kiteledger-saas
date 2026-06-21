import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const nullIfEmpty = (v) => (v === '' || v == null ? null : v);

const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const d = dayjs(v, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (d.isValid()) return d.format('YYYY-MM-DD');
    const d2 = dayjs(v);
    return d2.isValid() ? d2.format('YYYY-MM-DD') : null;
};

const REGISTRATION_TYPE_OPTIONS = [
    { value: 'vat',              label: 'VAT Number' },
    { value: 'pan',              label: 'PAN Number' },
    { value: 'gstin',            label: 'GSTIN (India)' },
    { value: 'tan',              label: 'TAN' },
    { value: 'ein',              label: 'EIN (US)' },
    { value: 'sales_tax_permit', label: 'Sales Tax Permit' },
    { value: 'state_tax_id',     label: 'State Tax ID' },
];

export default function TaxRegistrations({ auth }) {
    const columns = useMemo(
        () => [
            {
                title: 'Registration Number',
                dataIndex: 'registration_no',
                key: 'registration_no',
                sorter: true,
                render: (v, r) => (
                    <div>
                        <Text strong>{v}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.legal_name || ''}</Text>
                    </div>
                ),
            },
            {
                title: 'Type',
                dataIndex: 'registration_type',
                key: 'registration_type',
                width: 150,
                render: (v) => <Tag>{REGISTRATION_TYPE_OPTIONS.find((o) => o.value === v)?.label || v || '—'}</Tag>,
            },
            {
                title: 'Effective From',
                dataIndex: 'effective_from',
                key: 'effective_from',
                width: 140,
                render: (v) => v ? dayjs(v).format('DD MMM YYYY') : '—',
            },
            {
                title: 'Active',
                dataIndex: 'active',
                key: 'active',
                width: 90,
                render: (v) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Active' : 'Inactive'}</Tag>,
            },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'registration_type',
                label: 'Registration Type',
                type: 'select',
                col: 12,
                required: true,
                options: REGISTRATION_TYPE_OPTIONS,
            },
            {
                name: 'registration_no',
                label: 'Registration Number',
                type: 'text',
                col: 12,
                required: true,
                placeholder: 'e.g. 123456789',
            },
            {
                name: 'legal_name',
                label: 'Registered Business Name',
                type: 'text',
                col: 24,
                placeholder: 'Legal name on certificate',
            },
            {
                name: 'tax_jurisdiction_id',
                label: 'Where Tax Applies (Jurisdiction)',
                type: 'fkSelect',
                col: 12,
                fkUrl: api('/api/tax-jurisdictions/'),
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                allowClear: true,
            },
            {
                name: 'effective_from',
                label: 'Effective From',
                type: 'datePicker',
                col: 8,
                format: 'DD-MM-YYYY',
            },
            {
                name: 'effective_to',
                label: 'Effective To',
                type: 'datePicker',
                col: 8,
                format: 'DD-MM-YYYY',
            },
            { name: 'active', label: 'Active', type: 'switch', col: 8 },
        ],
        []
    );

    const validationSchema = useMemo(
        () =>
            Yup.object({
                registration_type: Yup.string().required('Registration type is required'),
                registration_no:   Yup.string().required('Registration number is required'),
            }),
        []
    );

    const crudInitialValues = {
        registration_type:    'vat',
        registration_no:      '',
        legal_name:           '',
        tax_jurisdiction_id:  null,
        effective_from:       null,
        effective_to:         null,
        active:               true,
    };

    const transformPayload = (values) => ({
        registration_type:   values.registration_type || 'vat',
        registration_no:     nullIfEmpty(values.registration_no),
        legal_name:          nullIfEmpty(values.legal_name),
        tax_jurisdiction_id: typeof values.tax_jurisdiction_id === 'object'
            ? (values.tax_jurisdiction_id?.id ?? null)
            : values.tax_jurisdiction_id || null,
        effective_from:      formatDate(values.effective_from),
        effective_to:        formatDate(values.effective_to),
        active:              values.active !== false,
    });

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Tax Registrations" />
            <ReusableCrud
                title="Tax Registrations"
                addTitle="New Registration"
                editTitle="Edit Registration"
                icon={<SafetyCertificateOutlined />}
                apiUrl={api('/api/tax-registrations/')}
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
