import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import ReusableCrud from '@/Components/ResuableCrud';
export default function Index({ accounts = [] }) {
    const columns = useMemo(
        () => [
            {
                title: 'Account Name',
                dataIndex: 'name',
                key: 'name',
            },
            {
                title: 'Under',
                dataIndex: 'parent',
                key: 'parent',
                render: (_, record) => record?.parent?.name || '-',
            },
            {
                title: 'Code',
                dataIndex: 'code',
                key: 'code',
                render: (value) => value || '-',
            },
            {
                title: 'Description',
                dataIndex: 'description',
                key: 'description',
                render: (value) => value || '-',
            },
        ],
        []
    );

    const fields = useMemo(
        () => [
            {
                name: 'name',
                label: 'Account Name',
                type: 'text',
                placeholder: 'Enter account name',
                required: true,
                rules: [
                    {
                        required: true,
                        message: 'Account name is required',
                    },
                ],
            },
            {
                name: 'parent_id',
                label: 'Under',
                type: 'select',
                placeholder: 'Select under account',
                required: true,
                options: accounts.map((account) => ({
                    label: account.name,
                    value: account.id,
                })),
                rules: [
                    {
                        required: true,
                        message: 'Under account is required',
                    },
                ],
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                placeholder: 'Enter account code',
                required: false,
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Enter description',
                required: false,
                rows: 3,
            },
        ],
        [accounts]
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Chart of Accounts
                </h2>
            }
        >
            <Head title="Chart of Accounts" />

            <ReusableCrud
                title="Chart of Accounts"
                data={accounts}
                columns={columns}
                fields={fields}
                createRoute={route('chart-of-accounts.store')}
                updateRoute={(record) =>
                    route('chart-of-accounts.update', record.id)
                }
                deleteRoute={(record) =>
                    route('chart-of-accounts.destroy', record.id)
                }
                initialValues={{
                    name: '',
                    parent_id: null,
                    code: '',
                    description: '',
                }}
                editValues={(record) => ({
                    name: record?.name || '',
                    parent_id: record?.parent_id || record?.parent?.id || null,
                    code: record?.code || '',
                    description: record?.description || '',
                })}
            />
        </AuthenticatedLayout>
    );
}