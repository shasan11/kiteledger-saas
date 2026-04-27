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

const CREDIT_TERMS = [
    { value: 'cash', label: 'Cash' },
    { value: '7_days', label: '7 Days' },
    { value: '15_days', label: '15 Days' },
    { value: '30_days', label: '30 Days' },
    { value: '45_days', label: '45 Days' },
    { value: '60_days', label: '60 Days' },
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
            type: 'customer',
            name: '',
            address: '',
            code: '',
            pan: '',
            phone_number: '',
            group: null,
            group_detail: null,
            accept_purchase: false,
            email: '',
            credit_terms: null,
            credit_limit: null,
            organisation: '',
            active: true,
        }),
        []
    );

    const validationSchema = Yup.object().shape({
        type: Yup.string()
            .oneOf(['customer', 'supplier', 'lead'])
            .required('Contact type is required'),

        name: Yup.string()
            .trim()
            .required('Name is required')
            .max(255, 'Name cannot be more than 255 characters'),

        address: Yup.string().nullable().max(500, 'Address is too long'),

        code: Yup.string().nullable().max(100, 'Code is too long'),

        pan: Yup.string().nullable().max(100, 'PAN is too long'),

        phone_number: Yup.string().nullable().max(50, 'Phone number is too long'),

        group: Yup.mixed().nullable(),

        accept_purchase: Yup.boolean(),

        email: Yup.string()
            .nullable()
            .email('Enter a valid email address')
            .max(255, 'Email is too long'),

        credit_terms: Yup.string().nullable(),

        credit_limit: Yup.number()
            .nullable()
            .typeError('Credit limit must be a number')
            .min(0, 'Credit limit cannot be negative'),

        organisation: Yup.string().nullable().max(255, 'Organisation is too long'),

        active: Yup.boolean(),
    });

    const fields = useMemo(
        () => [
            {
                name: 'type',
                label: 'Type of Contact',
                type: 'custom',
                required: true,
                col: 24,
                render: ({ value, setFieldValue, readOnly }) => (
                    <ContactTypeSelector
                        value={value}
                        disabled={readOnly}
                        onChange={(nextValue) => {
                            setFieldValue('type', nextValue);

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
                name: 'phone_number',
                label: 'Phone Number',
                type: 'text',
                placeholder: 'Phone Number',
                col: 8,
            },
            {
                name: 'group',
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
                        name: 'credit_terms',
                        label: 'Credit Terms',
                        type: 'select',
                        placeholder: 'Credit Terms',
                        options: CREDIT_TERMS,
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
                        name: 'organisation',
                        label: 'Organisation',
                        type: 'text',
                        placeholder: 'Organisation',
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
                dataIndex: 'group_detail',
                key: 'group',
                backendFilter: {
                    type: 'autocomplete',
                    param: 'group',
                    fkUrl: CONTACT_GROUP_API,
                    fkValueKey: 'id',
                    fkLabelKey: 'name',
                    placeholder: 'Filter group',
                },
                render: (_, record) =>
                    record?.group_detail?.name ||
                    record?.group_name ||
                    record?.group?.name ||
                    '-',
            },
            {
                title: 'TYPE',
                dataIndex: 'type',
                key: 'type',
                width: 150,
                backendSort: true,
                backendFilter: {
                    type: 'select',
                    param: 'type',
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
                dataIndex: 'phone_number',
                key: 'phone_number',
                backendFilter: {
                    type: 'text',
                    param: 'phone_number',
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
                title: 'ORGANISATION',
                dataIndex: 'organisation',
                key: 'organisation',
                backendFilter: {
                    type: 'text',
                    param: 'organisation',
                    placeholder: 'Search organisation',
                },
                render: (value) => value || '-',
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
                    transformPayload={(values) => ({
                        ...values,
                        accept_purchase:
                            values.type === 'supplier' ? !!values.accept_purchase : false,
                    })}
                />
            </div>
        </AuthenticatedLayout>
    );
}