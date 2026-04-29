import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Avatar, Tag } from 'antd';
import {
    UserOutlined,
    ShopOutlined,
    IdcardOutlined,
} from '@ant-design/icons';
import ReusableCrud from '@/Components/ResuableCrud';

const CONTACT_API = '/api/contacts';
const CONTACT_GROUP_API = '/api/contact-groups';
const CREDIT_TERM_API = '/api/credit-terms';

const CONTACT_TYPES = [
    {
        value: 'customer',
        label: 'Customer',
        short: 'C',
        icon: <UserOutlined />,
    },
    {
        value: 'supplier',
        label: 'Supplier',
        short: 'S',
        icon: <ShopOutlined />,
    },
    {
        value: 'lead',
        label: 'Lead',
        short: 'L',
        icon: <IdcardOutlined />,
    },
];

function getInitials(name = '') {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return '-';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getContactTypeLabel(value) {
    return CONTACT_TYPES.find((item) => item.value === value)?.label || value || '-';
}

function normalizeFk(value) {
    if (!value) return null;

    if (typeof value === 'object') {
        return value.id || value.value || null;
    }

    return value;
}

function ContactTypeSelector({ value, onChange, disabled }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
                width: '100%',
            }}
        >
            {CONTACT_TYPES.map((item) => {
                const active = value === item.value;

                return (
                    <button
                        key={item.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(item.value)}
                        style={{
                            height: 68,
                            borderRadius: 4,
                            border: active ? '1px solid #1d4ed8' : '1px solid #d9dee8',
                            background: active ? '#ffffff' : '#eef2f8',
                            color: active ? '#111827' : '#1f2937',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            padding: '0 24px',
                            fontSize: 16,
                            fontWeight: 500,
                            textAlign: 'left',
                        }}
                    >
                        <span
                            style={{
                                width: 22,
                                color: active ? '#6b7280' : '#9ca3af',
                                fontWeight: 700,
                                fontSize: 18,
                            }}
                        >
                            {item.short}
                        </span>

                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function Index() {
    const crudInitialValues = useMemo(
        () => ({
            contact_type: 'customer',
            name: '',
            address: '',
            code: '',
            pan: '',
            phone: '',
            contact_group_id: null,
            contact_group_id_detail: null,
            accept_purchase: false,
            email: '',
            credit_term_id: null,
            credit_term_id_detail: null,
            credit_limit: 0,
            active: true,
        }),
        []
    );

    const validationSchema = Yup.object().shape({
        contact_type: Yup.string()
            .oneOf(['customer', 'supplier', 'lead'])
            .required('Contact type is required'),

        name: Yup.string()
            .trim()
            .required('Name is required')
            .max(180, 'Name cannot be more than 180 characters'),

        address: Yup.string()
            .nullable()
            .max(500, 'Address is too long'),

        code: Yup.string()
            .nullable()
            .max(50, 'Code is too long'),

        pan: Yup.string()
            .nullable()
            .max(80, 'PAN is too long'),

        phone: Yup.string()
            .nullable()
            .max(40, 'Phone number is too long'),

        contact_group_id: Yup.mixed()
            .nullable(),

        accept_purchase: Yup.boolean(),

        email: Yup.string()
            .nullable()
            .email('Enter a valid email address')
            .max(120, 'Email is too long'),

        credit_term_id: Yup.mixed()
            .nullable(),

        credit_limit: Yup.number()
            .nullable()
            .typeError('Credit limit must be a number')
            .min(0, 'Credit limit cannot be negative'),

        active: Yup.boolean(),
    });

    const fields = useMemo(
        () => [
            {
                name: 'contact_type',
                label: 'Type of Contact',
                type: 'custom',
                required: true,
                col: 24,
                render: ({ value, setFieldValue, readOnly }) => (
                    <ContactTypeSelector
                        value={value || 'customer'}
                        disabled={readOnly}
                        onChange={(nextValue) => {
                            setFieldValue('contact_type', nextValue);

                            if (nextValue !== 'supplier') {
                                setFieldValue('accept_purchase', false);
                            }
                        }}
                    />
                ),
            },
            {
                name: 'name',
                label: 'Name',
                type: 'text',
                placeholder: 'Name',
                required: true,
                col: 24,
            },
            {
                name: 'address',
                label: 'Address',
                type: 'textarea',
                placeholder: 'Address',
                rows: 1,
                col: 24,
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                placeholder: 'Code',
                col: 8,
            },
            {
                name: 'pan',
                label: 'PAN',
                type: 'text',
                placeholder: 'PAN',
                col: 8,
            },
            {
                name: 'phone',
                label: 'Phone Number',
                type: 'text',
                placeholder: 'Phone Number',
                col: 8,
            },
            {
                name: 'contact_group_id',
                label: 'Group',
                type: 'fkSelect',
                placeholder: 'Group Name',
                fkUrl: CONTACT_GROUP_API,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                allowClear: true,
                col: 8,
            },
            {
                name: 'accept_purchase',
                label: 'Accept Purchase',
                type: 'switch',
                col: 8,
            },
            {
                type: 'group',
                label: 'Additional Field',
                col: 24,
                children: [
                    {
                        name: 'email',
                        label: 'Email Address',
                        type: 'text',
                        placeholder: 'Email Address',
                        col: 8,
                    },
                    {
                        name: 'credit_term_id',
                        label: 'Credit Term',
                        type: 'fkSelect',
                        placeholder: 'Credit Term',
                        fkUrl: CREDIT_TERM_API,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        allowClear: true,
                        col: 8,
                    },
                    {
                        name: 'credit_limit',
                        label: 'Credit Limit',
                        type: 'number',
                        placeholder: 'Credit Limit',
                        min: 0,
                        col: 8,
                    },
                    {
                        name: 'active',
                        label: 'Active',
                        type: 'switch',
                        col: 8,
                    },
                ],
            },
        ],
        []
    );

    const columns = useMemo(
        () => [
            {
                title: 'FULL NAME',
                dataIndex: 'name',
                key: 'name',
                backendSort: true,
                backendFilter: {
                    type: 'text',
                    param: 'name',
                    placeholder: 'Search name',
                },
                render: (value, record) => {
                    const name = value || record?.full_name || '-';

                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar
                                size={34}
                                style={{
                                    fontWeight: 700,
                                    background: '#7cc7ff',
                                }}
                            >
                                {getInitials(name)}
                            </Avatar>

                            <span style={{ fontWeight: 500, color: '#0f172a' }}>
                                {name}
                            </span>
                        </div>
                    );
                },
            },
            {
                title: 'GROUP',
                dataIndex: 'contact_group_id_detail',
                key: 'contact_group_id',
                backendFilter: {
                    type: 'autocomplete',
                    param: 'contact_group_id',
                    fkUrl: CONTACT_GROUP_API,
                    fkValueKey: 'id',
                    fkLabelKey: 'name',
                    placeholder: 'Filter group',
                },
                render: (_, record) =>
                    record?.contact_group_id_detail?.name ||
                    record?.contact_group?.name ||
                    record?.contactGroup?.name ||
                    record?.group_detail?.name ||
                    record?.group_name ||
                    '-',
            },
            {
                title: 'TYPE',
                dataIndex: 'contact_type',
                key: 'contact_type',
                width: 150,
                backendSort: true,
                backendFilter: {
                    type: 'select',
                    param: 'contact_type',
                    options: CONTACT_TYPES.map((item) => ({
                        value: item.value,
                        label: item.label,
                    })),
                },
                render: (value) => (
                    <Tag
                        style={{
                            border: 'none',
                            borderRadius: 3,
                            padding: '4px 12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: '#f3e8ff',
                            color: '#9333ea',
                        }}
                    >
                        {getContactTypeLabel(value)}
                    </Tag>
                ),
            },
            {
                title: 'PHONE NUMBER',
                dataIndex: 'phone',
                key: 'phone',
                backendFilter: {
                    type: 'text',
                    param: 'phone',
                    placeholder: 'Search phone',
                },
                render: (value) => value || '-',
            },
            {
                title: 'EMAIL',
                dataIndex: 'email',
                key: 'email',
                backendFilter: {
                    type: 'text',
                    param: 'email',
                    placeholder: 'Search email',
                },
                render: (value) => value || '-',
            },
            {
                title: 'CREDIT LIMIT',
                dataIndex: 'credit_limit',
                key: 'credit_limit',
                backendSort: true,
                render: (value) => value ?? '0',
            },
            {
                title: 'ACTIVE',
                dataIndex: 'active',
                key: 'active',
                width: 110,
                backendFilter: {
                    type: 'select',
                    param: 'active',
                    options: [
                        { value: '1', label: 'Active' },
                        { value: '0', label: 'Inactive' },
                    ],
                },
                render: (value) => (
                    <Tag color={value ? 'green' : 'red'}>
                        {value ? 'Active' : 'Inactive'}
                    </Tag>
                ),
            },
        ],
        []
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Contacts
                </h2>
            }
        >
            <Head title="Contacts" />

            <div className="rounded-lg bg-white">
                <ReusableCrud
                    title="Contacts"
                    apiUrl={CONTACT_API}
                    fields={fields}
                    columns={columns}
                    validationSchema={validationSchema}
                    crudInitialValues={crudInitialValues}
                    form_ui="drawer"
                    drawerWidth={980}
                    modalWidth={980}
                    showSearch={true}
                    canAdd={true}
                    canEdit={true}
                    canDelete={true}
                    canView={true}
                    hasActions={true}
                    hasActionColumns={true}
                    showRowActionMenu={true}
                    enableServerPagination={true}
                    enableInactiveDrawer={true}
                    searchParam="search"
                    pageParam="page"
                    pageSizeParam="page_size"
                    activeParam="active"
                    sortMode="ordering"
                    orderingParam="ordering"
                    defaultSortField="name"
                    defaultSortOrder="ascend"
                    transformPayload={(values) => {
                        const contactType = values.contact_type || 'customer';

                        return {
                            contact_type: contactType,
                            name: values.name || '',
                            address: values.address || null,
                            code: values.code || null,
                            pan: values.pan || null,
                            phone: values.phone || null,
                            email: values.email || null,
                            contact_group_id: normalizeFk(values.contact_group_id),
                            credit_term_id: normalizeFk(values.credit_term_id),
                            credit_limit: values.credit_limit ?? 0,
                            accept_purchase:
                                contactType === 'supplier'
                                    ? !!values.accept_purchase
                                    : false,
                            active: values.active ?? true,
                        };
                    }}
                />
            </div>
        </AuthenticatedLayout>
    );
}