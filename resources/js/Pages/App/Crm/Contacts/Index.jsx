import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Space, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const avatarColors = [
    '#1677ff',
    '#52c41a',
    '#fa8c16',
    '#722ed1',
    '#eb2f96',
    '#13c2c2',
    '#fa541c',
    '#2f54eb',
];

const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return '?';

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getAvatarColor = (id = '') => {
    const text = String(id || '');
    let hash = 0;

    for (let i = 0; i < text.length; i += 1) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    return avatarColors[Math.abs(hash) % avatarColors.length];
};

const capitalizeFirst = (value) => {
    if (!value) return '-';

    const text = String(value).trim();

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export default function Contacts(props) {
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (val, record) => (
                <Space size={10}>
                    <Avatar
                        size={34}
                        style={{
                            backgroundColor: getAvatarColor(record?.id),
                            fontWeight: 700,
                            fontSize: 13,
                        }}
                    >
                        {getInitials(val)}
                    </Avatar>

                    <Text strong>{val || '-'}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'contact_type',
            key: 'contact_type',
            render: (val) => {
                const colors = {
                    customer: 'green',
                    supplier: 'orange',
                    lead: 'blue',
                };

                return val ? (
                    <Tag color={colors[val] || 'default'}>
                        {capitalizeFirst(val)}
                    </Tag>
                ) : (
                    '-'
                );
            },
        },
        {
            title: 'Group',
            dataIndex: 'contactGroup',
            key: 'contactGroup',
            render: (_, record) =>
                record?.contactGroup?.name || record?.contact_group?.name || '-',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (val) => val || '-',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (val) => val || '-',
        },
    ];

    const fields = [
        {
            name: 'contact_type',
            label: 'Contact Type',
            type: 'radio',
            required: true,
            col: 24,
            options: [
                { value: 'customer', label: 'Customer' },
                { value: 'supplier', label: 'Supplier' },
                { value: 'lead', label: 'Lead' },
            ],
        },
        {
            name: 'name',
            label: 'Contact Name',
            type: 'text',
            required: true,
            col: 16,
            placeholder: 'e.g. John Doe',
        },
        {
            name: 'contact_group_id',
            label: 'Contact Group',
            type: 'fkSelect',
            col: 8,
            placeholder: 'Select group',
            fkUrl: api('/api/contact-groups'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            fkLabel: (row) => row?.name || '',
            fkExtraParams: { active: true },
        },
        {
            name: 'address',
            label: 'Address',
            type: 'textarea',
            col: 24,
            rows: 2,
            placeholder: 'Full address',
        },
       
         
        {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            col: 8,
            placeholder: '+977 9800000000',
        },
        {
            name: 'email',
            label: 'Email',
            type: 'text',
            col: 8,
            placeholder: 'contact@example.com',
        },
        {
            name: 'pan',
            label: 'PAN / Tax No',
            type: 'text',
            col: 8,
            placeholder: 'PAN number',
        },
        {
            name: 'credit_limit',
            label: 'Credit Limit',
            type: 'number',
            col: 12,
            min: 0,
            placeholder: '0.00',
        },
        {
            name: 'accept_purchase',
            label: 'Accept Purchase',
            type: 'switch',
            col: 8,
        },
    ];

    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required').max(180),
        code: Yup.string().nullable().max(50),
        contact_type: Yup.string()
            .required('Contact type is required')
            .oneOf(['customer', 'supplier', 'lead']),
        contact_group_id: Yup.string().nullable(),
        phone: Yup.string().nullable().max(40),
        email: Yup.string().nullable().email('Invalid email').max(120),
        pan: Yup.string().nullable().max(80),
        credit_limit: Yup.number().nullable().min(0),
        address: Yup.string().nullable(),
        accept_purchase: Yup.boolean().nullable(),
        active: Yup.boolean().nullable(),
    });

    const crudInitialValues = {
        name: '',
        code: '',
        contact_type: 'customer',
        contact_group_id: null,
        phone: '',
        email: '',
        pan: '',
        credit_limit: null,
        address: '',
        accept_purchase: false,
        active: true,
    };

    const transformPayload = (values) => {
        const p = { ...values };

        p.name = p.name?.trim() || null;
        p.code = p.code?.trim() || null;
        p.phone = p.phone?.trim() || null;
        p.email = p.email?.trim() || null;
        p.pan = p.pan?.trim() || null;
        p.address = p.address?.trim() || null;
        p.contact_group_id = p.contact_group_id || null;
        p.credit_limit = p.credit_limit != null ? Number(p.credit_limit) : null;
        p.accept_purchase = Boolean(p.accept_purchase);
        p.active = Boolean(p.active);

        Object.keys(p).forEach((k) => {
            if (p[k] === '') {
                p[k] = null;
            }
        });

        return p;
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Contacts" />

            <ReusableCrud
                icon={<UserOutlined />}
                title="Contacts"
                apiUrl={api('/api/contacts/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                form_ui="modal"
                modalWidth={900}
                searchParam="search"
                pageParam="page"
                pageSizeParam="page_size"
                sortMode="ordering"
                orderingParam="ordering"
                activeParam="active"
                enableServerPagination={true}
                enableInactiveDrawer={true}
                showSearch={true}
                canAdd={true}
                canEdit={true}
                canDelete={true}
                hasActions={true}
                hasActionColumns={true}
                anchorFilters={[
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Contacts',
                        params: {},
                    },
                    {
                        key: 'customer',
                        label: 'Customers',
                        title: 'Contacts',
                        params: { contact_type: 'customer' },
                    },
                    {
                        key: 'supplier',
                        label: 'Suppliers',
                        title: 'Contacts',
                        params: { contact_type: 'supplier' },
                    },
                    {
                        key: 'lead',
                        label: 'Leads',
                        title: 'Contacts',
                        params: { contact_type: 'lead' },
                    },
                ]}
                defaultAnchorKey="all"
                anchorSyncWithHash
            />
        </AuthenticatedLayout>
    );
}